"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileUp, LayoutDashboard, ScanLine, ShieldCheck, Users } from "lucide-react";

const SECTIONS = [
  {
    title: "Event",
    adminOnly: false,
    links: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/attendance", label: "Check-in", icon: ScanLine },
      { href: "/teams", label: "Teams", icon: Users },
    ],
  },
  {
    title: "Admin",
    adminOnly: true,
    links: [
      { href: "/admin/upload", label: "Import", icon: FileUp },
      { href: "/admin/volunteers", label: "Staff", icon: ShieldCheck },
    ],
  },
];

function visibleSections(isAdmin: boolean) {
  return SECTIONS.filter((s) => isAdmin || !s.adminOnly);
}

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
      {visibleSections(isAdmin).map((section) => (
        <div key={section.title}>
          <p className="mb-1 px-2 text-xs font-medium text-zinc-600">{section.title}</p>
          <ul className="space-y-0.5">
            {section.links.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors ${
                      active ? "bg-white/[0.06] text-zinc-50" : "text-muted hover:bg-white/[0.03] hover:text-zinc-200"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? "text-zinc-200" : "text-zinc-500"}`} strokeWidth={1.75} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = visibleSections(isAdmin).flatMap((s) => s.links);

  return (
    <nav className="flex gap-1 overflow-x-auto px-3">
      {links.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`relative shrink-0 px-2.5 pb-2.5 pt-1 text-[13px] font-medium transition-colors ${
              active ? "text-zinc-50" : "text-muted hover:text-zinc-200"
            }`}
          >
            {label}
            {active && <span className="absolute inset-x-2.5 bottom-0 h-0.5 rounded-full bg-zinc-100" />}
          </Link>
        );
      })}
    </nav>
  );
}
