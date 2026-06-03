import { Bell } from "lucide-react";
import { sendBroadcastNotificationAction } from "@/app/actions/notifications";
import { ActionForm } from "@/components/action-form";
import { MarkRead } from "@/components/mark-read";
import { requireRole } from "@/lib/data";
import { formatKolkataDate } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { user, supabase } = await requireRole(["customer", "manager", "head"]);
  const { data: profile } = await supabase.from("profiles").select("role,name").eq("id", user!.id).maybeSingle();
  const params = await searchParams;
  let query = supabase.from("notifications").select("*").eq("recipient_id", user!.id).order("created_at", { ascending: false });
  if (params.tab === "unread") query = query.is("read_at", null);
  const { data: notifications } = await query;
  const unreadIds = (notifications ?? []).filter((item) => !item.read_at).map((item) => item.id);

  return (
    <div className="space-y-6">
      <div><h1 className="section-title">Notifications</h1><p className="section-subtitle">Important bank events, approvals, account openings, and transaction notices.</p></div>
      <MarkRead ids={unreadIds} />
      {profile?.role === "manager" ? (
        <section className="glass-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Send alert to all customers</h2>
          <ActionForm action={sendBroadcastNotificationAction} submitLabel="Send customer alert">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field-label">Heading
                <input className="input" name="title" placeholder="Alert heading" required />
              </label>
              <label className="field-label">Date
                <input className="input" name="message_date" type="datetime-local" required />
              </label>
            </div>
            <label className="field-label">Details
              <textarea className="input min-h-28" name="body" placeholder="Message details for all customers" required />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <input type="checkbox" name="confirmed_by_manager" required />
              Confirmed by bank manager
            </label>
          </ActionForm>
        </section>
      ) : null}
      <div className="flex gap-2"><a className={params.tab === "unread" ? "btn-secondary" : "btn-primary"} href="/notifications?tab=all">All inbox</a><a className={params.tab === "unread" ? "btn-primary" : "btn-secondary"} href="/notifications?tab=unread">Unread</a></div>
      <section className="space-y-3">
        {notifications?.map((item) => <article key={item.id} className="glass-card flex gap-4 p-4"><div className="metric-icon bg-emerald-100 text-emerald-700"><Bell className="size-5" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.title}</h2>{!item.read_at ? <span className="badge">unread</span> : null}</div><p className="mt-1 text-sm text-emerald-700">{item.body}</p><p className="mt-2 text-xs text-emerald-600">{formatKolkataDate(item.created_at)}</p></div></article>)}
        {!notifications?.length ? <div className="glass-card p-6 text-sm text-emerald-700">No notifications in this tab.</div> : null}
      </section>
    </div>
  );
}
