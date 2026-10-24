"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { cleanText, type ImportRow } from "@/lib/import";
import { createClient } from "@/lib/supabase/server";

const CHUNK = 500;

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

function revalidateAll() {
  for (const path of ["/dashboard", "/attendance", "/teams"]) revalidatePath(path);
}

export type ImportResult = { ok: true; participants: number; teams: number } | { ok: false; error: string };

export async function importParticipants(input: ImportRow[]): Promise<ImportResult> {
  const profile = await getProfile();
  if (profile?.role !== "super_admin") return { ok: false, error: "Only super admins can upload." };

  const rows = input
    .map((r) => ({
      name: cleanText(r.name),
      email: cleanText(r.email).toLowerCase(),
      phone: cleanText(r.phone) || null,
      college: cleanText(r.college) || null,
      team: cleanText(r.team),
    }))
    .filter((r) => r.name && r.email);
  if (!rows.length) return { ok: false, error: "No valid rows to import." };

  const supabase = await createClient();

  const teamNames = [...new Set(rows.map((r) => r.team).filter(Boolean))];
  const teamIds = new Map<string, string>();
  for (const batch of chunks(teamNames)) {
    const { data, error } = await supabase
      .from("teams")
      .upsert(batch.map((name) => ({ name })), { onConflict: "name" })
      .select("id, name");
    if (error) return { ok: false, error: `Saving teams failed: ${error.message}` };
    for (const t of data ?? []) teamIds.set(t.name, t.id);
  }

  for (const batch of chunks(rows)) {
    const { error } = await supabase.from("participants").upsert(
      batch.map(({ team, ...p }) => ({ ...p, team_id: team ? (teamIds.get(team) ?? null) : null })),
      { onConflict: "email" },
    );
    if (error) return { ok: false, error: `Saving participants failed: ${error.message}` };
  }

  revalidateAll();
  return { ok: true, participants: rows.length, teams: teamNames.length };
}

export async function deleteAllData(): Promise<{ ok: boolean; error?: string }> {
  const profile = await getProfile();
  if (profile?.role !== "super_admin") return { ok: false, error: "Only super admins can do this." };

  const supabase = await createClient();
  const { error: pErr } = await supabase.from("participants").delete().not("id", "is", null);
  if (pErr) return { ok: false, error: pErr.message };
  const { error: tErr } = await supabase.from("teams").delete().not("id", "is", null);
  if (tErr) return { ok: false, error: tErr.message };

  revalidateAll();
  return { ok: true };
}
