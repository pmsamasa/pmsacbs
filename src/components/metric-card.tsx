import { LucideIcon } from "lucide-react";
import { formatINR } from "@/lib/utils";

export function MetricCard({ label, value, icon: Icon, tone = "green" }: { label: string; value: number | string; icon: LucideIcon; tone?: "green" | "gold" | "red" }) {
  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-emerald-700">{label}</p>
          <p className="mt-2 break-words text-xl font-semibold text-emerald-950 sm:text-2xl">{typeof value === "number" ? formatINR(value) : value}</p>
        </div>
        <div className={tone === "gold" ? "metric-icon bg-gold-100 text-gold-700" : tone === "red" ? "metric-icon bg-red-100 text-red-700" : "metric-icon bg-emerald-100 text-emerald-700"}>
          <Icon className="size-6" />
        </div>
      </div>
    </div>
  );
}
