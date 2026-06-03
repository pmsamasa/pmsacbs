export function requestTypeLabel(value: string) {
  const labels: Record<string, string> = {
    fixed_full: "Full withdrawal from fixed account",
    saving_full: "Full withdrawal from saving account",
    saving_early: "Early withdrawal from saving account",
  };
  return labels[value] ?? value;
}

export function statusLabel(value: string) {
  const labels: Record<string, string> = {
    pending: "Waiting for head approval",
    approved: "Approved by head",
    rejected: "Rejected by head",
    used: "Used for transaction",
  };
  return labels[value] ?? value;
}

