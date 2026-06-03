import { AppShell } from "@/components/app-shell";
import { NotificationPermission } from "@/components/notification-permission";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <NotificationPermission />
      {children}
    </AppShell>
  );
}

