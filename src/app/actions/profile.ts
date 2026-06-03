"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validations";

export async function updateProfileAction(_: unknown, formData: FormData) {
  const { profile } = await requireRole(["customer", "manager", "head"]);
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid profile." };

  const supabase = await createClient();
  const payload = profile.role === "customer"
    ? { class_name: parsed.data.class_name || null, phone: parsed.data.phone || null, email: parsed.data.email || null }
    : parsed.data;
  const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/profile");
  return { ok: true, message: "Profile updated." };
}

export async function registerFcmTokenAction(token: string) {
  const { user } = await requireRole(["customer", "manager", "head"]);
  const supabase = await createClient();
  const { error } = await supabase.from("fcm_tokens").upsert({ user_id: user!.id, token, platform: "web" }, { onConflict: "token" });
  return { ok: !error, message: error?.message ?? "Alerts enabled." };
}

export async function updateProfilePhotoAction(photoUrl: string) {
  const { profile } = await requireRole(["customer", "manager", "head"]);
  if (!photoUrl.startsWith("http")) return { ok: false, message: "Invalid photo URL." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ photo_url: photoUrl }).eq("id", profile.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile photo updated." };
}
