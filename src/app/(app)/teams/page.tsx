import { Users } from "lucide-react";
import { fetchAllParticipants } from "@/lib/participants";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { ParticipantRow } from "@/lib/types";
import { Badge, EmptyState, PageHeader, Progress } from "@/components/ui";

const NO_TEAM = "Unassigned";

export default async function TeamsPage() {
  await requireProfile();
  const supabase = await createClient();
  const [participants, { data: teamRows }] = await Promise.all([
    fetchAllParticipants(supabase),
    supabase.from("teams").select("name").order("name"),
  ]);

  const groups = new Map<string, ParticipantRow[]>();
  for (const t of teamRows ?? []) groups.set(t.name, []);
  for (const p of participants) {
    const key = p.team?.name ?? NO_TEAM;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const teams = [...groups.entries()].map(([name, members]) => ({
    name,
    members,
    present: members.filter((m) => m.checked_in_at).length,
  }));
  const fullTeams = teams.filter((t) => t.members.length > 0 && t.present === t.members.length).length;

  return (
    <>
      <PageHeader
        title="Teams"
        description={`${teams.length} teams, ${fullTeams} fully checked in.`}
      />

      <div className="card overflow-hidden">
        {teams.length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} title="No teams yet">
            Teams appear here once the participant list is imported.
          </EmptyState>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="border-b border-line">
              <tr>
                <th className="th w-[24%]">Team</th>
                <th className="th">Members</th>
                <th className="th w-[180px] text-right sm:text-left">Checked in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {teams.map((t) => {
                const complete = t.members.length > 0 && t.present === t.members.length;
                return (
                  <tr key={t.name} className="align-top">
                    <td className="td py-3">
                      <p className="font-medium text-zinc-100">{t.name}</p>
                      {complete && (
                        <div className="mt-1.5">
                          <Badge tone="success">Complete</Badge>
                        </div>
                      )}
                    </td>
                    <td className="td py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {t.members.map((m) => (
                          <span
                            key={m.id}
                            className={`inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs ${
                              m.checked_in_at
                                ? "border-line-strong bg-surface-2 text-zinc-200"
                                : "border-dashed border-line text-zinc-500"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${m.checked_in_at ? "bg-emerald-400" : "bg-zinc-600"}`}
                            />
                            {m.name}
                          </span>
                        ))}
                        {t.members.length === 0 && <span className="text-xs text-zinc-600">No members</span>}
                      </div>
                    </td>
                    <td className="td py-3">
                      <div className="flex items-center justify-end gap-3 sm:justify-start">
                        <Progress
                          value={t.members.length ? (t.present / t.members.length) * 100 : 0}
                          className="hidden w-20 sm:block"
                        />
                        <span className="tabular-nums text-zinc-300">
                          {t.present}
                          <span className="text-zinc-600">/{t.members.length}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
