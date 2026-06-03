"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const CONFIRM_TEXT = "I CONFIRM THE PASSWORD IS CHANGED";

export function PasswordChangePanel({ email }: { email: string | null }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const canChange = useMemo(
    () => unlocked && newPassword.length >= 6 && newPassword === confirmPassword && confirmation === CONFIRM_TEXT,
    [confirmation, confirmPassword, newPassword, unlocked],
  );

  function verifyCurrentPassword() {
    startTransition(async () => {
      try {
        if (!email) throw new Error("Your profile email is missing. Please update the email first.");
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
        if (error) throw new Error("Current password is incorrect.");
        setUnlocked(true);
        toast.success("Password section unlocked.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not verify password.");
      }
    });
  }

  function changePassword() {
    startTransition(async () => {
      try {
        if (!canChange) return;
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setConfirmation("");
        setUnlocked(false);
        toast.success("Password changed successfully.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not change password.");
      }
    });
  }

  return (
    <section className="glass-card p-5">
      <div className="mb-5 flex items-start gap-3">
        <div className="metric-icon bg-emerald-100 text-emerald-700">
          <LockKeyhole className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-emerald-950">Change Password</h2>
          <p className="mt-1 text-sm text-emerald-700">Verify your current password first, then set a new password carefully.</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-emerald-900/10 bg-white/70 p-4">
          <label className="field-label">Current password
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Enter current password"
              disabled={unlocked}
            />
          </label>
          <button className="btn-secondary mt-3" type="button" onClick={verifyCurrentPassword} disabled={isPending || unlocked || currentPassword.length < 6}>
            {isPending && !unlocked ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {unlocked ? "Unlocked" : "Unlock password section"}
          </button>
        </div>

        <div className={unlocked ? "rounded-2xl border border-emerald-900/10 bg-white/70 p-4" : "pointer-events-none rounded-2xl border border-emerald-900/10 bg-white/40 p-4 opacity-50"}>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-800">
            {unlocked ? <CheckCircle2 className="size-4 text-emerald-700" /> : <KeyRound className="size-4" />}
            {unlocked ? "Password section is unlocked" : "Unlock with current password to continue"}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label">New password
              <input className="input" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Minimum 6 characters" />
            </label>
            <label className="field-label">Confirm new password
              <input className="input" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Type new password again" />
            </label>
          </div>
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            Password must be at least 6 characters. Confirm password must exactly match the new password.
          </div>
          <div className="mt-4">
            <p className="text-sm text-emerald-700">Copy and paste this exact text:</p>
            <p className="mt-2 rounded-xl bg-gold-100/80 p-3 font-bold text-emerald-950">{CONFIRM_TEXT}</p>
          </div>
          <label className="field-label mt-3">Confirmation text
            <input className="input" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={CONFIRM_TEXT} />
          </label>
          <button className="btn-primary mt-4 w-full" type="button" disabled={!canChange || isPending} onClick={changePassword}>
            {isPending && canChange ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Change password
          </button>
        </div>
      </div>
    </section>
  );
}

