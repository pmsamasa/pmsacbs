"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/data";
import { sendPushToUsers } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";
import { conversionSchema, incomeSchema, transactionSchema } from "@/lib/validations";

export async function postTransactionAction(_: unknown, formData: FormData) {
  await requireRole(["manager"]);
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid transaction." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("post_customer_transaction", {
    p_customer_id: parsed.data.customer_id,
    p_account_type: parsed.data.account_type,
    p_transaction_type: parsed.data.transaction_type,
    p_method: parsed.data.method,
    p_amount: parsed.data.amount,
    p_note: parsed.data.note || null,
    p_withdrawal_request_id: parsed.data.withdrawal_request_id || null,
  });

  if (error) return { ok: false, message: error.message };
  await sendPushToUsers([parsed.data.customer_id], {
    title: "CBS MASA transaction posted",
    body: `${parsed.data.transaction_type === "credit" ? "Credited" : "Debited"} ₹${Number(parsed.data.amount).toLocaleString("en-IN")} in your ${parsed.data.account_type} account.`,
    url: "/customer",
  });
  revalidatePath("/manager");
  revalidatePath("/manager/transactions");
  return { ok: true, message: "Transaction posted successfully.", data };
}

export async function convertCashAction(_: unknown, formData: FormData) {
  await requireRole(["manager"]);
  const parsed = conversionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid conversion." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("convert_bank_cash", {
    p_from_method: parsed.data.from_method,
    p_to_method: parsed.data.to_method,
    p_amount: parsed.data.amount,
    p_note: parsed.data.note || null,
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/manager");
  revalidatePath("/manager/income");
  revalidatePath("/manager/transactions");
  return { ok: true, message: "Cash position converted successfully." };
}

export async function createIncomeAction(_: unknown, formData: FormData) {
  await requireRole(["manager"]);
  const parsed = incomeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid income entry." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("post_income_transaction", {
    p_entry_type: parsed.data.entry_type,
    p_category: parsed.data.category,
    p_amount: parsed.data.amount,
    p_method: parsed.data.method,
    p_note: parsed.data.note || null,
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/manager/income");
  return { ok: true, message: "Income bank updated." };
}
