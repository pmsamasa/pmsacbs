import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return { user, profile, supabase };
});

export async function requireRole(roles: UserRole[]) {
  const context = await getSessionProfile();
  if (!context.user) redirect("/login");
  if (!context.profile) redirect("/login?error=missing-profile");
  if (!roles.includes(context.profile.role)) {
    redirect(context.profile.role === "head" ? "/head" : context.profile.role === "manager" ? "/manager" : "/customer");
  }
  return context as Awaited<ReturnType<typeof getSessionProfile>> & { profile: Profile };
}

export async function roleHome() {
  const { profile } = await getSessionProfile();
  if (!profile) return "/login";
  return profile.role === "head" ? "/head" : profile.role === "manager" ? "/manager" : "/customer";
}

