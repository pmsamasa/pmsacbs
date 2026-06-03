import { Filter, UserPlus, WalletCards } from "lucide-react";
import {
  addAccountAction,
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
} from "@/app/actions/customers";
import { ActionForm } from "@/components/action-form";
import { BulkClassTools } from "@/components/bulk-class-tools";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { classOptions } from "@/lib/constants";
import { requireRole } from "@/lib/data";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "Customers" };

type AccountSummary = { id: string; account_type: string; balance: number | string };
type CustomerSummary = {
  id: string;
  name: string | null;
  cic_no: string;
  class_name: string | null;
  customer_accounts?: AccountSummary[];
};

const accountFilters = [
  ["", "All account systems"],
  ["saving", "Saving only"],
  ["current", "Current only"],
  ["fixed", "Fixed only"],
  ["saving,current", "Saving + Current"],
  ["saving,fixed", "Saving + Fixed"],
  ["current,fixed", "Current + Fixed"],
  ["saving,current,fixed", "All three accounts"],
];

function inputDateTimeNow() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function customerTotal(customer: CustomerSummary) {
  return customer.customer_accounts?.reduce((sum, account) => sum + Number(account.balance), 0) ?? 0;
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireRole(["manager"]);
  const params = await searchParams;
  const { data } = await supabase.from("profiles").select("*, customer_accounts(*)").eq("role", "customer");
  const search = (params.search ?? "").trim().toLowerCase();
  const accountFilter = params.accounts ?? "";
  const selectedAccounts = accountFilter ? accountFilter.split(",").sort().join(",") : "";
  const sort = params.sort ?? "created_desc";
  const customers = ((data ?? []) as CustomerSummary[])
    .filter((customer) => !params.class || customer.class_name === params.class)
    .filter((customer) => !search || `${customer.name ?? ""} ${customer.cic_no}`.toLowerCase().includes(search))
    .filter((customer) => {
      if (!selectedAccounts) return true;
      const accounts = (customer.customer_accounts ?? []).map((account) => account.account_type).sort().join(",");
      return accounts === selectedAccounts;
    })
    .sort((a, b) => {
      if (sort === "total_asc") return customerTotal(a) - customerTotal(b);
      if (sort === "total_desc") return customerTotal(b) - customerTotal(a);
      if (sort === "cic_asc") return a.cic_no.localeCompare(b.cic_no);
      if (sort === "cic_desc") return b.cic_no.localeCompare(a.cic_no);
      return b.cic_no.localeCompare(a.cic_no);
    });
  const now = inputDateTimeNow();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Customer Management</h1>
        <p className="section-subtitle">Create student logins using CIC numbers, open account types, and keep service charges separate in income.</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><UserPlus className="size-5 text-gold-600" /> Add customer</h2>
          <ActionForm action={createCustomerAction} submitLabel="Create customer">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field-label">CIC number<input className="input" name="cic_no" required /></label>
              <label className="field-label">Name<input className="input" name="name" /></label>
              <label className="field-label">Class
                <select className="input" name="class_name">
                  <option value="">Select class</option>
                  {classOptions.map((className) => <option key={className} value={className}>{className}</option>)}
                </select>
              </label>
              <label className="field-label">Phone<input className="input" name="phone" /></label>
              <label className="field-label sm:col-span-2">Optional email<input className="input" name="email" type="email" /></label>
              <label className="field-label">Service charge per account
                <input className="input" name="service_charge" type="number" min="0" step="0.01" defaultValue="20" />
              </label>
              <label className="field-label">Service charge method
                <select className="input" name="service_charge_method"><option value="liquid">Liquid</option><option value="online">Online</option></select>
              </label>
              <label className="field-label sm:col-span-2">Opening date and time
                <input className="input" name="opened_at" type="datetime-local" defaultValue={now} />
              </label>
            </div>
            <p className="rounded-2xl bg-gold-100/70 p-3 text-sm font-medium text-emerald-900">
              Service charge is applied separately for each selected account. Example: if you select three account types and enter ₹20, the total service charge income will be ₹60.
            </p>
            <fieldset className="grid gap-2 rounded-2xl border border-emerald-900/10 p-4">
              <legend className="px-2 text-sm font-semibold text-emerald-800">Account types</legend>
              {["saving", "current", "fixed"].map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm"><input type="checkbox" name="account_types" value={type} /> {type}</label>
              ))}
            </fieldset>
          </ActionForm>
        </section>
        <section className="glass-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><WalletCards className="size-5 text-gold-600" /> Customers</h2>
          <div className="mb-5 grid gap-4 rounded-2xl border border-emerald-900/10 bg-white/70 p-4">
            <h3 className="font-semibold">Open another account</h3>
            <ActionForm action={addAccountAction} submitLabel="Open account" className="grid gap-3 sm:grid-cols-3">
              <select className="input sm:col-span-2" name="customer_id" required><option value="">Customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name || customer.cic_no}</option>)}</select>
              <select className="input" name="account_type"><option value="saving">Saving</option><option value="current">Current</option><option value="fixed">Fixed</option></select>
              <input className="input" name="service_charge" type="number" min="0" step="0.01" defaultValue="20" />
              <select className="input" name="service_charge_method"><option value="liquid">Liquid</option><option value="online">Online</option></select>
              <input className="input" name="opened_at" type="datetime-local" defaultValue={now} />
            </ActionForm>
          </div>
          <form className="mb-4 grid gap-3 rounded-2xl border border-emerald-900/10 bg-white/65 p-4 md:grid-cols-5">
            <input className="input" name="search" placeholder="Search name or CIC" defaultValue={params.search ?? ""} />
            <select className="input" name="class" defaultValue={params.class ?? ""}><option value="">All classes</option>{classOptions.map((className) => <option key={className} value={className}>{className}</option>)}</select>
            <select className="input" name="accounts" defaultValue={params.accounts ?? ""}>{accountFilters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select className="input" name="sort" defaultValue={sort}><option value="total_desc">Total high to low</option><option value="total_asc">Total low to high</option><option value="cic_asc">CIC low to high</option><option value="cic_desc">CIC high to low</option></select>
            <button className="btn-primary"><Filter className="size-4" /> Filter</button>
          </form>
          <div className="table-wrap">
            <table className="ledger-table">
              <thead><tr><th>SN</th><th>Name</th><th>CIC</th><th>Class</th><th>Accounts</th><th>Total</th><th>Actions</th></tr></thead>
              <tbody>
                {customers.map((customer, index) => {
                  const total = customerTotal(customer);
                  return (
                    <tr key={customer.id}>
                      <td>{index + 1}</td>
                      <td>
                        <ActionForm action={updateCustomerAction} submitLabel="Save" className="grid min-w-52 gap-2">
                          <input type="hidden" name="customer_id" value={customer.id} />
                          <input className="input" name="name" defaultValue={customer.name ?? ""} placeholder="Name" />
                          <select className="input" name="class_name" defaultValue={customer.class_name ?? ""}><option value="">Class</option>{classOptions.map((className) => <option key={className} value={className}>{className}</option>)}</select>
                        </ActionForm>
                      </td>
                      <td>{customer.cic_no}</td>
                      <td>{customer.class_name || "-"}</td>
                      <td>
                        <div className="flex flex-col items-start gap-1">
                          {customer.customer_accounts?.map((account) => <span className="badge" key={account.id}>{account.account_type}</span>)}
                        </div>
                      </td>
                      <td>{formatINR(total)}</td>
                      <td>
                        <ConfirmActionForm action={deleteCustomerAction} confirmation={`DELETE ${customer.id}`} buttonLabel="Delete" title={`Delete ${customer.name || customer.cic_no}`} disabled={total > 0} danger>
                          <input type="hidden" name="customer_id" value={customer.id} />
                        </ConfirmActionForm>
                      </td>
                    </tr>
                  );
                })}
                {!customers.length ? <tr><td colSpan={7}>No customers found.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <div className="mt-5 grid gap-4 rounded-2xl border border-emerald-900/10 bg-white/70 p-4">
            <BulkClassTools classes={classOptions} defaultClass={params.class ?? ""} />
          </div>
        </section>
      </div>
    </div>
  );
}
