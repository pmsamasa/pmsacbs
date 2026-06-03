"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Banknote, Bell, ChartNoAxesCombined, HandCoins, Home, Landmark, Repeat, UserRound, UsersRound, WalletCards } from "lucide-react";
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
  return (
    <nav className="mt-8 space-y-1">
      {items.map((item) => <NavLink key={item.href} item={item} />)}
    </nav>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-emerald-900/10 bg-white/90 px-2 py-2 shadow-soft backdrop-blur-xl lg:hidden">
      {items.slice(0, 4).map((item) => <MobileLink key={item.href} item={item} />)}
    </nav>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/manager" && href !== "/customer" && href !== "/head" && pathname.startsWith(`${href}/`));
}

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = icons[item.icon] ?? Home;
  return (
    <Link
      href={item.href}
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

function MobileLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = icons[item.icon] ?? Home;
  return (
    <Link
      href={item.href}
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
