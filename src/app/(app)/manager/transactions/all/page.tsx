import { requireRole } from "@/lib/data";
import { formatINR, formatKolkataDate } from "@/lib/utils";

export const metadata = { title: "All Transactions" };

export default async function AllTransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireRole(["manager"]);
  const params = await searchParams;
  let query = supabase
    .from("transactions")
    .select("*, profiles!transactions_customer_id_fkey(name,cic_no,class_name)")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (params.account_type) query = query.eq("account_type", params.account_type);
  if (params.method) query = query.eq("method", params.method);
  if (params.transaction_type) query = query.eq("transaction_type", params.transaction_type);
  if (params.from) query = query.gte("created_at", `${params.from}T00:00:00`);
  if (params.to) query = query.lte("created_at", `${params.to}T23:59:59`);
  const { data: rows } = await query;
  const search = (params.search ?? "").trim().toLowerCase();
  const filtered = (rows ?? []).filter((row) => !search || `${row.profiles?.name ?? ""} ${row.profiles?.cic_no ?? ""} ${row.note ?? ""}`.toLowerCase().includes(search));

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className="section-title">Full Transaction List</h1>
          <p className="section-subtitle">Detailed customer bank transactions in newest-to-oldest order with filters.</p>
        </div>
      </div>
      <form className="glass-card grid gap-3 p-4 md:grid-cols-4">
        <input className="input" name="search" placeholder="Search customer, CIC, note" defaultValue={params.search ?? ""} />
        <select className="input" name="account_type" defaultValue={params.account_type ?? ""}><option value="">All accounts</option><option value="saving">Saving</option><option value="current">Current</option><option value="fixed">Fixed</option></select>
        <select className="input" name="transaction_type" defaultValue={params.transaction_type ?? ""}><option value="">All types</option><option value="credit">Credit</option><option value="debit">Debit</option><option value="opening_balance">Opening balance carry-forward</option></select>
        <select className="input" name="method" defaultValue={params.method ?? ""}><option value="">All methods</option><option value="liquid">Liquid</option><option value="online">Online</option></select>
        <input className="input" type="date" name="from" defaultValue={params.from ?? ""} />
        <input className="input" type="date" name="to" defaultValue={params.to ?? ""} />
        <button className="btn-primary md:col-span-2">Apply filters</button>
      </form>
      <section className="glass-card p-5">
        <div className="mobile-list md:hidden">
          {filtered.map((row, index) => (
            <article className="mobile-record" key={row.id}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-600">SN {index + 1}</p>
                  <h3 className="mt-1 font-semibold text-emerald-950">{row.profiles?.name || row.profiles?.cic_no || "Deleted customer"}</h3>
                  <p className="text-xs text-emerald-600">{formatKolkataDate(row.created_at)}</p>
                </div>
                <p className={row.transaction_type === "debit" ? "text-right font-semibold text-red-700" : "text-right font-semibold text-emerald-700"}>{formatINR(row.amount)}</p>
              </div>
              <div className="space-y-2">
                <div className="mobile-record-row"><span className="mobile-record-label">Class</span><span className="mobile-record-value">{row.profiles?.class_name || "-"}</span></div>
                <div className="mobile-record-row"><span className="mobile-record-label">Account</span><span className="mobile-record-value">{row.account_type}</span></div>
                <div className="mobile-record-row"><span className="mobile-record-label">Type</span><span className="mobile-record-value">{transactionTypeLabel(row.transaction_type)}</span></div>
                <div className="mobile-record-row"><span className="mobile-record-label">Method</span><span className="mobile-record-value">{row.transaction_type === "opening_balance" ? "carry forward" : row.method}</span></div>
                <div className="mobile-record-row"><span className="mobile-record-label">Balance after</span><span className="mobile-record-value">{formatINR(row.balance_after)}</span></div>
                <div className="mobile-record-row"><span className="mobile-record-label">Note</span><span className="mobile-record-value">{row.note || "-"}</span></div>
              </div>
            </article>
          ))}
          {!filtered.length ? <div className="mobile-record text-sm text-emerald-700">No transactions found.</div> : null}
        </div>
        <div className="table-wrap hidden md:block">
          <table className="ledger-table">
            <thead><tr><th>SN</th><th>Date</th><th>Customer</th><th>Class</th><th>Account</th><th>Type</th><th>Method</th><th>Amount</th><th>Balance after</th><th>Note</th></tr></thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td>{formatKolkataDate(row.created_at)}</td>
                  <td>{row.profiles?.name || row.profiles?.cic_no || "Deleted customer"}</td>
                  <td>{row.profiles?.class_name || "-"}</td>
                  <td>{row.account_type}</td>
                  <td>{transactionTypeLabel(row.transaction_type)}</td>
                  <td>{row.transaction_type === "opening_balance" ? "carry forward" : row.method}</td>
                  <td>{formatINR(row.amount)}</td>
                  <td>{formatINR(row.balance_after)}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
              {!filtered.length ? <tr><td colSpan={10}>No transactions found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function transactionTypeLabel(type: string) {
  if (type === "opening_balance") return "Opening balance carry-forward";
  return type;
}
