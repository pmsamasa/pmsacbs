"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { broadcastNotificationSchema } from "@/lib/validations";

function toIsoDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function sendBroadcastNotificationAction(_: unknown, formData: FormData) {
  await requireRole(["manager"]);
  const parsed = broadcastNotificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid alert message." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("send_manager_broadcast_notification", {
    p_title: parsed.data.title,
    p_body: parsed.data.body,
    p_message_date: toIsoDateTime(parsed.data.message_date),
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/notifications");
  return { ok: true, message: "Alert sent to all customers." };
}

export async function markNotificationsReadAction(ids: string[]) {
  const { user } = await requireRole(["customer", "manager", "head"]);
  if (!ids.length) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user!.id)
    .in("id", ids);
  revalidatePath("/notifications");
  return { ok: !error, message: error?.message };
}
