import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { BottomNav, SidebarNav } from "@/components/sidebar-nav";
import { customerNav, headNav, managerNav } from "@/lib/constants";
import { getSessionProfile } from "@/lib/data";
import { initials } from "@/lib/utils";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user || !profile) redirect("/login");

  const nav = profile.role === "head" ? headNav : profile.role === "manager" ? managerNav : customerNav;
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e8fff4,transparent_34%),linear-gradient(135deg,#f8fff9,#edf8ef_42%,#fffaf0)] text-emerald-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-emerald-900/10 bg-white/70 px-5 py-6 shadow-soft backdrop-blur-xl lg:block">
        <Logo />
        <SidebarNav items={nav} />
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-emerald-900/10 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Logo compact className="lg:hidden" />
            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold">Welcome, {profile.name || profile.cic_no}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/notifications" className="icon-button relative" aria-label="Notifications">
                <Bell className="size-5" />
                {count ? <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{count}</span> : null}
              </Link>
              <Link href="/profile" className="relative grid size-10 place-items-center overflow-hidden rounded-full bg-emerald-900 text-sm font-semibold text-white">
                {profile.photo_url ? <Image src={profile.photo_url} alt="" fill className="object-cover" unoptimized /> : initials(profile.name || profile.cic_no)}
              </Link>
              <form action={signOutAction}>
                <button className="icon-button" aria-label="Sign out"><LogOut className="size-5" /></button>
              </form>
            </div>
          </div>
        </header>
        <main className="px-4 pb-28 pt-5 sm:px-6 lg:pb-10">{children}</main>
      </div>
      <BottomNav items={nav} />
    </div>
  );
}
