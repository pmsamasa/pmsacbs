import { Banknote, ClipboardCheck, Clock, HandCoins, UsersRound } from "lucide-react";
import { requireRole } from "@/lib/data";
import { MetricCard } from "@/components/metric-card";
import { formatINR, formatKolkataDate } from "@/lib/utils";

export const metadata = { title: "Head Audit" };

export default async function HeadDashboard() {
  const { supabase } = await requireRole(["head"]);
  const [{ count: customers }, { count: pending }, { data: periods }, { data: auditLogs }, { data: accounts }, { data: income }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("manager_periods").select("*").order("started_at", { ascending: false }).limit(6),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("customer_accounts").select("balance"),
    supabase.from("income_transactions").select("entry_type,amount"),
  ]);
  const customerBalance = accounts?.reduce((sum, account) => sum + Number(account.balance), 0) ?? 0;
  const incomeBalance = income?.reduce((sum, row) => sum + (row.entry_type === "credit" ? Number(row.amount) : -Number(row.amount)), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Head Audit</h1>
        <p className="section-subtitle">Full system visibility for approvals, manager periods, balances, and audit trail.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Customer ledger balance" value={customerBalance} icon={Banknote} />
        <MetricCard label="Income balance" value={incomeBalance} icon={HandCoins} tone="gold" />
        <MetricCard label="Pending approvals" value={String(pending ?? 0)} icon={Clock} tone="gold" />
        <MetricCard label="Customers" value={String(customers ?? 0)} icon={UsersRound} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="glass-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><ClipboardCheck className="size-5 text-gold-600" /> Manager periods</h2>
          <div className="space-y-3">
            {periods?.map((period) => (
              <div key={period.id} className="rounded-2xl border border-emerald-900/10 bg-white/70 p-4">
                <div className="flex justify-between gap-3"><p className="font-semibold">{period.name}</p><span className="badge">{period.is_active ? "active" : "closed"}</span></div>
                <p className="mt-1 text-sm text-emerald-700">{formatKolkataDate(period.started_at)} to {period.ended_at ? formatKolkataDate(period.ended_at) : "Present"}</p>
                <p className="mt-2 text-sm">Closing: {formatINR(period.closing_total_balance ?? 0)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="glass-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Recent audit logs</h2>
          <div className="space-y-3">
            {auditLogs?.map((log) => (
              <div key={log.id} className="rounded-2xl bg-white/70 p-4 text-sm">
                <p className="font-semibold">{humanAuditAction(log.action)}</p>
                <p className="text-emerald-700">{formatKolkataDate(log.created_at)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function humanAuditAction(action: string) {
  const labels: Record<string, string> = {
    "customer.created": "Customer account created",
    "customer.updated": "Customer details updated",
    "customer.deleted": "Customer deleted after zero-balance check",
    "transaction.posted": "Customer transaction posted",
    "income.posted": "Income entry posted",
    "withdrawal.requested": "Withdrawal request submitted",
    "withdrawal.approved": "Withdrawal request approved",
    "withdrawal.rejected": "Withdrawal request rejected",
    "manager.handover": "Manager period handover completed",
    "cash.converted": "Liquid/online balance converted",
    "notification.broadcast": "Customer alert broadcast sent",
  };
  return labels[action] ?? action.replaceAll(".", " ");
}
