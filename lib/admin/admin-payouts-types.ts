export const ADMIN_PAYOUTS_STATUS_FILTERS = [
  "all",
  "pending",
  "approved",
  "rejected",
  "paid",
  "canceled",
] as const;

export const ADMIN_PAYOUTS_SORT_VALUES = [
  "newest",
  "oldest",
  "amount_desc",
  "amount_asc",
] as const;

export const ADMIN_PAYOUTS_PAGE_SIZES = [20, 50, 100] as const;

export type AdminPayoutStatusFilter = (typeof ADMIN_PAYOUTS_STATUS_FILTERS)[number];
export type AdminPayoutSort = (typeof ADMIN_PAYOUTS_SORT_VALUES)[number];
export type AdminPayoutPageSize = (typeof ADMIN_PAYOUTS_PAGE_SIZES)[number];
export type AdminPayoutStatus = Exclude<AdminPayoutStatusFilter, "all">;

export type AdminPayoutRow = {
  amountCredits: number;
  amountRub: number;
  createdAt: string;
  id: string;
  payoutMethod: string;
  reviewedAt: string | null;
  reviewedByUsername: string | null;
  status: AdminPayoutStatus;
  userId: string;
  username: string | null;
  details: {
    adminNote: string | null;
    paidAt: string | null;
    payoutDetailsSnapshot: string;
    rejectionReason: string | null;
    reviewedAt: string | null;
    reviewedByAdminId: string | null;
    reviewedByUsername: string | null;
    userId: string;
    username: string | null;
  };
};

export type AdminPayoutsFilters = {
  page: number;
  pageSize: AdminPayoutPageSize;
  query: string;
  sort: AdminPayoutSort;
  status: AdminPayoutStatusFilter;
};

export type AdminPayoutsPagination = {
  from: number;
  page: number;
  pageSize: AdminPayoutPageSize;
  to: number;
  total: number;
  totalPages: number;
};

export type AdminPayoutsSummary = {
  approvedPayouts: number;
  minimumPayoutCredits: number;
  paidOutRub: number;
  payoutVolumeRub: number;
  pendingPayouts: number;
  totalPayoutRequests: number;
  totalReservedCreditsActiveRequests: number;
  rejectedPayouts: number;
};

export type AdminPayoutsPageData = {
  filters: AdminPayoutsFilters;
  pagination: AdminPayoutsPagination;
  rows: AdminPayoutRow[];
  summary: AdminPayoutsSummary;
};
