import type {
  AdminPaymentMethod,
  AdminPaymentStatus,
  AdminPaymentSubscriptionOutcome,
} from "@/lib/admin/admin-payments-types";

type BadgeVariant = "default" | "destructive" | "secondary" | "success" | "warning";

const amountFormatter = new Intl.NumberFormat("ru-RU");

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("ru-RU", options);
}

export function formatPaymentDateTime(value: string) {
  return formatDate(value, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatPaymentDate(value: string) {
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

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value}%`;
}

export function formatNullableText(value: string | null | undefined) {
  if (!value || !value.trim()) {
    return "-";
  }

  return value;
}

export function getPaymentStatusLabel(status: AdminPaymentStatus) {
  if (status === "approved") {
    return "Approved";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Pending";
}

export function getPaymentStatusVariant(status: AdminPaymentStatus): BadgeVariant {
  if (status === "approved") {
    return "success";
  }

  if (status === "pending") {
    return "warning";
  }

  if (status === "failed" || status === "rejected") {
    return "destructive";
  }

  return "default";
}

export function getPaymentMethodLabel(method: AdminPaymentMethod) {
  return method === "credits" ? "Credits" : "Platega";
}

export function getPaymentMethodVariant(method: AdminPaymentMethod): BadgeVariant {
  return method === "credits" ? "secondary" : "default";
}

export function getSubscriptionOutcomeLabel(outcome: AdminPaymentSubscriptionOutcome) {
  if (outcome === "issued") {
    return "Issued";
  }

  if (outcome === "not_issued") {
    return "Not issued";
  }

  return "Unknown";
}

export function getSubscriptionOutcomeVariant(
  outcome: AdminPaymentSubscriptionOutcome
): BadgeVariant {
  if (outcome === "issued") {
    return "success";
  }

  if (outcome === "unknown") {
    return "warning";
  }

  return "default";
}

export function formatBooleanState(value: boolean | null) {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  return "Unknown";
}
