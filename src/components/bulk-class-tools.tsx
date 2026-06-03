"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { bulkConvertClassAction, bulkDeleteClassAction } from "@/app/actions/customers";
import { SubmitButton } from "@/components/submit-button";

type State = { ok?: boolean; message?: string };

export function BulkClassTools({ classes, defaultClass = "" }: { classes: string[]; defaultClass?: string }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <BulkModal
        action={bulkConvertClassAction}
        title="Bulk convert class"
        buttonLabel="Bulk class convert"
        classes={classes}
        defaultClass={defaultClass}
        mode="move"
      />
      <BulkModal
        action={bulkDeleteClassAction}
        title="Bulk delete zero-balance class"
        buttonLabel="Bulk delete zero-balance class"
        classes={classes}
        defaultClass={defaultClass}
        mode="delete"
      />
    </div>
  );
}

function BulkModal({
  action,
  title,
  buttonLabel,
  classes,
  defaultClass,
  mode,
}: {
  action: (state: unknown, formData: FormData) => Promise<State>;
  title: string;
  buttonLabel: string;
  classes: string[];
  defaultClass: string;
  mode: "move" | "delete";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fromClass, setFromClass] = useState(defaultClass);
  const [toClass, setToClass] = useState("");
  const [typed, setTyped] = useState("");
  const [state, formAction] = useActionState(action, { ok: undefined, message: undefined });
  const phrase = useMemo(() => mode === "move" ? `MOVE ${fromClass || "CLASS"} TO ${toClass || "CLASS"}` : `DELETE CLASS ${fromClass || "CLASS"}`, [fromClass, mode, toClass]);

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
      <button type="button" className={mode === "delete" ? "btn-secondary text-red-700" : "btn-secondary"} onClick={() => setOpen(true)}>{buttonLabel}</button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-emerald-950/55 p-4 backdrop-blur-sm">
          <form action={formAction} className="glass-card w-full max-w-lg space-y-5 p-6">
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-emerald-700">Copy this text to confirm:</p>
              <p className="mt-3 rounded-xl bg-red-50 p-3 font-bold text-red-800">{phrase}</p>
            </div>
            <select className="input" name="from_class" value={fromClass} onChange={(event) => setFromClass(event.target.value)} required>
              <option value="">From class</option>
              {classes.map((className) => <option key={className} value={className}>{className}</option>)}
            </select>
            {mode === "move" ? (
              <select className="input" name="to_class" value={toClass} onChange={(event) => setToClass(event.target.value)} required>
                <option value="">To class</option>
                {classes.map((className) => <option key={className} value={className}>{className}</option>)}
              </select>
            ) : null}
            <input type="hidden" name="confirmation" value={typed} />
            <label className="field-label">Confirmation text
              <input className="input" value={typed} onChange={(event) => setTyped(event.target.value)} />
            </label>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="btn-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <SubmitButton className={typed === phrase ? "" : "pointer-events-none opacity-50"}>Yes, I am sure</SubmitButton>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
