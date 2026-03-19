import { AdminOverviewSection } from "@/components/admin/admin-overview-section";
import { getAdminDashboardData } from "@/lib/admin-code-management";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeCodeTab(value: string | undefined) {
  if (value === "invite" || value === "promo" || value === "referral") {
    return value;
  }

  return "referral";
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const generatedInviteCode = getValue(resolvedSearchParams, "generatedInviteCode");
  const generatedReferralCode = getValue(resolvedSearchParams, "generatedReferralCode");
  const generatedPromoCode = getValue(resolvedSearchParams, "generatedPromoCode");
  const codeTab = normalizeCodeTab(getValue(resolvedSearchParams, "codeTab"));

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const startOfCurrentWeekWindow = new Date(now);
  startOfCurrentWeekWindow.setDate(startOfCurrentWeekWindow.getDate() - 7);

  const startOfPreviousWeekWindow = new Date(startOfCurrentWeekWindow);
  startOfPreviousWeekWindow.setDate(startOfPreviousWeekWindow.getDate() - 7);

  const [
    dashboardData,
    openTickets,
    totalUsers,
    usersThisWeek,
    usersPreviousWeek,
    activeSubsThisWeek,
    activeSubsPreviousWeek,
    openTicketsToday,
    openTicketsYesterday,
    totalRevenueAggregate,
    revenueThisWeekAggregate,
    revenuePreviousWeekAggregate,
    referralUseRows,
  ] = await Promise.all([
    getAdminDashboardData(),
    prisma.supportTicket.count({
      where: {
        status: {
          not: "closed",
        },
      },
    }),
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: {
          gte: startOfCurrentWeekWindow,
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: startOfPreviousWeekWindow,
          lt: startOfCurrentWeekWindow,
        },
      },
    }),
    prisma.subscription.count({
      where: {
        startedAt: {
          gte: startOfCurrentWeekWindow,
        },
        status: "ACTIVE",
      },
    }),
    prisma.subscription.count({
      where: {
        startedAt: {
          gte: startOfPreviousWeekWindow,
          lt: startOfCurrentWeekWindow,
        },
        status: "ACTIVE",
      },
    }),
    prisma.supportTicket.count({
      where: {
        createdAt: {
          gte: startOfToday,
        },
        status: {
          not: "closed",
        },
      },
    }),
    prisma.supportTicket.count({
      where: {
        createdAt: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
        status: {
          not: "closed",
        },
      },
    }),
    prisma.paymentRequest.aggregate({
      _sum: {
        amountRub: true,
      },
      where: {
        status: "APPROVED",
      },
    }),
    prisma.paymentRequest.aggregate({
      _sum: {
        amountRub: true,
      },
      where: {
        approvedAt: {
          gte: startOfCurrentWeekWindow,
        },
        status: "APPROVED",
      },
    }),
    prisma.paymentRequest.aggregate({
      _sum: {
        amountRub: true,
      },
      where: {
        approvedAt: {
          gte: startOfPreviousWeekWindow,
          lt: startOfCurrentWeekWindow,
        },
        status: "APPROVED",
      },
    }),
    prisma.referralCodeUse.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        referralCode: {
          select: {
            code: true,
            ownerUser: {
              select: { username: true },
            },
          },
        },
      },
      take: 200,
      where: {
        rewardGrantedAt: {
          not: null,
        },
      },
    }),
  ]);

  const totalRevenue = totalRevenueAggregate._sum.amountRub ?? 0;
  const usersTrend = usersThisWeek - usersPreviousWeek;
  const activeSubsTrend = activeSubsThisWeek - activeSubsPreviousWeek;
  const openTicketsTrend = openTicketsToday - openTicketsYesterday;
  const revenueTrend =
    (revenueThisWeekAggregate._sum.amountRub ?? 0) -
    (revenuePreviousWeekAggregate._sum.amountRub ?? 0);
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
    .slice(0, 12);

  return (
    <AdminOverviewSection
      activeSubscriptions={dashboardData.subscriptionStats.active}
      activeSubscriptionsTrend={activeSubsTrend}
      maxActiveSubscriptions={dashboardData.serviceCapacitySettings.maxActiveSubscriptions}
      openTickets={openTickets}
      openTicketsTrend={openTicketsTrend}
      revenueTotal={totalRevenue}
      revenueTrend={revenueTrend}
      totalUsers={totalUsers}
      totalUsersTrend={usersTrend}
      topReferrers={topReferrers}
      codesActiveTab={codeTab}
      generatedInviteCode={generatedInviteCode}
      generatedPromoCode={generatedPromoCode}
      generatedReferralCode={generatedReferralCode}
    />
  );
}
