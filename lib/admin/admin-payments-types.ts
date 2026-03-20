export const ADMIN_PAYMENTS_STATUS_FILTERS = [
  "all",
  "pending",
  "approved",
  "rejected",
  "failed",
] as const;

export const ADMIN_PAYMENTS_METHOD_FILTERS = [
  "all",
  "platega",
  "credits",
] as const;

export const ADMIN_PAYMENTS_SORT_VALUES = [
  "newest",
  "oldest",
  "amount_desc",
  "amount_asc",
] as const;

export const ADMIN_PAYMENTS_PAGE_SIZES = [20, 50, 100] as const;

export type AdminPaymentStatusFilter = (typeof ADMIN_PAYMENTS_STATUS_FILTERS)[number];
export type AdminPaymentMethodFilter = (typeof ADMIN_PAYMENTS_METHOD_FILTERS)[number];
export type AdminPaymentsSort = (typeof ADMIN_PAYMENTS_SORT_VALUES)[number];
export type AdminPaymentsPageSize = (typeof ADMIN_PAYMENTS_PAGE_SIZES)[number];

export type AdminPaymentStatus = Exclude<AdminPaymentStatusFilter, "all">;
export type AdminPaymentMethod = Exclude<AdminPaymentMethodFilter, "all">;
export type AdminPaymentSubscriptionOutcome = "issued" | "not_issued" | "unknown";

export type AdminPaymentRow = {
  amountRub: number;
  createdAt: string;
  details: {
    payment: {
      createdAt: string;
      internalId: string;
      method: AdminPaymentMethod;
      status: AdminPaymentStatus;
      updatedAt: string;
    };
    pricingSnapshot: {
      appliedReferralDiscountPercent?: number | null;
      devices?: number | null;
      devicesMonthlyPrice?: number | null;
      durationDiscountPercent?: number | null;
      finalTotalRub?: number | null;
      months?: number | null;
      referralDiscountPercent?: number | null;
      totalAfterDurationDiscountRub?: number | null;
      totalBeforeDiscountRub?: number | null;
      vpnMonthlyPrice?: number | null;
    } | null;
    referral: {
      label?: string | null;
      rewardApplied: boolean | null;
    } | null;
    subscription: {
      devices: number | null;
      endsAt: string | null;
      id: string;
      maxDevices: number | null;
      startsAt: string | null;
    } | null;
    user: {
      id: string;
      telegramId: string | null;
      username: string | null;
    };
    webhook: {
      lastError?: string | null;
      received: boolean | null;
      status?: string | null;
    } | null;
  };
  externalPaymentId: string | null;
  id: string;
  method: AdminPaymentMethod;
  status: AdminPaymentStatus;
  subscriptionOutcome: AdminPaymentSubscriptionOutcome;
  updatedAt: string;
  userId: string;
  username: string | null;
};

export type AdminPaymentsSummary = {
  approvedPayments: number;
  pendingPayments: number;
  revenueRub: number;
  totalPayments: number;
};

export type AdminPaymentsFilters = {
  method: AdminPaymentMethodFilter;
  page: number;
  pageSize: AdminPaymentsPageSize;
  query: string;
  sort: AdminPaymentsSort;
  status: AdminPaymentStatusFilter;
};

export type AdminPaymentsPagination = {
  from: number;
  page: number;
  pageSize: AdminPaymentsPageSize;
  to: number;
  total: number;
  totalPages: number;
};

export type AdminPaymentsPageData = {
  filters: AdminPaymentsFilters;
  pagination: AdminPaymentsPagination;
  rows: AdminPaymentRow[];
  summary: AdminPaymentsSummary;
};
