"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";

type State = { ok?: boolean; message?: string };

export function ActionForm({
  action,
  children,
  submitLabel,
  className,
}: {
  action: (state: unknown, formData: FormData) => Promise<State>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, { ok: undefined, message: undefined } satisfies State);

  useEffect(() => {
    if (state?.message) {
      toast[state.ok ? "success" : "error"](state.message);
    }
    if (state?.ok) {
      router.refresh();
    }
  }, [router, state]);

  return (
    <form action={formAction} className={className ?? "space-y-4"}>
      {children}
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
