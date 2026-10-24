export type ImportRow = {
  name: string;
  email: string;
  phone: string;
  college: string;
  team: string;
};

export type ParsedImport = {
  rows: ImportRow[];
  errors: string[];
  missingColumns: string[];
};

const COLUMN_ALIASES: Record<keyof ImportRow, string[]> = {
  name: ["name", "fullname", "participantname", "participant", "studentname"],
  email: ["email", "emailid", "emailaddress", "mail", "participantemail"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "contact", "contactnumber", "whatsapp"],
  college: ["college", "collegename", "institution", "institute", "university", "organization", "organisation", "company"],
  team: ["team", "teamname", "teamid", "group"],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");
export const cleanText = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

export function parseSheetRows(raw: Record<string, unknown>[]): ParsedImport {
  const headers = raw.length ? Object.keys(raw[0]) : [];
  const columnFor = {} as Record<keyof ImportRow, string | undefined>;
  for (const field of Object.keys(COLUMN_ALIASES) as (keyof ImportRow)[]) {
    columnFor[field] = headers.find((h) => COLUMN_ALIASES[field].includes(normalizeKey(h)));
  }

  const missingColumns = (["name", "email"] as const).filter((f) => !columnFor[f]);
  if (missingColumns.length) return { rows: [], errors: [], missingColumns };

  const errors: string[] = [];
  const byEmail = new Map<string, ImportRow>();
  const teamCasing = new Map<string, string>();

  raw.forEach((r, i) => {
    // SheetJS skips blank rows but records each row's real 0-based position here.
    const sheetRow = (r as { __rowNum__?: number }).__rowNum__;
    const line = sheetRow !== undefined ? sheetRow + 1 : i + 2;
    const get = (f: keyof ImportRow) => (columnFor[f] ? cleanText(r[columnFor[f]!]) : "");
    const row: ImportRow = {
      name: get("name"),
      email: get("email").toLowerCase(),
      phone: get("phone"),
      college: get("college"),
      team: get("team"),
    };

    if (!row.name && !row.email) return;
    if (!row.name) return void errors.push(`Row ${line}: missing name`);
    if (!row.email) return void errors.push(`Row ${line}: missing email for ${row.name}`);
    if (!EMAIL_RE.test(row.email)) return void errors.push(`Row ${line}: invalid email "${row.email}"`);
    if (byEmail.has(row.email)) errors.push(`Row ${line}: duplicate email ${row.email} (later row kept)`);

    if (row.team) {
      const key = row.team.toLowerCase();
      if (!teamCasing.has(key)) teamCasing.set(key, row.team);
      row.team = teamCasing.get(key)!;
    }
    byEmail.set(row.email, row);
  });

  return { rows: [...byEmail.values()], errors, missingColumns: [] };
}
