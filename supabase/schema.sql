-- Hackathon attendance system schema.
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('super_admin', 'volunteer');
exception when duplicate_object then null;
end $$;

-- Staff accounts (super admins + volunteers). One row per auth user.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'volunteer',
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  college text,
  team_id uuid references public.teams (id) on delete set null,
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists participants_team_id_idx on public.participants (team_id);
create index if not exists participants_checked_in_at_idx on public.participants (checked_in_at);

-- New auth users always start as volunteers; roles can only be raised by a super admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

-- Marks a participant present. Only the first check-in wins, so two volunteers
-- scanning the same person at once can't overwrite each other.
create or replace function public.check_in_participant(p_participant_id uuid)
returns table (status text, checked_in_at timestamptz, checked_in_by_name text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_row public.participants;
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;

  update public.participants p
     set checked_in_at = now(), checked_in_by = auth.uid()
   where p.id = p_participant_id and p.checked_in_at is null
  returning * into v_row;

  if found then
    status := 'checked_in';
  else
    select * into v_row from public.participants p where p.id = p_participant_id;
    if not found then
      raise exception 'participant not found';
    end if;
    status := 'already_checked_in';
  end if;

  checked_in_at := v_row.checked_in_at;
  select pr.full_name into checked_in_by_name from public.profiles pr where pr.id = v_row.checked_in_by;
  return next;
end;
$$;

create or replace function public.undo_check_in(p_participant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'only super admins can undo a check-in';
  end if;
  update public.participants set checked_in_at = null, checked_in_by = null where id = p_participant_id;
end;
$$;

revoke execute on function public.check_in_participant(uuid) from public, anon;
revoke execute on function public.undo_check_in(uuid) from public, anon;
grant execute on function public.check_in_participant(uuid) to authenticated;
grant execute on function public.undo_check_in(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.participants enable row level security;

drop policy if exists "staff can read profiles" on public.profiles;
create policy "staff can read profiles" on public.profiles
  for select to authenticated using (public.is_staff());

drop policy if exists "super admins manage profiles" on public.profiles;
create policy "super admins manage profiles" on public.profiles
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "staff can read teams" on public.teams;
create policy "staff can read teams" on public.teams
  for select to authenticated using (public.is_staff());

drop policy if exists "super admins manage teams" on public.teams;
create policy "super admins manage teams" on public.teams
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "staff can read participants" on public.participants;
create policy "staff can read participants" on public.participants
  for select to authenticated using (public.is_staff());

-- Volunteers never write to participants directly; they go through check_in_participant().
drop policy if exists "super admins manage participants" on public.participants;
create policy "super admins manage participants" on public.participants
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- After signing up your own account, promote it to super admin:
--   update public.profiles set role = 'super_admin' where email = 'you@example.com';
