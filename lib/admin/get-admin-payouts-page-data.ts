import { redirect } from "next/navigation";
import { PayoutRequestStatus, type Prisma } from "@/generated/prisma";

import {
  type AdminPayoutPageSize,
  type AdminPayoutSort,
  type AdminPayoutStatus,
  type AdminPayoutStatusFilter,
  type AdminPayoutsPageData,
  ADMIN_PAYOUTS_PAGE_SIZES,
  ADMIN_PAYOUTS_SORT_VALUES,
  ADMIN_PAYOUTS_STATUS_FILTERS,
} from "@/lib/admin/admin-payouts-types";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SearchParamsInput = Record<string, string | string[] | undefined>;

function getValue(searchParams: SearchParamsInput, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(rawValue: string | undefined) {
  const value = Number.parseInt(rawValue ?? "", 10);
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return value;
}

function normalizePageSize(rawValue: string | undefined): AdminPayoutPageSize {
  const value = Number.parseInt(rawValue ?? "", 10);

  if (ADMIN_PAYOUTS_PAGE_SIZES.includes(value as AdminPayoutPageSize)) {
    return value as AdminPayoutPageSize;
  }

  return 20;
}

function normalizeStatus(rawValue: string | undefined): AdminPayoutStatusFilter {
  if (ADMIN_PAYOUTS_STATUS_FILTERS.includes(rawValue as AdminPayoutStatusFilter)) {
    return rawValue as AdminPayoutStatusFilter;
  }

  return "all";
}

function normalizeSort(rawValue: string | undefined): AdminPayoutSort {
  if (ADMIN_PAYOUTS_SORT_VALUES.includes(rawValue as AdminPayoutSort)) {
    return rawValue as AdminPayoutSort;
  }

  return "newest";
}

function mapStatus(status: PayoutRequestStatus): AdminPayoutStatus {
  if (status === PayoutRequestStatus.APPROVED) {
    return "approved";
  }

  if (status === PayoutRequestStatus.REJECTED) {
    return "rejected";
  }

  if (status === PayoutRequestStatus.PAID) {
    return "paid";
  }

  if (status === PayoutRequestStatus.CANCELED) {
    return "canceled";
  }

  return "pending";
}

function resolveStatusWhere(status: AdminPayoutStatusFilter): Prisma.PayoutRequestWhereInput | null {
  if (status === "all") {
    return null;
  }

  if (status === "approved") {
    return { status: PayoutRequestStatus.APPROVED };
  }

  if (status === "rejected") {
    return { status: PayoutRequestStatus.REJECTED };
  }

  if (status === "paid") {
    return { status: PayoutRequestStatus.PAID };
  }

  if (status === "canceled") {
    return { status: PayoutRequestStatus.CANCELED };
  }

  return { status: PayoutRequestStatus.PENDING };
}

function resolveSortOrder(sort: AdminPayoutSort): Prisma.PayoutRequestOrderByWithRelationInput[] {
  if (sort === "oldest") {
    return [{ createdAt: "asc" }];
  }

  if (sort === "amount_desc") {
    return [{ amountRub: "desc" }, { createdAt: "desc" }];
  }

  if (sort === "amount_asc") {
    return [{ amountRub: "asc" }, { createdAt: "desc" }];
  }

  return [{ createdAt: "desc" }];
}

function buildWhere(filters: {
  query: string;
  status: AdminPayoutStatusFilter;
}): Prisma.PayoutRequestWhereInput {
  const and: Prisma.PayoutRequestWhereInput[] = [];

  if (filters.query) {
    and.push({
      user: {
        username: {
          contains: filters.query,
        },
      },
    });
  }

  const statusWhere = resolveStatusWhere(filters.status);
  if (statusWhere) {
    and.push(statusWhere);
  }

  if (and.length === 0) {
    return {};
  }

  return { AND: and };
}

export async function getAdminPayoutsPageData(
  searchParams: SearchParamsInput
): Promise<AdminPayoutsPageData> {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  if (session.role !== "ADMIN") {
    redirect("/app");
  }

  const query = (getValue(searchParams, "query") ?? "").trim();
  const status = normalizeStatus(getValue(searchParams, "status"));
  const sort = normalizeSort(getValue(searchParams, "sort"));
  const page = parsePage(getValue(searchParams, "page"));
  const pageSize = normalizePageSize(getValue(searchParams, "pageSize"));

  const where = buildWhere({
    query,
    status,
  });

  const [
    filteredTotal,
    summaryTotal,
    summaryPending,
    summaryApproved,
    summaryRejected,
    summaryPaidOut,
    summaryVolume,
    summaryReserved,
    referralSettings,
  ] = await prisma.$transaction([
    prisma.payoutRequest.count({ where }),
    prisma.payoutRequest.count(),
    prisma.payoutRequest.count({
      where: { status: PayoutRequestStatus.PENDING },
    }),
    prisma.payoutRequest.count({
      where: { status: PayoutRequestStatus.APPROVED },
    }),
    prisma.payoutRequest.count({
      where: { status: PayoutRequestStatus.REJECTED },
    }),
    prisma.payoutRequest.aggregate({
      _sum: {
        amountRub: true,
      },
      where: { status: PayoutRequestStatus.PAID },
    }),
    prisma.payoutRequest.aggregate({
      _sum: {
        amountRub: true,
      },
    }),
    prisma.payoutRequest.aggregate({
      _sum: {
        amountCredits: true,
      },
      where: {
        status: {
          in: [PayoutRequestStatus.PENDING, PayoutRequestStatus.APPROVED],
        },
      },
    }),
    prisma.referralProgramSettings.findUnique({
      select: {
        minimumPayoutCredits: true,
      },
      where: { id: 1 },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const requests = await prisma.payoutRequest.findMany({
    include: {
      reviewedByAdmin: {
        select: {
          username: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: resolveSortOrder(sort),
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    where,
  });

  const rows = requests.map((request) => ({
    amountCredits: request.amountCredits,
    amountRub: request.amountRub,
    createdAt: request.createdAt.toISOString(),
    details: {
      adminNote: request.adminNote,
      paidAt: request.paidAt ? request.paidAt.toISOString() : null,
      payoutDetailsSnapshot: request.payoutDetailsSnapshot,
      rejectionReason: request.rejectionReason,
      reviewedAt: request.reviewedAt ? request.reviewedAt.toISOString() : null,
      reviewedByAdminId: request.reviewedByAdminId,
      reviewedByUsername: request.reviewedByAdmin?.username ?? null,
      userId: request.user.id,
      username: request.user.username,
    },
    id: request.id,
    payoutMethod: request.payoutMethod,
    reviewedAt: request.reviewedAt ? request.reviewedAt.toISOString() : null,
    reviewedByUsername: request.reviewedByAdmin?.username ?? null,
    status: mapStatus(request.status),
    userId: request.user.id,
    username: request.user.username,
  }));

  const from = filteredTotal === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = filteredTotal === 0 ? 0 : Math.min(safePage * pageSize, filteredTotal);

  return {
    filters: {
      page: safePage,
      pageSize,
      query,
      sort,
      status,
    },
    pagination: {
      from,
      page: safePage,
      pageSize,
      to,
      total: filteredTotal,
      totalPages,
    },
    rows,
    summary: {
      approvedPayouts: summaryApproved,
      minimumPayoutCredits: referralSettings?.minimumPayoutCredits ?? 100,
      paidOutRub: summaryPaidOut._sum.amountRub ?? 0,
      payoutVolumeRub: summaryVolume._sum.amountRub ?? 0,
      pendingPayouts: summaryPending,
      rejectedPayouts: summaryRejected,
      totalPayoutRequests: summaryTotal,
      totalReservedCreditsActiveRequests: summaryReserved._sum.amountCredits ?? 0,
    },
  };
}
