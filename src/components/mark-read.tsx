"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsReadAction } from "@/app/actions/notifications";

export function MarkRead({ ids }: { ids: string[] }) {
  const router = useRouter();
  useEffect(() => {
    if (!ids.length) return;
    const timer = window.setTimeout(async () => {
      await markNotificationsReadAction(ids);
      router.refresh();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [ids, router]);
  return null;
}

