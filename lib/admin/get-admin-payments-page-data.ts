import { redirect } from "next/navigation";
import { PaymentMethod, PaymentRequestStatus } from "@/generated/prisma";
import type { Prisma } from "@/generated/prisma";

import {
  type AdminPaymentMethod,
  type AdminPaymentMethodFilter,
  type AdminPaymentsPageData,
  type AdminPaymentsPageSize,
  type AdminPaymentsSort,
  type AdminPaymentStatus,
  type AdminPaymentStatusFilter,
  ADMIN_PAYMENTS_METHOD_FILTERS,
  ADMIN_PAYMENTS_PAGE_SIZES,
  ADMIN_PAYMENTS_SORT_VALUES,
  ADMIN_PAYMENTS_STATUS_FILTERS,
} from "@/lib/admin/admin-payments-types";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SearchParamsInput = Record<string, string | string[] | undefined>;

const FAILED_PLATEGA_STATUSES = [
  "FAILED",
  "ERROR",
  "CANCELED",
  "CANCELLED",
  "EXPIRED",
  "DECLINED",
  "FAIL",
  "failed",
  "error",
  "canceled",
  "cancelled",
  "expired",
  "declined",
  "fail",
] as const;

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

function normalizePageSize(rawValue: string | undefined): AdminPaymentsPageSize {
  const value = Number.parseInt(rawValue ?? "", 10);

  if (ADMIN_PAYMENTS_PAGE_SIZES.includes(value as AdminPaymentsPageSize)) {
    return value as AdminPaymentsPageSize;
  }

  return 20;
}

function normalizeStatus(rawValue: string | undefined): AdminPaymentStatusFilter {
  if (
    ADMIN_PAYMENTS_STATUS_FILTERS.includes(rawValue as AdminPaymentStatusFilter)
  ) {
    return rawValue as AdminPaymentStatusFilter;
  }

  return "all";
}

function normalizeMethod(rawValue: string | undefined): AdminPaymentMethodFilter {
  if (
    ADMIN_PAYMENTS_METHOD_FILTERS.includes(rawValue as AdminPaymentMethodFilter)
  ) {
    return rawValue as AdminPaymentMethodFilter;
  }

  return "all";
}

function normalizeSort(rawValue: string | undefined): AdminPaymentsSort {
  if (ADMIN_PAYMENTS_SORT_VALUES.includes(rawValue as AdminPaymentsSort)) {
    return rawValue as AdminPaymentsSort;
  }

  return "newest";
}

function buildFailedStatusConditions(): Prisma.PaymentRequestWhereInput[] {
  return FAILED_PLATEGA_STATUSES.map((statusValue) => ({
    plategaStatus: {
      contains: statusValue,
    },
  }));
}

function mapMethod(method: PaymentMethod): AdminPaymentMethod {
  return method === PaymentMethod.CREDITS ? "credits" : "platega";
}

function isFailedByPlategaStatus(rawStatus: string | null) {
  if (!rawStatus) {
    return false;
  }

  const normalized = rawStatus.trim().toUpperCase();
  return FAILED_PLATEGA_STATUSES.some((value) => normalized.includes(value.toUpperCase()));
}

function resolvePaymentStatus({
  status,
  plategaStatus,
}: {
  plategaStatus: string | null;
  status: PaymentRequestStatus;
}): AdminPaymentStatus {
  if (status === PaymentRequestStatus.APPROVED) {
    return "approved";
  }

  if (status === PaymentRequestStatus.REJECTED) {
    return "rejected";
  }

  return isFailedByPlategaStatus(plategaStatus) ? "failed" : "pending";
}

function resolveStatusWhere(status: AdminPaymentStatusFilter): Prisma.PaymentRequestWhereInput | null {
  const failedConditions = buildFailedStatusConditions();

  if (status === "all") {
    return null;
  }

  if (status === "approved") {
    return { status: PaymentRequestStatus.APPROVED };
  }

  if (status === "rejected") {
    return { status: PaymentRequestStatus.REJECTED };
  }

  if (status === "failed") {
    return {
      OR: failedConditions,
      status: PaymentRequestStatus.CREATED,
    };
  }

  return {
    OR: [
      { plategaStatus: null },
      {
        AND: [
          {
            NOT: {
              OR: failedConditions,
            },
          },
          { plategaStatus: { not: null } },
        ],
      },
    ],
    status: PaymentRequestStatus.CREATED,
  };
}

function resolveSortOrder(sort: AdminPaymentsSort): Prisma.PaymentRequestOrderByWithRelationInput[] {
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
  method: AdminPaymentMethodFilter;
  query: string;
  status: AdminPaymentStatusFilter;
}): Prisma.PaymentRequestWhereInput {
  const and: Prisma.PaymentRequestWhereInput[] = [];

  if (filters.query) {
    and.push({
      OR: [
        {
          id: {
            contains: filters.query,
          },
        },
        {
          plategaTransactionId: {
            contains: filters.query,
          },
        },
        {
          user: {
            username: {
              contains: filters.query,
            },
          },
        },
      ],
    });
  }

  const statusWhere = resolveStatusWhere(filters.status);
  if (statusWhere) {
    and.push(statusWhere);
  }

  if (filters.method !== "all") {
    and.push({
      method:
        filters.method === "credits" ? PaymentMethod.CREDITS : PaymentMethod.PLATEGA,
    });
  }

  if (and.length === 0) {
    return {};
  }

  return { AND: and };
}

function resolveSubscriptionOutcome(hasSubscription: boolean, status: AdminPaymentStatus) {
  if (hasSubscription) {
    return "issued" as const;
  }

  if (status === "pending") {
    return "unknown" as const;
  }

  return "not_issued" as const;
}

export async function getAdminPaymentsPageData(
  searchParams: SearchParamsInput
): Promise<AdminPaymentsPageData> {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  if (session.role !== "ADMIN") {
    redirect("/app");
  }

  const query = (getValue(searchParams, "query") ?? "").trim();
  const status = normalizeStatus(getValue(searchParams, "status"));
  const method = normalizeMethod(getValue(searchParams, "method"));
  const sort = normalizeSort(getValue(searchParams, "sort"));
  const page = parsePage(getValue(searchParams, "page"));
  const pageSize = normalizePageSize(getValue(searchParams, "pageSize"));

  const where = buildWhere({
    method,
    query,
    status,
  });
  const summaryPendingWhere = resolveStatusWhere("pending") ?? {};

  const [filteredTotal, summaryTotal, summaryApproved, summaryPending, summaryRevenue] =
    await prisma.$transaction([
      prisma.paymentRequest.count({ where }),
      prisma.paymentRequest.count(),
      prisma.paymentRequest.count({
        where: { status: PaymentRequestStatus.APPROVED },
      }),
      prisma.paymentRequest.count({
        where: summaryPendingWhere,
      }),
      prisma.paymentRequest.aggregate({
        _sum: {
          amountRub: true,
        },
        where: { status: PaymentRequestStatus.APPROVED },
      }),
    ]);

  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const paymentRequests = await prisma.paymentRequest.findMany({
    include: {
      plategaWebhookLogs: {
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          errorMessage: true,
          processingStatus: true,
          statusRaw: true,
        },
        take: 1,
      },
      subscription: {
        select: {
          deviceLimit: true,
          devices: true,
          endsAt: true,
          id: true,
          startsAt: true,
        },
      },
      user: {
        select: {
          id: true,
          referralCodeUse: {
            select: {
              referralCode: {
                select: {
                  code: true,
                },
              },
              rewardGrantedAt: true,
            },
          },
          username: true,
        },
      },
    },
    orderBy: resolveSortOrder(sort),
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    where,
  });

  const rows = paymentRequests.map((item) => {
    const statusValue = resolvePaymentStatus({
      plategaStatus: item.plategaStatus,
      status: item.status,
    });
    const methodValue = mapMethod(item.method);
    const subscriptionOutcome = resolveSubscriptionOutcome(
      Boolean(item.subscription),
      statusValue
    );
    const webhookLog = item.plategaWebhookLogs[0] ?? null;
    const referralUse = item.user.referralCodeUse;

    return {
      amountRub: item.amountRub,
      createdAt: item.createdAt.toISOString(),
      details: {
        payment: {
          createdAt: item.createdAt.toISOString(),
          internalId: item.id,
          method: methodValue,
          status: statusValue,
          updatedAt: item.updatedAt.toISOString(),
        },
        pricingSnapshot: {
          appliedReferralDiscountPercent:
            item.referralDiscountPercentSnapshot > 0
              ? item.referralDiscountPercentSnapshot
              : null,
          devices: item.devices,
          devicesMonthlyPrice: item.extraDeviceMonthlyPriceSnapshot,
          durationDiscountPercent: item.durationDiscountPercentSnapshot,
          finalTotalRub: item.amountRub,
          months: item.months,
          referralDiscountPercent: item.referralDiscountPercentSnapshot,
          totalAfterDurationDiscountRub: null,
          totalBeforeDiscountRub: item.totalPriceBeforeDiscountRubSnapshot,
          vpnMonthlyPrice: item.monthlyPriceSnapshot,
        },
        referral: referralUse
          ? {
              label: referralUse.referralCode.code,
              rewardApplied: Boolean(referralUse.rewardGrantedAt),
            }
          : null,
        subscription: item.subscription
          ? {
              devices: item.subscription.devices,
              endsAt: item.subscription.endsAt.toISOString(),
              id: item.subscription.id,
              maxDevices: item.subscription.deviceLimit,
              startsAt: item.subscription.startsAt
                ? item.subscription.startsAt.toISOString()
                : null,
            }
          : null,
        user: {
          id: item.user.id,
          telegramId: null,
          username: item.user.username ?? null,
        },
        webhook:
          methodValue === "platega"
            ? {
                lastError: webhookLog?.errorMessage
                  ? webhookLog.errorMessage.slice(0, 180)
                  : null,
                received: Boolean(webhookLog),
                status: webhookLog
                  ? `${webhookLog.processingStatus}: ${webhookLog.statusRaw}`
                  : null,
              }
            : null,
      },
      externalPaymentId: item.plategaTransactionId,
      id: item.id,
      method: methodValue,
      status: statusValue,
      subscriptionOutcome,
      updatedAt: item.updatedAt.toISOString(),
      userId: item.user.id,
      username: item.user.username ?? null,
    };
  });

  const from = filteredTotal === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = filteredTotal === 0 ? 0 : Math.min(safePage * pageSize, filteredTotal);

  return {
    filters: {
      method,
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
      approvedPayments: summaryApproved,
      pendingPayments: summaryPending,
      revenueRub: summaryRevenue._sum.amountRub ?? 0,
      totalPayments: summaryTotal,
    },
  };
}
