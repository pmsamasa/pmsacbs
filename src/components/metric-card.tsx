import { LucideIcon } from "lucide-react";
import { formatINR } from "@/lib/utils";

export function MetricCard({ label, value, icon: Icon, tone = "green" }: { label: string; value: number | string; icon: LucideIcon; tone?: "green" | "gold" | "red" }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-950">{typeof value === "number" ? formatINR(value) : value}</p>
        </div>
        <div className={tone === "gold" ? "metric-icon bg-gold-100 text-gold-700" : tone === "red" ? "metric-icon bg-red-100 text-red-700" : "metric-icon bg-emerald-100 text-emerald-700"}>
          <Icon className="size-6" />
        </div>
      </div>
    </div>
  );
}

