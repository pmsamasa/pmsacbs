import { Repeat } from "lucide-react";
import { handoverManagerAction } from "@/app/actions/handover";
import { ActionForm } from "@/components/action-form";
import { requireRole } from "@/lib/data";
import { formatINR, formatKolkataDate } from "@/lib/utils";

export const metadata = { title: "Manager Handover" };

export default async function HandoverPage() {
  const { supabase } = await requireRole(["manager", "head"]);
  const [{ data: periods }, { data: cash }, { data: transactions }, { data: income }] = await Promise.all([
    supabase.from("manager_periods").select("*").order("started_at", { ascending: false }),
    supabase.from("bank_cash_positions").select("*").eq("id", 1).maybeSingle(),
    supabase.from("transactions").select("transaction_type,amount"),
    supabase.from("income_transactions").select("entry_type,amount"),
  ]);
  const active = periods?.find((period) => period.is_active);
  const totalCredited = transactions?.filter((row) => row.transaction_type === "credit").reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const totalDebited = transactions?.filter((row) => row.transaction_type === "debit").reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const incomeCredited = income?.filter((row) => row.entry_type === "credit").reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const incomeDebited = income?.filter((row) => row.entry_type === "debit").reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div><h1 className="section-title">Manager Handover</h1><p className="section-subtitle">The bank manager can close the current period, generate the backup summary, and start the new manager period.</p></div>
      <section className="glass-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Repeat className="size-5 text-gold-600" /> Handover options</h2>
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white/70 p-4"><p className="text-sm text-emerald-700">Active period</p><p className="font-semibold">{active?.name ?? "Not created"}</p></div>
          <div className="rounded-2xl bg-white/70 p-4"><p className="text-sm text-emerald-700">Customer credit/debit</p><p className="font-semibold">{formatINR(totalCredited)} / {formatINR(totalDebited)}</p></div>
          <div className="rounded-2xl bg-white/70 p-4"><p className="text-sm text-emerald-700">Income credit/debit</p><p className="font-semibold">{formatINR(incomeCredited)} / {formatINR(incomeDebited)}</p></div>
          <div className="rounded-2xl bg-white/70 p-4"><p className="text-sm text-emerald-700">Liquid balance</p><p className="font-semibold">{formatINR(cash?.liquid_balance ?? 0)}</p></div>
          <div className="rounded-2xl bg-white/70 p-4"><p className="text-sm text-emerald-700">Online balance</p><p className="font-semibold">{formatINR(cash?.online_balance ?? 0)}</p></div>
          <div className="rounded-2xl bg-white/70 p-4"><p className="text-sm text-emerald-700">Closing total</p><p className="font-semibold">{formatINR(Number(cash?.liquid_balance ?? 0) + Number(cash?.online_balance ?? 0))}</p></div>
        </div>
        <div className="mb-4 rounded-2xl bg-gold-100/70 p-4 text-sm text-emerald-900">
          Enter the next manager details here. If the manager account already exists with the same email or CIC number, the system will use that account. If not, it will create the new manager login and then complete the handover.
        </div>
        <ActionForm action={handoverManagerAction} submitLabel="Generate backup and hand over" className="grid gap-4">
          <fieldset className="grid gap-3 rounded-2xl border border-emerald-900/10 bg-white/70 p-4 sm:grid-cols-2">
            <legend className="px-2 text-sm font-semibold text-emerald-800">Next period</legend>
            <label className="field-label sm:col-span-2">Next manager period name
              <input className="input" name="new_period_name" placeholder="Example: 2026-2027 or AL CBS 2026-2027" required />
            </label>
          </fieldset>
          <fieldset className="grid gap-3 rounded-2xl border border-emerald-900/10 bg-white/70 p-4 sm:grid-cols-2">
            <legend className="px-2 text-sm font-semibold text-emerald-800">Next bank manager details</legend>
            <label className="field-label">Manager name
              <input className="input" name="new_manager_name" placeholder="Full name" required />
            </label>
            <label className="field-label">Manager CIC number
              <input className="input" name="new_manager_cic_no" placeholder="CIC number" required />
            </label>
            <label className="field-label">Class
              <input className="input" name="new_manager_class" placeholder="Class" />
            </label>
            <label className="field-label">Phone
              <input className="input" name="new_manager_phone" placeholder="Phone number" />
            </label>
            <label className="field-label">Login email
              <input className="input" name="new_manager_email" type="email" placeholder="manager@example.com" required />
            </label>
            <label className="field-label">Temporary password
              <input className="input" name="new_manager_password" type="password" placeholder="Minimum 6 characters" required />
            </label>
          </fieldset>
        </ActionForm>
        <p className="mt-3 text-sm text-emerald-700">This creates a generated backup record, closes the current manager period, opens the new period, and carries opening balances forward.</p>
      </section>
      <section className="glass-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Period history</h2>
        <div className="table-wrap"><table className="ledger-table"><thead><tr><th>Name</th><th>Status</th><th>Started</th><th>Ended</th><th>Opening</th><th>Closing</th><th>Transactions</th></tr></thead><tbody>
          {periods?.map((period) => <tr key={period.id}><td>{period.name}</td><td><span className="badge">{period.is_active ? "active" : "closed"}</span></td><td>{formatKolkataDate(period.started_at)}</td><td>{formatKolkataDate(period.ended_at)}</td><td>{formatINR(period.opening_total_balance)}</td><td>{formatINR(period.closing_total_balance)}</td><td>{period.transaction_count}</td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}
