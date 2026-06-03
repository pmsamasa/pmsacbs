import Link from "next/link";
import { ArrowRight, Repeat } from "lucide-react";
import { convertCashAction } from "@/app/actions/transactions";
import { ActionForm } from "@/components/action-form";
import { TransactionsExcelButton } from "@/components/excel-report-buttons";
import { TransactionForm } from "@/components/transaction-form";
import { requireRole } from "@/lib/data";
import { formatINR, formatKolkataDate } from "@/lib/utils";

export const metadata = { title: "Transactions" };

export default async function TransactionsPage() {
  const { supabase } = await requireRole(["manager"]);
  const [{ data: customers }, { data: transactions }, { data: conversions }] = await Promise.all([
    supabase.from("profiles").select("id,name,class_name,cic_no,customer_accounts(id,account_type,balance,opened_at)").eq("role", "customer").order("name"),
    supabase.from("transactions").select("*, profiles!transactions_customer_id_fkey(name,cic_no,class_name)").order("created_at", { ascending: false }).limit(5000),
    supabase.from("cash_conversions").select("*").order("created_at", { ascending: false }).limit(20),
  ]);
  const moneyTransactions = (transactions ?? []).filter((row) => row.transaction_type === "credit" || row.transaction_type === "debit");
  const liquidBase = moneyTransactions.reduce((sum, row) => sum + (row.method === "liquid" ? (row.transaction_type === "credit" ? Number(row.amount) : -Number(row.amount)) : 0), 0);
  const onlineBase = moneyTransactions.reduce((sum, row) => sum + (row.method === "online" ? (row.transaction_type === "credit" ? Number(row.amount) : -Number(row.amount)) : 0), 0);
  const liquidConversion = conversions?.reduce((sum, row) => sum + (row.to_method === "liquid" ? Number(row.amount) : row.from_method === "liquid" ? -Number(row.amount) : 0), 0) ?? 0;
  const onlineConversion = conversions?.reduce((sum, row) => sum + (row.to_method === "online" ? Number(row.amount) : row.from_method === "online" ? -Number(row.amount) : 0), 0) ?? 0;
  const liquid = liquidBase + liquidConversion;
  const online = onlineBase + onlineConversion;
  const monthKey = new Intl.DateTimeFormat("en-CA", { month: "2-digit", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date());
  const customersForForm = (customers ?? []).map((customer) => {
    const savingDebits = (transactions ?? []).filter((row) => {
      const rowMonth = new Intl.DateTimeFormat("en-CA", { month: "2-digit", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(row.created_at));
      return row.customer_id === customer.id && row.account_type === "saving" && row.transaction_type === "debit" && rowMonth === monthKey;
    });
    return {
      id: customer.id,
      name: customer.name,
      class_name: customer.class_name,
      cic_no: customer.cic_no,
      accounts: customer.customer_accounts ?? [],
      saving_debits_this_month: savingDebits.length,
      last_saving_debit_at: savingDebits[0]?.created_at ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title">Transactions</h1>
          <p className="section-subtitle">Credit and debit only between PMSA CBS and a selected student account.</p>
        </div>
        <TransactionsExcelButton
          transactions={(transactions ?? []).slice().reverse().map((row) => ({
            id: row.id,
            created_at: row.created_at,
            customer_id: row.customer_id,
            customer: row.profiles?.name || row.profiles?.cic_no || "Deleted customer",
            class_name: row.profiles?.class_name || "-",
            account_type: row.account_type,
            transaction_type: row.transaction_type,
            method: row.method,
            amount: Number(row.amount),
          }))}
          customers={(customers ?? []).map((customer) => ({
            id: customer.id,
            name: customer.name || customer.cic_no,
            class_name: customer.class_name || "-",
            accounts: (customer.customer_accounts ?? []).map((account) => ({
              account_type: account.account_type,
              balance: Number(account.balance),
            })),
          }))}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Post transaction</h2>
          <TransactionForm customers={customersForForm} />
        </section>
        <section className="space-y-5">
          <div className="glass-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Repeat className="size-5 text-gold-600" /> Convert liquid / online</h2>
            <div className="mb-4 grid gap-3">
              <div className="rounded-2xl bg-white/75 p-4">
                <p className="text-sm font-semibold text-emerald-700">Customer transaction position only</p>
                <p className="mt-1 text-xs text-emerald-600">Income money is not included here.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-900/10 bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">Liquid</p>
                  <p className="mt-1 text-xl font-semibold">{formatINR(liquid)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-900/10 bg-gold-100/60 p-4">
                  <p className="text-sm text-emerald-700">Online</p>
                  <p className="mt-1 text-xl font-semibold">{formatINR(online)}</p>
                </div>
              </div>
            </div>
            <ActionForm action={convertCashAction} submitLabel="Convert" className="grid gap-3 sm:grid-cols-2">
              <select className="input" name="from_method"><option value="liquid">Liquid</option><option value="online">Online</option></select>
              <select className="input" name="to_method"><option value="online">Online</option><option value="liquid">Liquid</option></select>
              <input className="input" name="amount" type="number" min="1" step="0.01" placeholder="Amount" />
              <input className="input" name="note" placeholder="Note" />
            </ActionForm>
          </div>
          <div className="glass-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Recent entries</h2>
              <Link href="/manager/transactions/all" className="btn-secondary">Full list <ArrowRight className="size-4" /></Link>
            </div>
            <div className="table-wrap">
              <table className="ledger-table">
                <thead><tr><th>Date</th><th>Customer</th><th>Account</th><th>Type</th><th>Method</th><th>Amount</th></tr></thead>
                <tbody>
                  {transactions?.map((row) => (
                    <tr key={row.id}><td>{formatKolkataDate(row.created_at)}</td><td>{row.profiles?.name || row.profiles?.cic_no}</td><td>{row.account_type}</td><td>{transactionTypeLabel(row.transaction_type)}</td><td>{row.transaction_type === "opening_balance" ? "carry forward" : row.method}</td><td>{formatINR(row.amount)}</td></tr>
                  ))}
                  {!transactions?.length ? <tr><td colSpan={6}>No transactions posted.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
          <div className="glass-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Conversion status</h2>
            <div className="table-wrap">
              <table className="ledger-table">
                <thead><tr><th>Date</th><th>From</th><th>To</th><th>Amount</th><th>Liquid after</th><th>Online after</th><th>Note</th></tr></thead>
                <tbody>
                  {conversions?.map((row) => <tr key={row.id}><td>{formatKolkataDate(row.created_at)}</td><td>{row.from_method}</td><td>{row.to_method}</td><td>{formatINR(row.amount)}</td><td>{formatINR(row.liquid_balance_after)}</td><td>{formatINR(row.online_balance_after)}</td><td>{row.note}</td></tr>)}
                  {!conversions?.length ? <tr><td colSpan={7}>No conversions yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function transactionTypeLabel(type: string) {
  if (type === "opening_balance") return "Opening balance carry-forward";
  return type;
}
