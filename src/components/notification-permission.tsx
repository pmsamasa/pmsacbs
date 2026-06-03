"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { registerFcmTokenAction } from "@/app/actions/profile";

export function NotificationPermission() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const syncPermissionBanner = () => {
      setVisible("Notification" in window && Notification.permission === "default");
    };
    const timer = window.setTimeout(syncPermissionBanner, 0);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && "Notification" in window) {
        setVisible(Notification.permission === "default");
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="glass-card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <BellRing className="mt-1 size-5 text-gold-600" />
        <div>
          <p className="font-semibold text-emerald-950">Enable transaction alerts</p>
          <p className="text-sm text-emerald-700">Get browser notifications for approvals, deposits, withdrawals, and handovers.</p>
        </div>
      </div>
      <button
        className="btn-primary"
        type="button"
        onClick={async () => {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            const token = crypto.randomUUID();
            const result = await registerFcmTokenAction(token);
            toast[result.ok ? "success" : "error"](result.message);
          }
          setVisible(false);
        }}
      >
        Enable
      </button>
    </div>
  );
}
