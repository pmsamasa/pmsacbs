"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={cn("btn-primary", className)} disabled={pending}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

