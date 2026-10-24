import { requireSuperAdmin, type Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Badge, PageHeader } from "@/components/ui";
import { CreateStaffForm, RemoveStaffButton } from "./staff-forms";

export default async function VolunteersPage() {
  const me = await requireSuperAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .order("role")
    .order("full_name");
  const staff = (data ?? []) as Profile[];

  const countBy = new Map<string, number>();
  await Promise.all(
    staff.map(async (s) => {
      const { count } = await supabase
        .from("participants")
        .select("*", { count: "exact", head: true })
        .eq("checked_in_by", s.id);
      countBy.set(s.id, count ?? 0);
    }),
  );

  return (
    <>
      <PageHeader
        title="Staff"
        description="Volunteers can check participants in. Admins can also import data and manage staff."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
        <section className="card overflow-hidden">
          <div className="card-header">
            <h2 className="card-title">Members</h2>
            <span className="text-xs tabular-nums text-muted">{staff.length}</span>
          </div>
          <table className="w-full text-[13px]">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Name</th>
                <th className="th w-[110px]">Role</th>
                <th className="th hidden w-[100px] text-right sm:table-cell">Check-ins</th>
                <th className="th w-[56px]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {staff.map((s) => {
                const name = s.full_name ?? s.email;
                return (
                  <tr key={s.id}>
                    <td className="td">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={name} size={32} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-100">
                            {name}
                            {s.id === me.id && <span className="ml-1.5 font-normal text-muted">(you)</span>}
                          </p>
                          <p className="truncate text-xs text-muted">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      {s.role === "super_admin" ? <Badge tone="accent">Admin</Badge> : <Badge>Volunteer</Badge>}
                    </td>
                    <td className="td hidden text-right tabular-nums text-zinc-300 sm:table-cell">
                      {countBy.get(s.id) ?? 0}
                    </td>
                    <td className="td text-right">
                      {s.id !== me.id && <RemoveStaffButton userId={s.id} name={name} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <CreateStaffForm />
      </div>
    </>
  );
}
