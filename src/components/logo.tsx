import Image from "next/image";
import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative grid size-11 place-items-center overflow-hidden rounded-2xl border border-gold-200/60 bg-emerald-950 shadow-glow">
        <Image src="/cbslogo.png" alt="" fill className="object-cover" unoptimized />
        <Landmark className="relative z-10 hidden size-6 text-gold-200" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-semibold tracking-wide text-emerald-950">PMSA CBS</p>
          <p className="text-xs text-emerald-700">College Savings Bank</p>
        </div>
      )}
    </div>
  );
}

