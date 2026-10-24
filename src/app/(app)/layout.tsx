import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { Avatar, Logo, PageSkeleton } from "@/components/ui";
import { MobileNav, SidebarNav } from "./nav-links";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-bg md:flex">
        <div className="flex h-14 items-center px-4">
          <Logo />
        </div>
        <Suspense fallback={<div className="flex-1" />}>
          <Sidebar />
        </Suspense>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-[97px] border-b border-line md:hidden" />}>
          <MobileHeader />
        </Suspense>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}

async function Sidebar() {
  const profile = await requireProfile();
  const name = profile.full_name ?? profile.email;

  return (
    <>
      <SidebarNav isAdmin={profile.role === "super_admin"} />
      <div className="mt-auto border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1">
          <Avatar name={name} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium text-zinc-200">{name}</p>
            <p className="truncate text-xs text-muted">
              {profile.role === "super_admin" ? "Super admin" : "Volunteer"}
            </p>
          </div>
          <form action={logout}>
            <button type="submit" title="Log out" className="btn-ghost btn-icon">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

async function MobileHeader() {
  const profile = await requireProfile();
  const name = profile.full_name ?? profile.email;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-1">
          <Avatar name={name} />
          <form action={logout}>
            <button type="submit" title="Log out" className="btn-ghost btn-icon">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
      <MobileNav isAdmin={profile.role === "super_admin"} />
    </header>
  );
}
