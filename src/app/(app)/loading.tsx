import { Loader2 } from "lucide-react";

export default function ProtectedLoading() {
  return (
    <div className="grid min-h-[55vh] place-items-center px-4">
      <div className="glass-card w-full max-w-sm p-6 text-center">
        <Loader2 className="mx-auto mb-3 size-7 animate-spin text-gold-600" />
        <p className="font-semibold text-emerald-950">Loading bank records</p>
        <p className="mt-1 text-sm text-emerald-700">Please wait while CBS MASA opens this section.</p>
      </div>
    </div>
  );
}
