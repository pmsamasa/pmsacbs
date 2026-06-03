"use server";

import webpush, { type PushSubscription } from "web-push";
import { createAdminClient } from "@/lib/supabase/server";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;

  webpush.setVapidDetails(process.env.WEB_PUSH_CONTACT || "mailto:cbsmasapmsa@gmail.com", publicKey, privateKey);
  return { publicKey, privateKey };
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!userIds.length || !getVapidConfig()) return;

  const supabase = createAdminClient();
  const { data: tokens } = await supabase.from("fcm_tokens").select("id,user_id,token").in("user_id", userIds);
  if (!tokens?.length) return;

  await Promise.allSettled(
    tokens.map(async (row) => {
      try {
        const subscription = JSON.parse(row.token) as PushSubscription;
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : null;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("fcm_tokens").delete().eq("id", row.id);
        }
      }
    }),
  );
}
