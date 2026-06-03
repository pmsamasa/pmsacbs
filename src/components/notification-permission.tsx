"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { registerFcmTokenAction } from "@/app/actions/profile";

export function NotificationPermission() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

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
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const vapidKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
            if (!vapidKey) {
              toast.error("Push alert key is not configured. Add NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY in Vercel.");
              return;
            }
            const permission = await Notification.requestPermission();
            if (permission !== "granted") return;

            if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
              toast.error("This browser does not support web push alerts.");
              return;
            }

            const registration = await navigator.serviceWorker.register("/sw.js");
            const existing = await registration.pushManager.getSubscription();
            const subscription =
              existing ??
              (await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
              }));
            const result = await registerFcmTokenAction(JSON.stringify(subscription));
            toast[result.ok ? "success" : "error"](result.message);
            if (result.ok) setVisible(false);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Enabling..." : "Enable"}
      </button>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
