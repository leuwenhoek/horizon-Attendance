"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, CircleCheck, Loader2, RotateCw, Search, SearchX, Undo2, Users, X } from "lucide-react";
import { formatClock, type ParticipantRow } from "@/lib/types";
import { Avatar, Badge, EmptyState, PageHeader, Progress } from "@/components/ui";
import { checkIn, undoCheckIn } from "./actions";

type Filter = "all" | "pending" | "present";
type Override = { checked_in_at: string | null; checked_in_by: string | null };
type Toast = { id: number; kind: "success" | "warn" | "error"; text: string };

const MAX_VISIBLE = 100;
const REFRESH_MS = 20_000;

export function AttendanceList({
  participants,
  canUndo,
}: {
  participants: ParticipantRow[];
  canUndo: boolean;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [prevParticipants, setPrevParticipants] = useState(participants);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [refreshing, startRefresh] = useTransition();

  // Fresh server data already includes our own check-ins, so local overrides can be dropped.
  if (participants !== prevParticipants) {
    setPrevParticipants(participants);
    setOverrides({});
  }

  useEffect(() => {
    const id = setInterval(() => startRefresh(() => router.refresh()), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rows = useMemo(
    () =>
      participants.map((p) => {
        const o = overrides[p.id];
        return o
          ? { ...p, checked_in_at: o.checked_in_at, checked_in_by_profile: { full_name: o.checked_in_by } }
          : p;
      }),
    [participants, overrides],
  );

  const presentCount = rows.filter((r) => r.checked_in_at).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "pending" && r.checked_in_at) return false;
      if (filter === "present" && !r.checked_in_at) return false;
      if (!q) return true;
      return [r.name, r.email, r.phone, r.college, r.team?.name].some((v) =>
        v?.toLowerCase().includes(q),
      );
    });
  }, [rows, query, filter]);

  function notify(kind: Toast["kind"], text: string) {
    setToast((prev) => ({ id: (prev?.id ?? 0) + 1, kind, text }));
  }

  async function handleCheckIn(p: ParticipantRow) {
    setBusyId(p.id);
    const res = await checkIn(p.id);
    setBusyId(null);
    if (!res.ok) return notify("error", res.error);
    setOverrides((o) => ({
      ...o,
      [p.id]: { checked_in_at: res.checkedInAt, checked_in_by: res.checkedInBy },
    }));
    if (res.status === "checked_in") notify("success", `Checked in ${p.name}`);
    else notify("warn", `${p.name} was already checked in by ${res.checkedInBy ?? "someone else"}`);
  }

  async function handleUndo(p: ParticipantRow) {
    if (!confirm(`Undo check-in for ${p.name}?`)) return;
    setBusyId(p.id);
    const res = await undoCheckIn(p.id);
    setBusyId(null);
    if (!res.ok) return notify("error", res.error ?? "Undo failed");
    setOverrides((o) => ({ ...o, [p.id]: { checked_in_at: null, checked_in_by: null } }));
    notify("success", `Reverted check-in for ${p.name}`);
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setQuery("");
      return;
    }
    if (e.key !== "Enter" || !query.trim()) return;
    const pending = filtered.filter((r) => !r.checked_in_at);
    if (pending.length === 1 && busyId === null) {
      handleCheckIn(pending[0]).then(() => setQuery(""));
    }
  }

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: rows.length },
    { id: "pending", label: "Waiting", count: rows.length - presentCount },
    { id: "present", label: "Checked in", count: presentCount },
  ];

  return (
    <>
      <PageHeader
        title="Check-in"
        description={
          <>
            Search and mark participants as present. Press <kbd className="kbd">/</kbd> to search,{" "}
            <kbd className="kbd">Enter</kbd> to check in a single match.
          </>
        }
        actions={
          <button
            type="button"
            onClick={() => startRefresh(() => router.refresh())}
            className="btn-secondary"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Sync
          </button>
        }
      />

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-line p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              ref={searchRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search name, email, phone, college or team"
              className="input pl-9 pr-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-zinc-500 hover:text-zinc-200"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div role="tablist" className="flex h-9 items-center rounded-md border border-line bg-bg p-0.5">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={filter === t.id}
                  type="button"
                  onClick={() => setFilter(t.id)}
                  className={`flex h-full items-center gap-1.5 rounded px-2.5 text-[13px] font-medium transition-colors ${
                    filter === t.id ? "bg-surface-2 text-zinc-100 shadow-[0_0_0_1px_var(--line-strong)]" : "text-muted hover:text-zinc-200"
                  }`}
                >
                  {t.label}
                  <span className="text-xs tabular-nums text-zinc-500">{t.count}</span>
                </button>
              ))}
            </div>
            <div className="hidden w-36 items-center gap-2 xl:flex">
              <Progress value={rows.length ? (presentCount / rows.length) * 100 : 0} className="flex-1" />
              <span className="w-9 text-right text-xs tabular-nums text-muted">
                {rows.length ? Math.round((presentCount / rows.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {participants.length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} title="No participants yet">
            A super admin needs to import the participant list first.
          </EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<SearchX className="h-5 w-5" />} title="No results">
            Nothing matches &ldquo;{query}&rdquo;. Try a phone number or team name.
          </EmptyState>
        ) : (
          <table className="w-full table-fixed text-[13px]">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Participant</th>
                <th className="th hidden w-[18%] md:table-cell">Team</th>
                <th className="th hidden w-[18%] lg:table-cell">College</th>
                <th className="th hidden w-[200px] sm:table-cell">Status</th>
                <th className="th w-[124px]">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.slice(0, MAX_VISIBLE).map((p) => {
                const present = Boolean(p.checked_in_at);
                const busy = busyId === p.id;
                return (
                  <tr key={p.id} className="group transition-colors hover:bg-white/[0.015]">
                    <td className="td">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={p.name} size={32} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-100">{p.name}</p>
                          <p className="truncate text-xs text-muted">
                            {p.email}
                            {p.phone && <span className="text-zinc-600"> · </span>}
                            {p.phone}
                          </p>
                          {p.team && <p className="truncate text-xs text-zinc-400 md:hidden">{p.team.name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="td hidden truncate text-zinc-300 md:table-cell">{p.team?.name ?? "—"}</td>
                    <td className="td hidden truncate text-muted lg:table-cell">{p.college ?? "—"}</td>
                    <td className="td hidden sm:table-cell">
                      {present ? (
                        <div className="flex flex-col items-start gap-1">
                          <Badge tone="success" dot>
                            Checked in
                          </Badge>
                          <span className="truncate text-xs text-muted">
                            <span className="font-mono tabular-nums">{formatClock(p.checked_in_at!)}</span>
                            {p.checked_in_by_profile?.full_name && ` · ${p.checked_in_by_profile.full_name}`}
                          </span>
                        </div>
                      ) : (
                        <Badge dot>Waiting</Badge>
                      )}
                    </td>
                    <td className="td text-right">
                      {present ? (
                        canUndo ? (
                          <button
                            type="button"
                            onClick={() => handleUndo(p)}
                            disabled={busy}
                            className="btn-ghost sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                            Undo
                          </button>
                        ) : (
                          <CircleCheck className="ml-auto h-4 w-4 text-emerald-400 sm:hidden" />
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCheckIn(p)}
                          disabled={busy}
                          className="btn-primary w-[100px]"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                          Check in
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {filtered.length > MAX_VISIBLE && (
          <div className="border-t border-line px-4 py-3 text-xs text-muted">
            Showing {MAX_VISIBLE} of {filtered.length}. Refine your search to see more.
          </div>
        )}
      </div>

      {toast && <ToastView key={toast.id} toast={toast} onClose={() => setToast(null)} />}
    </>
  );
}

function ToastView({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icon = {
    success: <CircleCheck className="h-4 w-4 text-emerald-400" />,
    warn: <AlertTriangle className="h-4 w-4 text-amber-400" />,
    error: <AlertTriangle className="h-4 w-4 text-red-400" />,
  }[toast.kind];

  return (
    <div
      role="status"
      className="animate-fade-in fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-line-strong bg-surface-2 py-2.5 pl-3 pr-2 text-[13px] text-zinc-100 shadow-[0_8px_30px_rgb(0_0_0/0.5)]"
    >
      {icon}
      <span className="flex-1">{toast.text}</span>
      <button type="button" onClick={onClose} className="btn-ghost btn-icon h-6 w-6" aria-label="Dismiss">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
