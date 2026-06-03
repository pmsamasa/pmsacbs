"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Banknote, Bell, ChartNoAxesCombined, HandCoins, Home, Landmark, Menu, Repeat, UserRound, UsersRound, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { NavigationOverlay, useNavigationFeedback } from "@/components/navigation-progress";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  banknote: Banknote,
  bell: Bell,
  chart: ChartNoAxesCombined,
  coins: HandCoins,
  home: Home,
  landmark: Landmark,
  repeat: Repeat,
  user: UserRound,
  users: UsersRound,
  wallet: WalletCards,
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const { begin, loadingLabel } = useNavigationFeedback();
  return (
    <nav className="mt-8 space-y-1">
      <NavigationOverlay label={loadingLabel} />
      {items.map((item) => <NavLink key={item.href} item={item} onNavigate={begin} />)}
    </nav>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const { begin, loadingLabel } = useNavigationFeedback();
  return (
    <>
      <NavigationOverlay label={loadingLabel} />
      {open ? (
        <div className="fixed inset-0 z-40 bg-emerald-950/30 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-3 bottom-20 rounded-3xl border border-emerald-900/10 bg-white p-4 shadow-soft" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-emerald-950">Bank sections</p>
              <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {items.map((item) => <MobileLink key={item.href} item={item} onNavigate={(label) => { begin(label); setOpen(false); }} />)}
            </div>
          </div>
        </div>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-emerald-900/10 bg-white/95 px-2 py-2 shadow-soft backdrop-blur-xl lg:hidden">
        {items.slice(0, 4).map((item) => <MobileLink key={item.href} item={item} onNavigate={begin} />)}
        <button className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium text-emerald-800" type="button" onClick={() => setOpen(true)}>
          <Menu className="size-5" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/manager" && href !== "/customer" && href !== "/head" && pathname.startsWith(`${href}/`));
}

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate: (label: string) => void }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = icons[item.icon] ?? Home;
  return (
    <Link
      href={item.href}
      onClick={() => {
        if (!active) onNavigate(item.label);
      }}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 hover:text-emerald-950",
        active && "bg-emerald-900 text-white shadow-soft hover:bg-emerald-900 hover:text-white",
      )}
    >
      <Icon className="size-5" />
      {item.label}
    </Link>
  );
}

function MobileLink({ item, onNavigate }: { item: NavItem; onNavigate: (label: string) => void }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = icons[item.icon] ?? Home;
  return (
    <Link
      href={item.href}
      onClick={() => {
        if (!active) onNavigate(item.label);
      }}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium text-emerald-800",
        active && "bg-emerald-900 text-white",
      )}
    >
      <Icon className="size-5" />
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}
