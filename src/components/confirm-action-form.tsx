"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

type ActionState = { ok?: boolean; message?: string };

export function ConfirmActionForm({
  action,
  children,
  confirmation,
  buttonLabel,
  title,
  disabled,
  danger = false,
}: {
  action: (state: unknown, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  confirmation: string;
  buttonLabel: string;
  title: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction] = useActionState(action, { ok: undefined, message: undefined });
  const confirmed = useMemo(() => typed === confirmation, [typed, confirmation]);

  useEffect(() => {
    if (state?.message) toast[state.ok ? "success" : "error"](state.message);
    if (state?.ok) {
      const timer = window.setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [router, state]);

  return (
    <>
      <button
        type="button"
        className={cn(danger ? "icon-button text-red-700 hover:bg-red-50" : "btn-secondary", disabled && "text-emerald-300")}
        disabled={disabled}
        onClick={() => setOpen(true)}
        title={disabled ? "Available only when the customer balance is zero" : title}
      >
        {danger ? <Trash2 className="size-4" /> : buttonLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-emerald-950/55 p-4 backdrop-blur-sm">
          <form action={formAction} className="glass-card w-full max-w-lg space-y-5 p-6">
            <div>
              <h2 className="text-lg font-semibold text-emerald-950">{title}</h2>
              <p className="mt-2 text-sm text-emerald-700">Copy the bold text below and paste it to enable the confirmation button.</p>
              <p className="mt-3 rounded-xl bg-red-50 p-3 font-bold text-red-800">{confirmation}</p>
            </div>
            {children}
            <input type="hidden" name="confirmation" value={typed} />
            <label className="field-label">Confirmation text
              <input className="input" value={typed} onChange={(event) => setTyped(event.target.value)} />
            </label>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="btn-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <SubmitButton className={confirmed ? "" : "pointer-events-none opacity-50"}>Yes, I am sure</SubmitButton>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
