"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { withdrawalRequestSchema } from "@/lib/validations";

export async function createWithdrawalRequestAction(_: unknown, formData: FormData) {
  await requireRole(["customer"]);
  const parsed = withdrawalRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_withdrawal_request", {
    p_account_id: parsed.data.account_id,
    p_request_type: parsed.data.request_type,
    p_amount: parsed.data.amount,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/customer/withdrawals");
  return { ok: true, message: "Withdrawal request submitted." };
}

export async function decideWithdrawalRequestAction(_: unknown, formData: FormData) {
  await requireRole(["head"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_withdrawal_request", {
    p_request_id: String(formData.get("request_id")),
    p_decision: String(formData.get("decision")),
    p_note: String(formData.get("note") || ""),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/head/requests");
  return { ok: true, message: "Request updated." };
}

