import { HeadFullReportButton } from "@/components/head-full-report-button";
import { requireRole } from "@/lib/data";
import { formatINR, formatKolkataDate } from "@/lib/utils";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireRole(["head"]);
  const params = await searchParams;
  let query = supabase.from("transactions").select("*, profiles!transactions_customer_id_fkey(name,cic_no,class_name)").order("created_at", { ascending: false }).limit(5000);
  if (params.account_type) query = query.eq("account_type", params.account_type);
  if (params.method) query = query.eq("method", params.method);
  if (params.transaction_type) query = query.eq("transaction_type", params.transaction_type);
  const [{ data: rows }, { data: accounts }] = await Promise.all([
    query,
    supabase.from("customer_accounts").select("account_type,balance"),
  ]);
  const accountBalances = (accounts ?? []).reduce<Record<string, number>>((acc, account) => {
    acc[account.account_type] = (acc[account.account_type] ?? 0) + Number(account.balance);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="section-title">Reports</h1><p className="section-subtitle">Audit-ready filtered views for full PDF export.</p></div>
        <div className="flex gap-2">
          <HeadFullReportButton
            accountBalances={accountBalances}
            transactions={(rows ?? []).slice().reverse().map((row) => ({
              created_at: row.created_at,
              customer: row.profiles?.name || row.profiles?.cic_no || "Deleted customer",
              class_name: row.profiles?.class_name || "-",
              account_type: row.account_type,
              transaction_type: row.transaction_type,
              method: row.method,
              amount: Number(row.amount),
            }))}
          />
        </div>
      </div>
      <form className="glass-card grid gap-3 p-4 sm:grid-cols-4">
        <select className="input" name="account_type"><option value="">All accounts</option><option>saving</option><option>current</option><option>fixed</option></select>
        <select className="input" name="method"><option value="">All methods</option><option>liquid</option><option>online</option></select>
        <select className="input" name="transaction_type"><option value="">All types</option><option>credit</option><option>debit</option></select>
        <button className="btn-primary">Apply filters</button>
      </form>
      <section className="glass-card p-5">
        <div className="table-wrap"><table className="ledger-table"><thead><tr><th>Date</th><th>Customer</th><th>Class</th><th>Account</th><th>Type</th><th>Method</th><th>Amount</th></tr></thead><tbody>
          {rows?.map((row) => <tr key={row.id}><td>{formatKolkataDate(row.created_at)}</td><td>{row.profiles?.name || row.profiles?.cic_no}</td><td>{row.profiles?.class_name}</td><td>{row.account_type}</td><td>{row.transaction_type}</td><td>{row.method}</td><td>{formatINR(row.amount)}</td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}
