"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/data";
import { bulkClassSchema, customerCreateSchema, customerDeleteSchema, customerUpdateSchema } from "@/lib/validations";

function toIsoDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function createCustomerAction(_: unknown, formData: FormData) {
  await requireRole(["manager", "head"]);
  const supabase = await createClient();
  const accountTypes = formData.getAll("account_types").map(String);
  const parsed = customerCreateSchema.safeParse({
    ...Object.fromEntries(formData),
    account_types: accountTypes,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid customer details." };

  const admin = createAdminClient();
  const cic = parsed.data.cic_no.toUpperCase();
  const tempPassword = `PMSA-${cic}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const email = `${cic}@pmsa.com`;

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { cic_no: cic, role: "customer" },
  });
  if (authError) return { ok: false, message: authError.message };
  if (!created.user) return { ok: false, message: "Customer auth user was not created." };

  const { error } = await supabase.rpc("create_customer_profile_with_accounts", {
    p_user_id: created.user.id,
    p_cic_no: cic,
    p_name: parsed.data.name || null,
    p_class_name: parsed.data.class_name || null,
    p_phone: parsed.data.phone || null,
    p_email: parsed.data.email || email,
    p_account_types: parsed.data.account_types,
    p_service_charge: parsed.data.service_charge,
    p_service_charge_method: parsed.data.service_charge_method,
    p_opened_at: toIsoDateTime(parsed.data.opened_at),
  });

  if (error) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, message: error.message };
  }

  revalidatePath("/manager/customers");
  return { ok: true, message: `Customer created. Login: ${email}, temporary password: ${tempPassword}` };
}

export async function addAccountAction(_: unknown, formData: FormData) {
  await requireRole(["manager", "head"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("open_customer_account", {
    p_customer_id: String(formData.get("customer_id")),
    p_account_type: String(formData.get("account_type")),
    p_service_charge: Number(formData.get("service_charge") ?? 0),
    p_service_charge_method: String(formData.get("service_charge_method") ?? "liquid"),
    p_opened_at: toIsoDateTime(String(formData.get("opened_at") || new Date().toISOString())),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/manager/customers");
  return { ok: true, message: "Account opened successfully." };
}

export async function updateCustomerAction(_: unknown, formData: FormData) {
  await requireRole(["manager", "head"]);
  const parsed = customerUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid customer update." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_customer_basic", {
    p_customer_id: parsed.data.customer_id,
    p_name: parsed.data.name || null,
    p_class_name: parsed.data.class_name || null,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/manager/customers");
  return { ok: true, message: "Customer details updated." };
}

export async function deleteCustomerAction(_: unknown, formData: FormData) {
  await requireRole(["manager", "head"]);
  const parsed = customerDeleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid delete request." };
  const expected = `DELETE ${parsed.data.customer_id}`;
  if (parsed.data.confirmation !== expected) return { ok: false, message: `Type ${expected} to confirm deletion.` };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_customer_if_zero", { p_customer_id: parsed.data.customer_id });
  if (error) return { ok: false, message: error.message };

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(parsed.data.customer_id);
  revalidatePath("/manager/customers");
  return { ok: true, message: "Customer and linked bank records were deleted." };
}

export async function bulkDeleteClassAction(_: unknown, formData: FormData) {
  await requireRole(["manager", "head"]);
  const className = String(formData.get("from_class") || "");
  const confirmation = String(formData.get("confirmation") || "");
  const expected = `DELETE CLASS ${className}`;
  if (!className || confirmation !== expected) return { ok: false, message: `Type ${expected} to confirm bulk deletion.` };

  const supabase = await createClient();
  const { data: customers, error: readError } = await supabase.from("profiles").select("id").eq("role", "customer").eq("class_name", className);
  if (readError) return { ok: false, message: readError.message };
  for (const customer of customers ?? []) {
    const { error } = await supabase.rpc("delete_customer_if_zero", { p_customer_id: customer.id });
    if (error) return { ok: false, message: error.message };
    await createAdminClient().auth.admin.deleteUser(customer.id);
  }
  revalidatePath("/manager/customers");
  return { ok: true, message: `Deleted ${customers?.length ?? 0} zero-balance customers from ${className}.` };
}

export async function bulkConvertClassAction(_: unknown, formData: FormData) {
  await requireRole(["manager", "head"]);
  const parsed = bulkClassSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Select valid classes." };
  const expected = `MOVE ${parsed.data.from_class} TO ${parsed.data.to_class}`;
  if (parsed.data.confirmation !== expected) return { ok: false, message: `Type ${expected} to confirm class conversion.` };

  const supabase = await createClient();
  const { error } = await supabase.rpc("bulk_update_customer_class", {
    p_from_class: parsed.data.from_class,
    p_to_class: parsed.data.to_class,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/manager/customers");
  return { ok: true, message: `Students moved from ${parsed.data.from_class} to ${parsed.data.to_class}.` };
}
