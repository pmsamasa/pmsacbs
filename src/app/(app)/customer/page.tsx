import { PiggyBank } from "lucide-react";
import { requireRole } from "@/lib/data";
import { MetricCard } from "@/components/metric-card";
import { StudentStatementButton } from "@/components/student-statement-button";
import { formatINR, formatKolkataDate } from "@/lib/utils";

export const metadata = { title: "My Accounts" };

export default async function CustomerDashboard() {
  const { profile, supabase } = await requireRole(["customer"]);
  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase.from("customer_accounts").select("*").eq("customer_id", profile.id).order("account_type"),
    supabase.from("transactions").select("*").eq("customer_id", profile.id).order("created_at", { ascending: true }),
  ]);
  const total = accounts?.reduce((sum, account) => sum + Number(account.balance), 0) ?? 0;
  const credit = transactions?.filter((row) => row.transaction_type === "credit").reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const debit = transactions?.filter((row) => row.transaction_type === "debit").reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const lastUpdate = transactions?.at(-1)?.created_at ?? new Date().toISOString();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title">My Accounts</h1>
          <p className="section-subtitle">Full history across all manager periods is shown for students.</p>
        </div>
        <StudentStatementButton
          studentName={profile.name || profile.cic_no}
          lastUpdate={lastUpdate}
          credit={credit}
          debit={debit}
          balance={total}
          transactions={(transactions ?? []).map((row) => ({
            id: row.id,
            created_at: row.created_at,
            account_type: row.account_type,
            transaction_type: row.transaction_type,
            method: row.method,
            amount: row.amount,
          }))}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total balance" value={total} icon={PiggyBank} />
        {accounts?.map((account) => <MetricCard key={account.id} label={`${account.account_type} account`} value={Number(account.balance)} icon={PiggyBank} tone="gold" />)}
      </div>
      <section className="glass-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Transaction history</h2>
        <div className="table-wrap">
          <table className="ledger-table">
            <thead><tr><th>Date</th><th>Account</th><th>Type</th><th>Method</th><th>Amount</th><th>Balance</th><th>Note</th></tr></thead>
            <tbody>
              {transactions?.map((row) => (
                <tr key={row.id}>
                  <td>{formatKolkataDate(row.created_at)}</td>
                  <td>{row.account_type}</td>
                  <td>{row.transaction_type}</td>
                  <td>{row.method}</td>
                  <td>{formatINR(row.amount)}</td>
                  <td>{formatINR(row.balance_after)}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
              {!transactions?.length ? <tr><td colSpan={7}>No account activity yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
