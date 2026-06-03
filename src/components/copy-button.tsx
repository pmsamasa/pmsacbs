"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="badge gap-2"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      title="Touch to copy"
    >
      <Copy className="size-3" /> {copied ? "Copied" : label ?? value}
    </button>
  );
}

