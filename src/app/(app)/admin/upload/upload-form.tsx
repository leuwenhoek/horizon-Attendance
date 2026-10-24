"use client";

import { useState } from "react";
import { AlertTriangle, CircleCheck, Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { parseSheetRows, type ParsedImport } from "@/lib/import";
import { Badge } from "@/components/ui";
import { deleteAllData, importParticipants } from "./actions";

const PREVIEW_ROWS = 15;

const COLUMNS = [
  { name: "Name", required: true },
  { name: "Email", required: true },
  { name: "Phone", required: false },
  { name: "College", required: false },
  { name: "Team", required: false },
];

export function UploadForm() {
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function reset() {
    setFile(null);
    setParsed(null);
    setParseError(null);
  }

  async function handleFile(f: File | undefined) {
    reset();
    setMessage(null);
    if (!f) return;
    setFile({ name: f.name, size: f.size });
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await f.arrayBuffer());
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
      setParsed(parseSheetRows(raw));
    } catch {
      setParseError("This file couldn't be read. Upload a valid .csv, .xlsx or .xls file.");
    }
  }

  async function handleImport() {
    if (!parsed?.rows.length) return;
    setSaving(true);
    const res = await importParticipants(parsed.rows);
    setSaving(false);
    if (res.ok) {
      setMessage({ ok: true, text: `Imported ${res.participants} participants across ${res.teams} teams.` });
      reset();
    } else {
      setMessage({ ok: false, text: res.error });
    }
  }

  async function handleDeleteAll() {
    const answer = prompt('This permanently deletes all participants, teams and attendance. Type "DELETE" to confirm.');
    if (answer !== "DELETE") return;
    const res = await deleteAllData();
    setMessage(res.ok ? { ok: true, text: "All participant data was deleted." } : { ok: false, text: res.error ?? "Delete failed" });
  }

  const teamCount = parsed ? new Set(parsed.rows.map((r) => r.team).filter(Boolean)).size : 0;
  const ready = parsed && parsed.missingColumns.length === 0;

  return (
    <div className="space-y-4">
      {message && (
        <div
          role="status"
          className={`animate-fade-in flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px] ${
            message.ok
              ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-200"
              : "border-red-500/25 bg-red-500/[0.06] text-red-300"
          }`}
        >
          {message.ok ? <CircleCheck className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="card p-1.5">
          {file ? (
            <div className="flex h-full min-h-[188px] flex-col justify-between gap-6 rounded-md p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-zinc-300">
                  <FileSpreadsheet className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-zinc-100">{file.name}</p>
                  <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" onClick={reset} className="btn-ghost btn-icon" aria-label="Remove file">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {parseError && <p className="text-[13px] text-red-400">{parseError}</p>}
              {parsed && parsed.missingColumns.length > 0 && (
                <p className="text-[13px] text-red-400">
                  Missing required column{parsed.missingColumns.length > 1 ? "s" : ""}:{" "}
                  {parsed.missingColumns.join(", ")}. Check the header row.
                </p>
              )}
              {ready && (
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <dl className="flex gap-8">
                    <Metric label="Participants" value={parsed.rows.length} />
                    <Metric label="Teams" value={teamCount} />
                    <Metric label="Skipped" value={parsed.errors.length} />
                  </dl>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={saving || parsed.rows.length === 0}
                    className="btn-primary"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {saving ? "Importing" : `Import ${parsed.rows.length} participants`}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFile(e.dataTransfer.files[0]);
              }}
              className={`flex min-h-[188px] cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed text-center transition-colors ${
                dragging ? "border-accent bg-accent/[0.05]" : "border-line-strong hover:border-zinc-500 hover:bg-white/[0.015]"
              }`}
            >
              <Upload className="h-5 w-5 text-zinc-500" strokeWidth={1.75} />
              <div>
                <p className="text-[13px] font-medium text-zinc-200">
                  Drop a file here or <span className="text-violet-300 underline-offset-2 hover:underline">browse</span>
                </p>
                <p className="mt-0.5 text-xs text-muted">CSV, XLSX or XLS</p>
              </div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="sr-only"
                onChange={(e) => {
                  handleFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        <aside className="card">
          <div className="card-header">
            <h2 className="card-title">Expected columns</h2>
          </div>
          <ul className="divide-y divide-line">
            {COLUMNS.map((c) => (
              <li key={c.name} className="flex items-center justify-between px-4 py-2 text-[13px]">
                <span className="font-mono text-xs text-zinc-300">{c.name}</span>
                {c.required ? <Badge tone="accent">Required</Badge> : <span className="text-xs text-zinc-600">Optional</span>}
              </li>
            ))}
          </ul>
          <div className="border-t border-line p-3">
            <a href="/sample-participants.csv" download className="btn-secondary w-full">
              <Download className="h-3.5 w-3.5" />
              Sample CSV
            </a>
          </div>
        </aside>
      </div>

      {ready && parsed.errors.length > 0 && (
        <details className="card group">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-2 px-4 text-[13px] text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            {parsed.errors.length} row{parsed.errors.length > 1 ? "s" : ""} skipped or adjusted
            <span className="ml-auto text-xs text-muted group-open:hidden">Show</span>
            <span className="ml-auto hidden text-xs text-muted group-open:inline">Hide</span>
          </summary>
          <ul className="max-h-48 space-y-1 overflow-auto border-t border-line px-4 py-3 font-mono text-xs text-muted">
            {parsed.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </details>
      )}

      {ready && parsed.rows.length > 0 && (
        <section className="card overflow-hidden">
          <div className="card-header">
            <h2 className="card-title">Preview</h2>
            <span className="text-xs tabular-nums text-muted">
              {Math.min(PREVIEW_ROWS, parsed.rows.length)} of {parsed.rows.length} rows
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-[13px]">
              <thead className="border-b border-line">
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c.name} className="th">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {parsed.rows.slice(0, PREVIEW_ROWS).map((r) => (
                  <tr key={r.email}>
                    <td className="td text-zinc-100">{r.name}</td>
                    <td className="td text-muted">{r.email}</td>
                    <td className="td font-mono text-xs tabular-nums text-muted">{r.phone || "—"}</td>
                    <td className="td text-muted">{r.college || "—"}</td>
                    <td className="td text-zinc-300">{r.team || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card mt-8 flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <h2 className="text-[13px] font-medium text-zinc-200">Delete all participant data</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Removes every participant, team and check-in. Staff accounts are kept.
          </p>
        </div>
        <button type="button" onClick={handleDeleteAll} className="btn-danger">
          Delete data
        </button>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums text-zinc-50">{value}</dd>
    </div>
  );
}
