import { Banknote, TrendingDown, TrendingUp, UserRound } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { requireRole } from "@/lib/data";
import { formatINR, formatKolkataDate } from "@/lib/utils";

export const metadata = { title: "Individual Ledger" };

export default async function IndividualPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireRole(["manager"]);
  const params = await searchParams;
  const [{ data: customers }, { data: selectedProfile }] = await Promise.all([
    supabase.from("profiles").select("id,name,cic_no,class_name").eq("role", "customer").order("name"),
    params.customer_id ? supabase.from("profiles").select("id,name,cic_no,class_name").eq("id", params.customer_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const selectedId = params.customer_id || customers?.[0]?.id || "";
  const [{ data: accounts }, { data: transactions }] = selectedId
    ? await Promise.all([
      supabase.from("customer_accounts").select("*").eq("customer_id", selectedId).order("account_type"),
      supabase.from("transactions").select("*").eq("customer_id", selectedId).order("created_at", { ascending: true }),
    ])
    : [{ data: [] }, { data: [] }];
  const profile = selectedProfile || customers?.find((customer) => customer.id === selectedId);
  const credited = transactions?.filter((row) => row.transaction_type === "credit").reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const debited = transactions?.filter((row) => row.transaction_type === "debit").reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const balance = accounts?.reduce((sum, account) => sum + Number(account.balance), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Individual Bank</h1>
        <p className="section-subtitle">Select one customer to view account balances, credit/debit totals, and full transaction history.</p>
      </div>
      <form className="glass-card grid gap-3 p-4 md:grid-cols-[1fr_auto]">
        <select className="input" name="customer_id" defaultValue={selectedId}>
          {customers?.map((customer) => <option key={customer.id} value={customer.id}>{customer.name || "Unnamed customer"} - {customer.class_name || "No class"}</option>)}
        </select>
        <button className="btn-primary">Show individual</button>
      </form>
      {selectedId ? (
        <>
          <section className="glass-card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{profile?.name || profile?.cic_no}</h2>
                <p className="text-sm text-emerald-700">{profile?.class_name || "No class"} | CIC {profile?.cic_no}</p>
              </div>
              <UserRound className="size-8 text-gold-600" />
            </div>
          </section>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total balance" value={balance} icon={Banknote} />
            <MetricCard label="Total credited" value={credited} icon={TrendingUp} tone="gold" />
            <MetricCard label="Total debited" value={debited} icon={TrendingDown} tone="red" />
            <MetricCard label="Transaction count" value={String(transactions?.length ?? 0)} icon={Banknote} />
          </div>
          <section className="grid gap-4 md:grid-cols-3">
            {accounts?.map((account) => {
              const accountRows = transactions?.filter((row) => row.account_type === account.account_type) ?? [];
              const accountCredit = accountRows.filter((row) => row.transaction_type === "credit").reduce((sum, row) => sum + Number(row.amount), 0);
              const accountDebit = accountRows.filter((row) => row.transaction_type === "debit").reduce((sum, row) => sum + Number(row.amount), 0);
              return (
                <div className="glass-card p-5" key={account.id}>
                  <h3 className="text-lg font-semibold capitalize">{account.account_type}</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-emerald-700">Balance</dt><dd className="font-semibold">{formatINR(account.balance)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-emerald-700">Credited</dt><dd>{formatINR(accountCredit)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-emerald-700">Debited</dt><dd>{formatINR(accountDebit)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-emerald-700">Entries</dt><dd>{accountRows.length}</dd></div>
                  </dl>
                </div>
              );
            })}
          </section>
          <section className="glass-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Full transaction history</h2>
            <div className="mobile-list md:hidden">
              {transactions?.map((row, index) => (
                <article className="mobile-record" key={row.id}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-emerald-600">SN {index + 1}</p>
                      <h3 className="mt-1 font-semibold text-emerald-950">{transactionTypeLabel(row.transaction_type)}</h3>
                      <p className="text-xs text-emerald-600">{formatKolkataDate(row.created_at)}</p>
                    </div>
                    <p className={row.transaction_type === "debit" ? "font-semibold text-red-700" : "font-semibold text-emerald-700"}>{formatINR(row.amount)}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="mobile-record-row"><span className="mobile-record-label">Account</span><span className="mobile-record-value">{row.account_type}</span></div>
                    <div className="mobile-record-row"><span className="mobile-record-label">Method</span><span className="mobile-record-value">{row.transaction_type === "opening_balance" ? "carry forward" : row.method}</span></div>
                    <div className="mobile-record-row"><span className="mobile-record-label">Balance after</span><span className="mobile-record-value">{formatINR(row.balance_after)}</span></div>
                    <div className="mobile-record-row"><span className="mobile-record-label">Note</span><span className="mobile-record-value">{row.note || "-"}</span></div>
                  </div>
                </article>
              ))}
              {!transactions?.length ? <div className="mobile-record text-sm text-emerald-700">No transactions for this customer.</div> : null}
            </div>
            <div className="table-wrap hidden md:block">
              <table className="ledger-table">
                <thead><tr><th>SN</th><th>Date</th><th>Account</th><th>Type</th><th>Method</th><th>Amount</th><th>Balance after</th><th>Note</th></tr></thead>
                <tbody>
                  {transactions?.map((row, index) => <tr key={row.id}><td>{index + 1}</td><td>{formatKolkataDate(row.created_at)}</td><td>{row.account_type}</td><td>{transactionTypeLabel(row.transaction_type)}</td><td>{row.transaction_type === "opening_balance" ? "carry forward" : row.method}</td><td>{formatINR(row.amount)}</td><td>{formatINR(row.balance_after)}</td><td>{row.note}</td></tr>)}
                  {!transactions?.length ? <tr><td colSpan={8}>No transactions for this customer.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : <div className="glass-card p-6 text-sm text-emerald-700">No customers available.</div>}
    </div>
  );
}

function transactionTypeLabel(type: string) {
  if (type === "opening_balance") return "Opening balance carry-forward";
  return type;
}
