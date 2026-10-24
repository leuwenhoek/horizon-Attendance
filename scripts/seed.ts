// Seeds participants/teams and staff accounts from the CSVs in /data.
//
//   node --env-file=.env.local scripts/seed.ts            # dry run, prints what would happen
//   node --env-file=.env.local scripts/seed.ts --apply    # writes to Supabase
//
// Staff get one shared temporary password: STAFF_PASSWORD env var, or a generated one.

import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { parseSheetRows } from "../src/lib/import.ts";

const APPLY = process.argv.includes("--apply");
const ADMIN_ROLES = new Set(["lead organizer", "organizer"]);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Run with --env-file=.env.local (needs URL and service role key)");

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

function readCsv(path: string): Record<string, unknown>[] {
  const wb = XLSX.read(readFileSync(path, "utf8"), { type: "string", raw: true });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });
}

function chunk<T>(items: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function seedParticipants() {
  const { rows, errors, missingColumns } = parseSheetRows(readCsv("data/participants.csv"));
  if (missingColumns.length) throw new Error(`participants.csv missing columns: ${missingColumns.join(", ")}`);

  const teamNames = [...new Set(rows.map((r) => r.team).filter(Boolean))];
  console.log(`\nParticipants: ${rows.length} rows, ${teamNames.length} teams, ${errors.length} skipped`);
  errors.forEach((e) => console.log(`  ! ${e}`));
  if (!APPLY) return;

  const teamIds = new Map<string, string>();
  for (const batch of chunk(teamNames)) {
    const { data, error } = await supabase
      .from("teams")
      .upsert(batch.map((name) => ({ name })), { onConflict: "name" })
      .select("id, name");
    if (error) throw new Error(`teams: ${error.message}`);
    for (const t of data) teamIds.set(t.name, t.id);
  }

  for (const batch of chunk(rows)) {
    const { error } = await supabase.from("participants").upsert(
      batch.map((r) => ({
        name: r.name,
        email: r.email,
        phone: r.phone || null,
        college: r.college || null,
        team_id: r.team ? (teamIds.get(r.team) ?? null) : null,
      })),
      { onConflict: "email" },
    );
    if (error) throw new Error(`participants: ${error.message}`);
  }
  console.log("  ✓ participants and teams saved");
}

async function seedStaff() {
  const staff = readCsv("data/organizer_rows.csv")
    .filter((r) => String(r.kind).trim() === "staff")
    .map((r) => {
      const staffRole = String(r.staff_role).trim();
      return {
        name: String(r.full_name).replace(/\s+/g, " ").trim(),
        email: String(r.email).trim().toLowerCase(),
        staffRole,
        role: ADMIN_ROLES.has(staffRole.toLowerCase()) ? ("super_admin" as const) : ("volunteer" as const),
      };
    })
    .filter((s) => s.email);

  const { data: existingProfiles, error } = await supabase.from("profiles").select("email");
  if (error) throw new Error(`profiles: ${error.message}`);
  const existing = new Set(existingProfiles.map((p) => p.email.toLowerCase()));

  const toCreate = staff.filter((s) => !existing.has(s.email));
  const skipped = staff.filter((s) => existing.has(s.email));
  const admins = toCreate.filter((s) => s.role === "super_admin");

  console.log(`\nStaff: ${staff.length} in file, ${toCreate.length} to create (${admins.length} admins), ${skipped.length} already exist`);
  for (const s of skipped) console.log(`  = ${s.name} <${s.email}> already has an account, left unchanged`);
  for (const s of admins) console.log(`  + admin: ${s.name} <${s.email}> (${s.staffRole})`);
  if (!APPLY || toCreate.length === 0) return;

  const password = process.env.STAFF_PASSWORD ?? `Hoollow-${randomInt(100000, 999999)}`;
  let created = 0;
  for (const s of toCreate) {
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email: s.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: s.name },
    });
    if (createError || !data.user) {
      console.log(`  ✗ ${s.email}: ${createError?.message ?? "unknown error"}`);
      continue;
    }
    if (s.role === "super_admin") {
      const { error: roleError } = await supabase.from("profiles").update({ role: s.role }).eq("id", data.user.id);
      if (roleError) console.log(`  ✗ ${s.email}: account created but admin role failed: ${roleError.message}`);
    }
    created++;
  }
  console.log(`  ✓ ${created}/${toCreate.length} staff accounts created`);
  console.log(`\n  Temporary password for all new staff: ${password}`);
}

console.log(APPLY ? "Applying seed to Supabase..." : "Dry run (pass --apply to write):");
await seedParticipants();
await seedStaff();
