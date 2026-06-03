import { ShieldCheck } from "lucide-react";
import { decideWithdrawalRequestAction } from "@/app/actions/withdrawals";
import { ActionForm } from "@/components/action-form";
import { requireRole } from "@/lib/data";
import { requestTypeLabel, statusLabel } from "@/lib/labels";
import { formatINR, formatKolkataDate } from "@/lib/utils";

export const metadata = { title: "Approvals" };

export default async function HeadRequestsPage() {
  const { supabase } = await requireRole(["head"]);
  const [{ data: requests }, { data: profiles }, { data: accounts }] = await Promise.all([
    supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,name,cic_no"),
    supabase.from("customer_accounts").select("id,account_type,balance"),
  ]);

  return (
    <div className="space-y-6">
      <div><h1 className="section-title">Withdrawal Approvals</h1><p className="section-subtitle">Restricted fixed and saving withdrawals require head decision before the manager can debit.</p></div>
      <section className="glass-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="size-5 text-gold-600" /> Requests</h2>
        <div className="space-y-4">
          {requests?.map((request) => {
            const customer = profiles?.find((item) => item.id === request.customer_id);
            const account = accounts?.find((item) => item.id === request.account_id);
            return <div key={request.id} className="rounded-2xl border border-emerald-900/10 bg-white/75 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">{customer?.name || customer?.cic_no || "Customer"} wants {formatINR(request.amount)}</p>
                  <p className="text-sm text-emerald-700">{requestTypeLabel(request.request_type)}. Current balance: {formatINR(account?.balance)}</p>
                  <p className="mt-2 text-sm">{request.reason}</p>
                </div>
                <span className="badge">{statusLabel(request.status)}</span>
              </div>
              {request.status === "pending" ? (
                <ActionForm action={decideWithdrawalRequestAction} submitLabel="Save decision" className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]">
                  <input type="hidden" name="request_id" value={request.id} />
                  <select name="decision" className="input"><option value="approved">Approve</option><option value="rejected">Reject</option></select>
                  <input name="note" className="input sm:col-span-2" placeholder="Decision note" />
                </ActionForm>
              ) : <p className="mt-2 text-xs text-emerald-700">Decided {formatKolkataDate(request.decided_at)}</p>}
            </div>;
          })}
          {!requests?.length ? <p className="rounded-2xl bg-white/70 p-4 text-sm text-emerald-700">No withdrawal requests.</p> : null}
        </div>
      </section>
    </div>
  );
}
