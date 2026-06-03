"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/data";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { handoverSchema } from "@/lib/validations";

export async function handoverManagerAction(_: unknown, formData: FormData) {
  await requireRole(["manager", "head"]);
  const parsed = handoverSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid handover details." };

  const supabase = await createClient();
  const admin = createAdminClient();
  const cic = parsed.data.new_manager_cic_no.toUpperCase();
  const email = parsed.data.new_manager_email.toLowerCase();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id,role")
    .or(`email.eq.${email},cic_no.eq.${cic}`)
    .maybeSingle();

  let managerUserId = existingProfile?.id;
  if (!managerUserId) {
    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.new_manager_password,
      email_confirm: true,
      user_metadata: { role: "manager", cic_no: cic, name: parsed.data.new_manager_name },
    });
    if (authError) return { ok: false, message: authError.message };
    managerUserId = created.user?.id;
  }
  if (!managerUserId) return { ok: false, message: "Could not prepare new manager account." };

  const { error: profileError } = await admin.from("profiles").upsert({
    id: managerUserId,
    role: "manager",
    cic_no: cic,
    name: parsed.data.new_manager_name,
    class_name: parsed.data.new_manager_class || null,
    phone: parsed.data.new_manager_phone || null,
    email,
    force_password_change: true,
  }, { onConflict: "id" });
  if (profileError) return { ok: false, message: profileError.message };

  const { data, error } = await supabase.rpc("handover_manager_period", {
    p_new_manager_user_id: managerUserId,
    p_new_period_name: parsed.data.new_period_name,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/manager/handover");
  revalidatePath("/head");
  return { ok: true, message: "Manager period handed over.", data };
}
