"use client";

import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function useNavigationFeedback() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingLabel(null), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  function begin(label: string) {
    setLoadingLabel(label);
    startTransition(() => undefined);
  }

  return { begin, isNavigating: isPending || Boolean(loadingLabel), loadingLabel };
}

export function NavigationOverlay({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <div className="fixed inset-x-3 top-3 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-900/10 bg-white/95 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-soft backdrop-blur-xl">
      <Loader2 className="size-4 animate-spin text-gold-600" />
      Opening {label}...
    </div>
  );
}
