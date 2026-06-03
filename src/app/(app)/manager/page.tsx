import { Banknote, ReceiptText, TrendingDown, TrendingUp, UsersRound } from "lucide-react";
import { requireRole } from "@/lib/data";
import { MetricCard } from "@/components/metric-card";
import { formatINR, formatKolkataDate } from "@/lib/utils";

export const metadata = { title: "Manager Dashboard" };

export default async function ManagerDashboard() {
  const { supabase } = await requireRole(["manager"]);
  const [{ data: accounts }, { count: customers }, { data: transactions }, { data: transactionStats }, { data: period }] = await Promise.all([
    supabase.from("customer_accounts").select("balance"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("transactions").select("*, profiles!transactions_customer_id_fkey(name,cic_no)").order("created_at", { ascending: false }).limit(8),
    supabase.from("transactions").select("transaction_type,amount"),
    supabase.from("manager_periods").select("*").eq("is_active", true).maybeSingle(),
  ]);
  const customerBalance = accounts?.reduce((sum, account) => sum + Number(account.balance), 0) ?? 0;
  const credited = transactionStats?.filter((row) => row.transaction_type === "credit").reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const debited = transactionStats?.filter((row) => row.transaction_type === "debit").reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Manager Dashboard</h1>
        <p className="section-subtitle">Current active-period customer bank totals. Income money is kept on the separate income page.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Customer balance" value={customerBalance} icon={Banknote} />
        <MetricCard label="Customer credited" value={credited} icon={TrendingUp} tone="gold" />
        <MetricCard label="Customer debited" value={debited} icon={TrendingDown} tone="red" />
        <MetricCard label="Customers" value={String(customers ?? 0)} icon={UsersRound} tone="gold" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent transactions</h2>
            <ReceiptText className="size-5 text-gold-600" />
          </div>
          <div className="table-wrap">
            <table className="ledger-table">
              <thead><tr><th>Date</th><th>Customer</th><th>Account</th><th>Type</th><th>Amount</th></tr></thead>
              <tbody>
                {transactions?.map((row) => (
                  <tr key={row.id}>
                    <td>{formatKolkataDate(row.created_at)}</td>
                    <td>{row.profiles?.name || row.profiles?.cic_no}</td>
                    <td><span className="badge">{row.account_type}</span></td>
                    <td>{row.transaction_type}</td>
                    <td>{formatINR(row.amount)}</td>
                  </tr>
                ))}
                {!transactions?.length ? <tr><td colSpan={5}>No transactions yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
        <section className="glass-card p-5">
          <h2 className="text-lg font-semibold">Active manager period</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-emerald-700">Period</dt><dd className="font-semibold">{period?.name ?? "Not created"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-emerald-700">Opened</dt><dd>{formatKolkataDate(period?.started_at)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-emerald-700">Opening balance</dt><dd>{formatINR(period?.opening_total_balance ?? 0)}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
