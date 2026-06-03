import { CopyButton } from "@/components/copy-button";
import { requireRole } from "@/lib/data";
import { requestTypeLabel, statusLabel } from "@/lib/labels";
import { cn, formatINR, formatKolkataDate } from "@/lib/utils";

export const metadata = { title: "Withdrawal Requests" };

export default async function ManagerRequestsPage() {
  const { supabase } = await requireRole(["manager"]);
  const [{ data: requests }, { data: profiles }, { data: accounts }] = await Promise.all([
    supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,name,cic_no,class_name").eq("role", "customer"),
    supabase.from("customer_accounts").select("id,account_type,balance"),
  ]);
  const approved = requests?.filter((request) => request.status === "approved").length ?? 0;
  const rejected = requests?.filter((request) => request.status === "rejected").length ?? 0;
  const pending = requests?.filter((request) => request.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Withdrawal Requests</h1>
        <p className="section-subtitle">Track every restricted withdrawal request and copy the approval ID before posting an approved debit.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card p-4"><p className="text-sm text-emerald-700">Approved</p><p className="mt-1 text-2xl font-semibold text-emerald-800">{approved}</p></div>
        <div className="glass-card p-4"><p className="text-sm text-emerald-700">Rejected</p><p className="mt-1 text-2xl font-semibold text-red-700">{rejected}</p></div>
        <div className="glass-card p-4"><p className="text-sm text-emerald-700">Waiting for answer</p><p className="mt-1 text-2xl font-semibold text-gold-700">{pending}</p></div>
      </div>
      <section className="glass-card p-5">
        <div className="space-y-4">
          {requests?.map((request) => {
            const customer = profiles?.find((profile) => profile.id === request.customer_id);
            const account = accounts?.find((item) => item.id === request.account_id);
            return (
            <article key={request.id} className={cn("rounded-2xl border p-4", statusTone(request.status))}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{customer?.name || customer?.cic_no || "Customer"} ({customer?.class_name || "No class"})</p>
                    <span className={cn("badge", request.status === "approved" && "bg-emerald-100 text-emerald-800", request.status === "rejected" && "bg-red-100 text-red-800")}>{statusLabel(request.status)}</span>
                  </div>
                  <p className="mt-1 text-sm text-emerald-700">{requestTypeLabel(request.request_type)} for {formatINR(request.amount)}. Account: {account?.account_type || "Account"} | Balance: {formatINR(account?.balance)}</p>
                  <p className="mt-2 text-sm">{request.reason}</p>
                  <p className="mt-2 text-xs text-emerald-600">Submitted {formatKolkataDate(request.created_at)}</p>
                  {request.status === "approved" ? (
                    <div className="mt-3 rounded-2xl border border-emerald-900/10 bg-white/80 p-3">
                      <p className="mb-2 text-sm font-semibold text-emerald-950">Use this approval ID in the transaction form:</p>
                      <CopyButton value={request.id} label={`Copy approval ID: ${request.id}`} />
                    </div>
                  ) : null}
                  {request.status === "rejected" ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">This request was answered as rejected. Do not post a restricted debit for this request.</p> : null}
                </div>
                <div className="text-xs text-emerald-700 sm:text-right">
                  {request.decided_at ? <p>Answered {formatKolkataDate(request.decided_at)}</p> : <p>Not answered yet</p>}
                  {request.decision_note ? <p className="mt-1">{request.decision_note}</p> : null}
                </div>
              </div>
            </article>
          );})}
          {!requests?.length ? <div className="rounded-2xl bg-white/75 p-4 text-sm text-emerald-700">No withdrawal requests yet.</div> : null}
        </div>
      </section>
    </div>
  );
}

function statusTone(status: string) {
  if (status === "approved") return "border-emerald-900/15 bg-emerald-50/80";
  if (status === "rejected") return "border-red-200 bg-red-50/80";
  if (status === "used") return "border-emerald-900/10 bg-slate-50";
  return "border-gold-200 bg-gold-100/40";
}
