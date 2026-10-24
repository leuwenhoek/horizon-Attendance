import Link from "next/link";
import { ArrowRight, FileUp, Inbox } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatClock, PARTICIPANT_SELECT, type ParticipantRow } from "@/lib/types";
import { Avatar, EmptyState, PageHeader, Progress } from "@/components/ui";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const isAdmin = profile.role === "super_admin";
  const supabase = await createClient();

  const [{ count: total }, { count: checkedIn }, { data: teams }, { data: recent }] =
    await Promise.all([
      supabase.from("participants").select("*", { count: "exact", head: true }),
      supabase
        .from("participants")
        .select("*", { count: "exact", head: true })
        .not("checked_in_at", "is", null),
      supabase.from("teams").select("id, participants(checked_in_at)"),
      supabase
        .from("participants")
        .select(PARTICIPANT_SELECT)
        .not("checked_in_at", "is", null)
        .order("checked_in_at", { ascending: false })
        .limit(8),
    ]);

  const totalCount = total ?? 0;
  const presentCount = checkedIn ?? 0;
  const percent = totalCount ? (presentCount / totalCount) * 100 : 0;

  const teamList = (teams ?? []) as { id: string; participants: { checked_in_at: string | null }[] }[];
  const teamsFull = teamList.filter(
    (t) => t.participants.length > 0 && t.participants.every((p) => p.checked_in_at),
  ).length;
  const teamsNone = teamList.filter((t) => t.participants.every((p) => !p.checked_in_at)).length;
  const teamsPartial = teamList.length - teamsFull - teamsNone;

  const recentRows = (recent ?? []) as unknown as ParticipantRow[];

  if (totalCount === 0) {
    return (
      <>
        <PageHeader title="Overview" />
        <div className="card">
          <EmptyState
            icon={<Inbox className="h-5 w-5" />}
            title="No participants yet"
            action={
              isAdmin && (
                <Link href="/admin/upload" className="btn-primary">
                  <FileUp className="h-4 w-4" />
                  Import participants
                </Link>
              )
            }
          >
            {isAdmin
              ? "Import your participant and team list to start checking people in."
              : "Your organiser hasn't imported the participant list yet."}
          </EmptyState>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Overview"
        description="Live attendance across all registered participants."
        actions={
          <Link href="/attendance" className="btn-primary">
            Open check-in
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <section className="card">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          <Stat label="Checked in" value={presentCount} hint={`${percent.toFixed(0)}%`} />
          <Stat label="Waiting" value={totalCount - presentCount} />
          <Stat label="Registered" value={totalCount} />
          <Stat label="Complete teams" value={teamsFull} hint={`of ${teamList.length}`} />
        </dl>
        <div className="border-t border-line px-4 py-3">
          <Progress value={percent} />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="card overflow-hidden">
          <div className="card-header">
            <h2 className="card-title">Recent check-ins</h2>
            <Link href="/attendance" className="text-xs text-muted transition-colors hover:text-zinc-200">
              View all
            </Link>
          </div>
          {recentRows.length === 0 ? (
            <p className="px-4 py-12 text-center text-[13px] text-muted">No one has checked in yet.</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="border-b border-line">
                <tr>
                  <th className="th">Participant</th>
                  <th className="th hidden sm:table-cell">Team</th>
                  <th className="th hidden md:table-cell">Checked in by</th>
                  <th className="th text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recentRows.map((p) => (
                  <tr key={p.id}>
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.name} size={24} />
                        <span className="truncate font-medium text-zinc-200">{p.name}</span>
                      </div>
                    </td>
                    <td className="td hidden text-muted sm:table-cell">{p.team?.name ?? "—"}</td>
                    <td className="td hidden text-muted md:table-cell">
                      {p.checked_in_by_profile?.full_name ?? "—"}
                    </td>
                    <td className="td text-right font-mono text-xs tabular-nums text-muted">
                      {formatClock(p.checked_in_at!)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card h-fit">
          <div className="card-header">
            <h2 className="card-title">Teams</h2>
            <span className="text-xs tabular-nums text-muted">{teamList.length} total</span>
          </div>
          <div className="space-y-4 p-4">
            <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
              {teamList.length > 0 &&
                [
                  { n: teamsFull, c: "bg-emerald-400" },
                  { n: teamsPartial, c: "bg-amber-400" },
                  { n: teamsNone, c: "bg-white/10" },
                ]
                  .filter((s) => s.n > 0)
                  .map((s) => <div key={s.c} className={s.c} style={{ flexGrow: s.n }} />)}
            </div>
            <ul className="space-y-2.5 text-[13px]">
              <TeamRow color="bg-emerald-400" label="Everyone checked in" value={teamsFull} />
              <TeamRow color="bg-amber-400" label="Partially checked in" value={teamsPartial} />
              <TeamRow color="bg-zinc-600" label="Nobody yet" value={teamsNone} />
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="border-line px-4 py-4 [&:nth-child(2n)]:border-l lg:[&:not(:first-child)]:border-l [&:nth-child(n+3)]:border-t lg:[&:nth-child(n+3)]:border-t-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-50">{value}</span>
        {hint && <span className="text-xs tabular-nums text-muted">{hint}</span>}
      </dd>
    </div>
  );
}

function TeamRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted">
        <span className={`h-2 w-2 rounded-sm ${color}`} />
        {label}
      </span>
      <span className="tabular-nums text-zinc-200">{value}</span>
    </li>
  );
}
