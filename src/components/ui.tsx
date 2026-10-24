import type { ReactNode } from "react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-white" fill="currentColor">
          <path d="M3 2.5h2.5v4.25h5V2.5H13v11h-2.5V9.25h-5v4.25H3z" />
        </svg>
      </span>
      {!compact && <span className="text-[13px] font-semibold tracking-tight text-zinc-100">Hackathon HQ</span>}
    </span>
  );
}

export function Avatar({ name, size = 28 }: { name: string; size?: 24 | 28 | 32 }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const dims = { 24: "h-6 w-6 text-[10px]", 28: "h-7 w-7 text-[11px]", 32: "h-8 w-8 text-xs" }[size];
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-surface-2 font-medium text-zinc-400 ring-1 ring-inset ring-line-strong ${dims}`}
    >
      {initials || "?"}
    </span>
  );
}

const BADGE_TONES = {
  neutral: { wrap: "text-zinc-400 ring-line-strong", dot: "bg-zinc-500" },
  success: { wrap: "text-emerald-300 ring-emerald-500/25 bg-emerald-500/[0.06]", dot: "bg-emerald-400" },
  warning: { wrap: "text-amber-300 ring-amber-500/25 bg-amber-500/[0.06]", dot: "bg-amber-400" },
  accent: { wrap: "text-violet-300 ring-accent/30 bg-accent/[0.08]", dot: "bg-accent" },
} as const;

export function Badge({
  tone = "neutral",
  dot = false,
  children,
}: {
  tone?: keyof typeof BADGE_TONES;
  dot?: boolean;
  children: ReactNode;
}) {
  const t = BADGE_TONES[tone];
  return (
    <span
      className={`inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium ring-1 ring-inset ${t.wrap}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
      {children}
    </span>
  );
}

export function Progress({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-white/[0.06] ${className}`}>
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-50">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-4 grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface-2 text-muted">
        {icon}
      </span>
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[13px] text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-5 w-40 rounded bg-white/[0.05]" />
        <div className="h-3.5 w-72 rounded bg-white/[0.04]" />
      </div>
      <div className="h-24 rounded-lg border border-line bg-surface" />
      <div className="mt-4 h-80 rounded-lg border border-line bg-surface" />
    </div>
  );
}
