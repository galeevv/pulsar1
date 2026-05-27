import {
  type AdminDashboardErrorSummary,
  AdminOverviewSection,
  type AdminRecentActivityItem,
  type DashboardKpiDelta,
  type DashboardKpiDeltaMap,
} from "@/components/admin/admin-overview-section";
import { getAdminDashboardData } from "@/lib/admin-code-management";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const KPI_PERIOD_DAYS = [7, 14, 30] as const;

function getValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeCodeTab(value: string | undefined) {
  if (value === "promo" || value === "referral") {
    return value;
  }

  return "referral";
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function buildDelta(periodDays: DashboardKpiDelta["periodDays"], current: number, previous: number) {
  const difference = current - previous;
  const direction: DashboardKpiDelta["direction"] =
    difference > 0 ? "up" : difference < 0 ? "down" : "flat";
  const percentChange =
    previous === 0 ? (current === 0 ? 0 : 100) : Math.round((difference / previous) * 100);

  return {
    current,
    direction,
    percentChange,
    periodDays,
    previous,
  } satisfies DashboardKpiDelta;
}

async function countErrorEventsBetween(start: Date, end?: Date) {
  const createdAt = end ? { gte: start, lt: end } : { gte: start };
  const [integrationErrors, webhookErrors] = await Promise.all([
    prisma.integrationSyncLog.count({
      where: { createdAt, status: "ERROR" },
    }),
    prisma.plategaWebhookLog.count({
      where: { createdAt, processingStatus: "ERROR" },
    }),
  ]);

  return integrationErrors + webhookErrors;
}

function truncateErrorMessage(value: string | null | undefined) {
  const message = value?.trim() || "Unknown error";
  return message.length > 160 ? `${message.slice(0, 157)}...` : message;
}

async function buildCurrentErrorSummary(now: Date): Promise<AdminDashboardErrorSummary> {
  const stalePaymentCreatedAt = addDays(now, -1);
  const [
    integrationLogs,
    paymentWebhookErrors,
    stalePayments,
    deviceSlotErrors,
    subscriptionErrors,
  ] = await Promise.all([
    prisma.integrationSyncLog.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        errorMessage: true,
        operation: true,
        status: true,
        targetId: true,
        targetType: true,
      },
      take: 1000,
      where: { provider: "XUI" },
    }),
    prisma.plategaWebhookLog.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        errorMessage: true,
        paymentRequestId: true,
        statusRaw: true,
        transactionId: true,
      },
      take: 20,
      where: { processingStatus: "ERROR" },
    }),
    prisma.paymentRequest.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        id: true,
        plategaStatus: true,
        user: { select: { username: true } },
      },
      take: 20,
      where: {
        createdAt: { lt: stalePaymentCreatedAt },
        method: "PLATEGA",
        status: "CREATED",
      },
    }),
    prisma.deviceSlot.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        lastSyncError: true,
        slotIndex: true,
        subscription: {
          select: {
            user: { select: { username: true } },
          },
        },
        updatedAt: true,
      },
      take: 50,
      where: { lastSyncError: { not: null } },
    }),
    prisma.subscription.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        lastSyncError: true,
        tariffName: true,
        updatedAt: true,
        user: { select: { username: true } },
      },
      take: 50,
      where: { lastSyncError: { not: null } },
    }),
  ]);

  const latestXuiByTarget = new Map<string, (typeof integrationLogs)[number]>();
  for (const log of integrationLogs) {
    const key = `${log.targetType}:${log.targetId}:${log.operation}`;
    if (!latestXuiByTarget.has(key)) {
      latestXuiByTarget.set(key, log);
    }
  }

  const unresolvedXuiLogs = Array.from(latestXuiByTarget.values()).filter(
    (log) => log.status === "ERROR"
  );

  const history: AdminDashboardErrorSummary["history"] = [
    ...unresolvedXuiLogs.slice(0, 10).map((item) => ({
      category: "xui" as const,
      createdAt: item.createdAt.toISOString(),
      message: truncateErrorMessage(item.errorMessage),
      object: `${item.targetType.toLowerCase()} ${item.targetId}`,
      source: item.operation,
    })),
    ...paymentWebhookErrors.map((item) => ({
      category: "payments" as const,
      createdAt: item.createdAt.toISOString(),
      message: truncateErrorMessage(item.errorMessage ?? item.statusRaw),
      object: item.paymentRequestId ? `payment ${item.paymentRequestId}` : `tx ${item.transactionId}`,
      source: "platega webhook",
    })),
    ...stalePayments.map((item) => ({
      category: "payments" as const,
      createdAt: item.createdAt.toISOString(),
      message: truncateErrorMessage(item.plategaStatus ?? "Payment is still CREATED after 24h"),
      object: `${item.user.username} / ${item.id}`,
      source: "payment request",
    })),
    ...deviceSlotErrors.map((item) => ({
      category: "deviceSlots" as const,
      createdAt: item.updatedAt.toISOString(),
      message: truncateErrorMessage(item.lastSyncError),
      object: `${item.subscription.user.username} / slot ${item.slotIndex}`,
      source: "device slot",
    })),
    ...subscriptionErrors.map((item) => ({
      category: "subscriptions" as const,
      createdAt: item.updatedAt.toISOString(),
      message: truncateErrorMessage(item.lastSyncError),
      object: `${item.user.username} / ${item.tariffName}`,
      source: "subscription",
    })),
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 20);

  return {
    breakdown: {
      deviceSlots: deviceSlotErrors.length,
      payments: paymentWebhookErrors.length + stalePayments.length,
      subscriptions: subscriptionErrors.length,
      xui: unresolvedXuiLogs.length,
    },
    history,
  };
}

async function buildDashboardKpiDeltaMap(now: Date): Promise<DashboardKpiDeltaMap> {
  const entries = await Promise.all(
    KPI_PERIOD_DAYS.map(async (periodDays) => {
      const currentStart = addDays(now, -periodDays);
      const previousStart = addDays(currentStart, -periodDays);

      const [
        usersCurrent,
        usersPrevious,
        activeSubsCurrent,
        activeSubsPrevious,
        errorsCurrent,
        errorsPrevious,
        revenueCurrent,
        revenuePrevious,
      ] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: currentStart } } }),
        prisma.user.count({ where: { createdAt: { gte: previousStart, lt: currentStart } } }),
        prisma.subscription.count({
          where: { startedAt: { gte: currentStart }, status: "ACTIVE" },
        }),
        prisma.subscription.count({
          where: { startedAt: { gte: previousStart, lt: currentStart }, status: "ACTIVE" },
        }),
        countErrorEventsBetween(currentStart),
        countErrorEventsBetween(previousStart, currentStart),
        prisma.paymentRequest.aggregate({
          _sum: { amountRub: true },
          where: { approvedAt: { gte: currentStart }, method: { not: "CREDITS" }, status: "APPROVED" },
        }),
        prisma.paymentRequest.aggregate({
          _sum: { amountRub: true },
          where: {
            approvedAt: { gte: previousStart, lt: currentStart },
            method: { not: "CREDITS" },
            status: "APPROVED",
          },
        }),
      ]);

      return {
        activeSubscriptions: buildDelta(periodDays, activeSubsCurrent, activeSubsPrevious),
        errors: buildDelta(periodDays, errorsCurrent, errorsPrevious),
        revenue: buildDelta(
          periodDays,
          revenueCurrent._sum.amountRub ?? 0,
          revenuePrevious._sum.amountRub ?? 0
        ),
        totalUsers: buildDelta(periodDays, usersCurrent, usersPrevious),
      };
    })
  );

  return {
    activeSubscriptions: entries.map((entry) => entry.activeSubscriptions),
    errors: entries.map((entry) => entry.errors),
    revenue: entries.map((entry) => entry.revenue),
    totalUsers: entries.map((entry) => entry.totalUsers),
  };
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const generatedReferralCode = getValue(resolvedSearchParams, "generatedReferralCode");
  const generatedPromoCode = getValue(resolvedSearchParams, "generatedPromoCode");
  const codeTab = normalizeCodeTab(getValue(resolvedSearchParams, "codeTab"));

  const now = new Date();

  const [
    dashboardData,
    deltaByKpi,
    errorSummary,
    totalUsers,
    totalRevenueAggregate,
    referralUseRows,
    recentPayments,
    recentCodes,
    recentTickets,
    recentPayouts,
    recentUsers,
    recentRenewals,
  ] = await Promise.all([
    getAdminDashboardData(),
    buildDashboardKpiDeltaMap(now),
    buildCurrentErrorSummary(now),
    prisma.user.count(),
    prisma.paymentRequest.aggregate({
      _sum: { amountRub: true },
      where: { method: { not: "CREDITS" }, status: "APPROVED" },
    }),
    prisma.referralCodeUse.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        referralCode: {
          select: { code: true, ownerUser: { select: { username: true } } },
        },
      },
      take: 200,
      where: { rewardGrantedAt: { not: null } },
    }),
    prisma.paymentRequest.findMany({
      orderBy: { approvedAt: "desc" },
      select: {
        approvedAt: true,
        devices: true,
        months: true,
        user: { select: { username: true } },
      },
      take: 5,
      where: { approvedAt: { not: null }, status: "APPROVED" },
    }),
    prisma.referralCode.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        code: true,
        createdAt: true,
        ownerUser: { select: { username: true } },
      },
      take: 5,
    }),
    prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        id: true,
        user: { select: { username: true } },
      },
      take: 5,
    }),
    prisma.payoutRequest.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        amountRub: true,
        createdAt: true,
        payoutMethod: true,
        status: true,
        user: { select: { username: true } },
      },
      take: 5,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        referralCodeUse: { select: { referralCode: { select: { code: true } } } },
        username: true,
      },
      take: 5,
      where: { role: "USER" },
    }),
    prisma.subscriptionRenewal.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        months: true,
        nextDevices: true,
        subscription: { select: { user: { select: { username: true } } } },
      },
      take: 5,
    }),
  ]);

  const errorsTotal = Object.values(errorSummary.breakdown).reduce((total, value) => total + value, 0);
  const totalRevenue = totalRevenueAggregate._sum.amountRub ?? 0;
  const numberFormatter = new Intl.NumberFormat("ru-RU");

  const topReferrersMap = new Map<string, number>();
  const topReferrersCodeMap = new Map<string, string>();
  for (const row of referralUseRows) {
    const username = row.referralCode.ownerUser?.username;
    if (!username) {
      continue;
    }

    topReferrersMap.set(username, (topReferrersMap.get(username) ?? 0) + 1);
    if (!topReferrersCodeMap.has(username)) {
      topReferrersCodeMap.set(username, row.referralCode.code);
    }
  }

  const topReferrers = Array.from(topReferrersMap.entries())
    .map(([username, invites]) => ({
      invites,
      referralCode: topReferrersCodeMap.get(username) ?? "-",
      username,
    }))
    .sort((a, b) => b.invites - a.invites)
    .slice(0, 5);

  const recentActivity: AdminRecentActivityItem[] = [
    ...recentPayments.map((item) => ({
      actor: item.user.username,
      createdAt: (item.approvedAt ?? now).toISOString(),
      object: `${item.devices} device · ${item.months} mo`,
      text: "paid for",
      type: "payment" as const,
    })),
    ...recentCodes.map((item) => ({
      actor: item.ownerUser?.username ?? "admin",
      createdAt: item.createdAt.toISOString(),
      object: item.code,
      text: "created code",
      type: "code" as const,
    })),
    ...recentTickets.map((item) => ({
      actor: item.user.username,
      createdAt: item.createdAt.toISOString(),
      object: `#${item.id}`,
      text: "opened ticket",
      type: "support" as const,
    })),
    ...recentPayouts.map((item) => ({
      actor: item.status === "PAID" ? "admin" : item.user.username,
      createdAt: item.createdAt.toISOString(),
      object: `${numberFormatter.format(item.amountRub)} ₽ → ${item.payoutMethod}`,
      text: item.status === "PAID" ? "paid out" : "requested",
      type: "payout" as const,
    })),
    ...recentUsers.map((item) => ({
      actor: item.username,
      createdAt: item.createdAt.toISOString(),
      object: item.referralCodeUse?.referralCode.code ?? "no code",
      text: "registered with",
      type: "registration" as const,
    })),
    ...recentRenewals.map((item) => ({
      actor: item.subscription.user.username,
      createdAt: item.createdAt.toISOString(),
      object: `${item.months} mo · ${item.nextDevices} devices`,
      text: "renewed subscription",
      type: "payment" as const,
    })),
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);

  return (
    <AdminOverviewSection
      activeSubscriptions={dashboardData.subscriptionStats.active}
      codesActiveTab={codeTab}
      deltaByKpi={deltaByKpi}
      errorSummary={errorSummary}
      generatedPromoCode={generatedPromoCode}
      generatedReferralCode={generatedReferralCode}
      maxActiveSubscriptions={dashboardData.serviceCapacitySettings.maxActiveSubscriptions}
      errorsTotal={errorsTotal}
      recentActivity={recentActivity}
      revenueTotal={totalRevenue}
      topReferrers={topReferrers}
      totalUsers={totalUsers}
    />
  );
}
