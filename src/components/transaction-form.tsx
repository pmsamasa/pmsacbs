"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { postTransactionAction } from "@/app/actions/transactions";
import { SubmitButton } from "@/components/submit-button";
import { formatINR } from "@/lib/utils";

type CustomerOption = {
  id: string;
  name: string | null;
  class_name?: string | null;
  cic_no: string;
  accounts: { id?: string; account_type: string; balance?: number | string; opened_at?: string | null }[];
  saving_debits_this_month?: number;
  last_saving_debit_at?: string | null;
};

type ActionState = { ok?: boolean; message?: string; data?: unknown };

export function TransactionForm({ customers }: { customers: CustomerOption[] }) {
  const router = useRouter();
  const confirmedSubmit = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useActionState(
    postTransactionAction as (state: ActionState, formData: FormData) => Promise<ActionState>,
    { ok: undefined, message: undefined },
  );
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const selected = useMemo(() => customers.find((customer) => customer.id === selectedCustomerId || customer.id === draft?.customer_id), [customers, draft, selectedCustomerId]);
  const nextSavingReset = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (state?.message) toast[state.ok ? "success" : "error"](state.message);
    if (state?.ok) {
      const timer = window.setTimeout(() => {
        setDraft(null);
        confirmedSubmit.current = false;
        router.refresh();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [router, state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4"
      onSubmit={(event) => {
        if (!confirmedSubmit.current) {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setDraft(Object.fromEntries(form) as Record<string, string>);
          return;
        }
        confirmedSubmit.current = false;
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="field-label">Customer
          <select name="customer_id" className="input" required value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name || "Unnamed customer"} {customer.class_name ? `- ${customer.class_name}` : ""}</option>
            ))}
          </select>
        </label>
        <label className="field-label">Account type
          <select name="account_type" className="input" required>
            <option value="saving">Saving</option>
            <option value="current">Current</option>
            <option value="fixed">Fixed</option>
          </select>
        </label>
        <label className="field-label">Transaction type
          <select name="transaction_type" className="input" required>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
        </label>
        <label className="field-label">Method
          <select name="method" className="input" required>
            <option value="liquid">Liquid</option>
            <option value="online">Online</option>
          </select>
        </label>
        <label className="field-label">Amount
          <input name="amount" className="input" type="number" min="1" step="0.01" required />
        </label>
        <label className="field-label">Approval request ID
          <input name="withdrawal_request_id" className="input" placeholder="Only for restricted withdrawals" />
        </label>
      </div>
      {selected ? (
        <div className="grid gap-3">
          {selected.accounts.map((account) => {
            const balance = Number(account.balance ?? 0);
            const savingLimit = Math.floor((balance / 3) * 100) / 100;
            const savingUsed = account.account_type === "saving" && Number(selected.saving_debits_this_month ?? 0) > 0;
            return (
              <div key={account.account_type} className="rounded-2xl border border-emerald-900/10 bg-white/80 p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Account method</p>
                    <p className="mt-1 text-lg font-semibold capitalize text-emerald-950">{account.account_type}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-4 py-3 sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Available balance</p>
                    <p className="mt-1 text-xl font-semibold text-emerald-950">{formatINR(balance)}</p>
                  </div>
                </div>
                {account.account_type === "saving" ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-emerald-600">Normal debit this month</p>
                      <p className="mt-1 font-semibold">{savingUsed ? "Not available" : "Available"}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-emerald-600">Normal debit limit</p>
                      <p className="mt-1 font-semibold">{formatINR(savingLimit)}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-emerald-600">{savingUsed ? "Next normal debit date" : "Approval note"}</p>
                      <p className="mt-1 font-semibold">{savingUsed ? nextSavingReset : "Above limit needs head approval"}</p>
                    </div>
                  </div>
                ) : account.account_type === "fixed" ? (
                  <p className="mt-4 rounded-xl bg-gold-100/70 p-3 text-sm font-medium text-emerald-800">Fixed account debit requires an approved head request before the manager can post it.</p>
                ) : (
                  <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Current account debit is allowed up to the available balance.</p>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
      <label className="field-label">Note
        <textarea name="note" className="input min-h-24" placeholder="Receipt number, reason, or context" />
      </label>
      <SubmitButton>Preview transaction</SubmitButton>

      {mounted && draft ? createPortal(
        <div className="fixed inset-0 z-50 grid place-items-center bg-emerald-950/55 p-4 backdrop-blur-sm">
          <div className="glass-card max-w-lg space-y-5 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 size-6 text-gold-500" />
              <div>
                <h2 className="text-lg font-semibold text-emerald-950">Confirm money movement</h2>
                <p className="mt-2 text-sm text-emerald-800">
                  You are about to {draft.transaction_type} {formatINR(draft.amount)} for {selected?.name || selected?.cic_no || "selected customer"} through {draft.method} {draft.transaction_type === "credit" ? "into" : "from"} {draft.account_type} account.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={() => setDraft(null)}>Review again</button>
              <button type="button" className="btn-primary" onClick={() => { confirmedSubmit.current = true; formRef.current?.requestSubmit(); }}>
                <CheckCircle2 className="size-4" /> Confirm and post
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </form>
  );
}
