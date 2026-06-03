import { Filter, HandCoins, Repeat } from "lucide-react";
import { convertCashAction, createIncomeAction } from "@/app/actions/transactions";
import { ActionForm } from "@/components/action-form";
import { IncomeExcelButton } from "@/components/excel-report-buttons";
import { MetricCard } from "@/components/metric-card";
import { incomeCategories } from "@/lib/constants";
import { requireRole } from "@/lib/data";
import { formatINR, formatKolkataDate } from "@/lib/utils";

export const metadata = { title: "Income" };

type IncomeRow = {
  id: string;
  created_at: string;
  entry_type: "credit" | "debit";
  category: string;
  method: "liquid" | "online";
  amount: number | string;
  note: string | null;
};

export default async function IncomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireRole(["manager"]);
  const params = await searchParams;
  const { data } = await supabase.from("income_transactions").select("*").order("created_at", { ascending: false });
  const search = (params.search ?? "").trim().toLowerCase();
  const rows = ((data ?? []) as IncomeRow[])
    .filter((row) => !params.category || row.category === params.category)
    .filter((row) => !params.method || row.method === params.method)
    .filter((row) => !params.type || row.entry_type === params.type)
    .filter((row) => !search || `${row.category} ${row.note ?? ""}`.toLowerCase().includes(search))
    .filter((row) => !params.from || row.created_at >= `${params.from}T00:00:00`)
    .filter((row) => !params.to || row.created_at <= `${params.to}T23:59:59`);
  const credit = rows.filter((row) => row.entry_type === "credit").reduce((sum, row) => sum + Number(row.amount), 0);
  const debit = rows.filter((row) => row.entry_type === "debit").reduce((sum, row) => sum + Number(row.amount), 0);
  const liquid = rows.reduce((sum, row) => sum + (row.method === "liquid" ? (row.entry_type === "credit" ? Number(row.amount) : -Number(row.amount)) : 0), 0);
  const online = rows.reduce((sum, row) => sum + (row.method === "online" ? (row.entry_type === "credit" ? Number(row.amount) : -Number(row.amount)) : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="section-title">Income Bank</h1><p className="section-subtitle">Service charges and other income remain separate from customer deposits and withdrawals.</p></div>
        <IncomeExcelButton rows={rows.map((row) => ({
          id: row.id,
          created_at: row.created_at,
          entry_type: row.entry_type,
          category: row.category,
          method: row.method,
          amount: Number(row.amount),
          note: row.note || "",
        }))} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Income credited" value={credit} icon={HandCoins} />
        <MetricCard label="Income debited" value={debit} icon={HandCoins} tone="red" />
        <MetricCard label="Income balance" value={credit - debit} icon={HandCoins} tone="gold" />
        <MetricCard label="Liquid income balance" value={liquid} icon={HandCoins} />
        <MetricCard label="Online income balance" value={online} icon={HandCoins} tone="gold" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="space-y-5">
          <div className="glass-card p-5">
            <h2 className="mb-4 text-lg font-semibold">New entry</h2>
            <ActionForm action={createIncomeAction} submitLabel="Save entry">
              <label className="field-label">Entry type
                <select className="input" name="entry_type"><option value="credit">Credit</option><option value="debit">Debit / expense</option></select>
              </label>
              <label className="field-label">Category
                <select className="input" name="category">{incomeCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
              </label>
              <label className="field-label">Method
                <select className="input" name="method"><option value="liquid">Liquid</option><option value="online">Online</option></select>
              </label>
              <label className="field-label">Amount
                <input className="input" name="amount" type="number" min="1" step="0.01" placeholder="Amount" />
              </label>
              <label className="field-label">Note
                <textarea className="input min-h-24" name="note" placeholder="Note" />
              </label>
            </ActionForm>
          </div>
          <div className="glass-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Repeat className="size-5 text-gold-600" /> Convert liquid / online</h2>
            <p className="mb-4 text-sm text-emerald-700">Conversion changes method balance only; it does not change income credited or income debited totals.</p>
            <ActionForm action={convertCashAction} submitLabel="Convert" className="grid gap-3 sm:grid-cols-2">
              <select className="input" name="from_method"><option value="liquid">Liquid</option><option value="online">Online</option></select>
              <select className="input" name="to_method"><option value="online">Online</option><option value="liquid">Liquid</option></select>
              <input className="input" name="amount" type="number" min="1" step="0.01" placeholder="Amount" />
              <input className="input" name="note" placeholder="Note" defaultValue="Income method conversion" />
            </ActionForm>
          </div>
        </section>
        <section className="glass-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Income history</h2>
          <form className="mb-4 grid gap-3 md:grid-cols-3">
            <input className="input" name="search" placeholder="Search income" defaultValue={params.search ?? ""} />
            <select className="input" name="category" defaultValue={params.category ?? ""}><option value="">All categories</option>{incomeCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
            <select className="input" name="method" defaultValue={params.method ?? ""}><option value="">All methods</option><option value="liquid">Liquid</option><option value="online">Online</option></select>
            <select className="input" name="type" defaultValue={params.type ?? ""}><option value="">All types</option><option value="credit">Credit</option><option value="debit">Debit</option></select>
            <input className="input" name="from" type="date" defaultValue={params.from ?? ""} />
            <input className="input" name="to" type="date" defaultValue={params.to ?? ""} />
            <button className="btn-primary md:col-span-3"><Filter className="size-4" /> Filter income</button>
          </form>
          <div className="mobile-list md:hidden">
            {rows.map((row) => (
              <article className="mobile-record" key={row.id}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-emerald-950">{row.category}</h3>
                    <p className="text-xs text-emerald-600">{formatKolkataDate(row.created_at)}</p>
                  </div>
                  <p className={row.entry_type === "debit" ? "font-semibold text-red-700" : "font-semibold text-emerald-700"}>{formatINR(row.amount)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="badge">{row.entry_type}</span>
                  <span className="badge">{row.method}</span>
                </div>
                {row.note ? <p className="mt-3 rounded-xl bg-white/80 p-3 text-sm text-emerald-700">{row.note}</p> : null}
              </article>
            ))}
            {!rows.length ? <div className="mobile-record text-sm text-emerald-700">No income entries found.</div> : null}
          </div>
          <div className="table-wrap hidden md:block"><table className="ledger-table"><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Method</th><th>Amount</th><th>Note</th></tr></thead><tbody>
            {rows.map((row) => <tr key={row.id}><td>{formatKolkataDate(row.created_at)}</td><td>{row.entry_type}</td><td>{row.category}</td><td>{row.method}</td><td>{formatINR(row.amount)}</td><td>{row.note}</td></tr>)}
            {!rows.length ? <tr><td colSpan={6}>No income entries found.</td></tr> : null}
          </tbody></table></div>
        </section>
      </div>
    </div>
  );
}
