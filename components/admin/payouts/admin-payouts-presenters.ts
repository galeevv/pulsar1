import type { AdminPayoutStatus } from "@/lib/admin/admin-payouts-types";

type BadgeVariant = "default" | "destructive" | "secondary" | "success" | "warning";

const amountFormatter = new Intl.NumberFormat("ru-RU");

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("ru-RU", options);
}

export function formatPayoutDateTime(value: string) {
  return formatDate(value, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatPayoutDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return formatDate(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatRub(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${amountFormatter.format(value)} ₽`;
}

export function formatCredits(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  return amountFormatter.format(value);
}

export function formatNullableText(value: string | null | undefined) {
  if (!value || !value.trim()) {
    return "-";
  }

  return value;
}

export function getPayoutStatusLabel(status: AdminPayoutStatus) {
  if (status === "approved") {
    return "Approved";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  if (status === "paid") {
    return "Paid";
  }

  if (status === "canceled") {
    return "Canceled";
  }

  return "Pending";
}

export function getPayoutStatusVariant(status: AdminPayoutStatus): BadgeVariant {
  if (status === "approved") {
    return "success";
  }

  if (status === "pending") {
    return "warning";
  }

  if (status === "paid") {
    return "secondary";
  }

  if (status === "rejected" || status === "canceled") {
    return "destructive";
  }

  return "default";
}
