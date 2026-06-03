import { HandCoins } from "lucide-react";
import { createWithdrawalRequestAction } from "@/app/actions/withdrawals";
import { ActionForm } from "@/components/action-form";
import { CopyButton } from "@/components/copy-button";
import { requireRole } from "@/lib/data";
import { requestTypeLabel, statusLabel } from "@/lib/labels";
import { formatINR, formatKolkataDate } from "@/lib/utils";

export const metadata = { title: "Withdrawals" };

export default async function CustomerWithdrawalsPage() {
  const { profile, supabase } = await requireRole(["customer"]);
  const [{ data: accounts }, { data: requests }] = await Promise.all([
    supabase.from("customer_accounts").select("*").eq("customer_id", profile.id).order("account_type"),
    supabase.from("withdrawal_requests").select("*").eq("customer_id", profile.id).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div><h1 className="section-title">Withdrawal Requests</h1><p className="section-subtitle">Use this page only for fixed full withdrawal, saving full withdrawal, or saving early withdrawal approvals.</p></div>
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="glass-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><HandCoins className="size-5 text-gold-600" /> New request</h2>
          <ActionForm action={createWithdrawalRequestAction} submitLabel="Submit request">
            <select className="input" name="account_id" required>
              <option value="">Select account</option>
              {accounts?.filter((account) => account.account_type !== "current").map((account) => <option key={account.id} value={account.id}>{account.account_type} - {formatINR(account.balance)}</option>)}
            </select>
            <select className="input" name="request_type"><option value="fixed_full">Fixed full withdrawal</option><option value="saving_full">Saving full withdrawal</option><option value="saving_early">Saving early withdrawal</option></select>
            <input className="input" name="amount" type="number" min="1" step="0.01" placeholder="Requested amount" />
            <textarea className="input min-h-24" name="reason" placeholder="Reason" />
          </ActionForm>
        </section>
        <section className="glass-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Request history</h2>
          <div className="space-y-3">
            {requests?.map((request) => {
              const account = accounts?.find((item) => item.id === request.account_id);
              return <div key={request.id} className="rounded-2xl bg-white/75 p-4"><div className="flex flex-wrap justify-between gap-3"><p className="font-semibold">{requestTypeLabel(request.request_type)}</p><span className="badge">{statusLabel(request.status)}</span></div><p className="mt-1 text-sm text-emerald-700">{account?.account_type || "Account"} - {formatINR(request.amount)} - {formatKolkataDate(request.created_at)}</p>{request.status === "approved" ? <div className="mt-2"><CopyButton value={request.id} label={`Approval ID: ${request.id}`} /></div> : null}<p className="mt-2 text-sm">{request.reason}</p></div>;
            })}
            {!requests?.length ? <p className="rounded-2xl bg-white/75 p-4 text-sm text-emerald-700">No withdrawal requests yet.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
