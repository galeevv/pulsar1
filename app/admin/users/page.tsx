import { AdminUsersSection, type AdminUsersListItem } from "@/components/admin/admin-users-section";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type SubscriptionFilter = "all" | "active" | "expired" | "none";
type UsersSort =
  | "newest";

function getValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSubscriptionFilter(value: string | undefined): SubscriptionFilter {
  if (
    value === "active" ||
    value === "expired" ||
    value === "none" ||
    value === "all"
  ) {
    return value;
  }

  return "all";
}

function normalizeSort(value: string | undefined): UsersSort {
  void value;
  return "newest";
}

function parsePositiveInt(rawValue: string | undefined, fallback: number) {
  const value = Number.parseInt(rawValue ?? "", 10);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function getJoinedTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }

  return parsed.getTime();
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const searchQuery = (getValue(resolvedSearchParams, "q") ?? "").trim();
  const searchQueryNormalized = searchQuery.toLowerCase();
  const subscriptionFilter = normalizeSubscriptionFilter(
    getValue(resolvedSearchParams, "subscription")
  );
  const sort = normalizeSort(getValue(resolvedSearchParams, "sort"));
  const page = parsePositiveInt(getValue(resolvedSearchParams, "page"), 1);
  const perPage = 10 as const;

  const rawUsers = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
      credits: true,
      id: true,
      paymentRequests: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          amountRub: true,
          approvedAt: true,
          createdAt: true,
          method: true,
          status: true,
          tariffName: true,
        },
        take: 10,
      },
      referralCodeUse: {
        select: {
          referralCode: {
            select: {
              code: true,
            },
          },
        },
      },
      referralCodesCreated: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          code: true,
          uses: {
            select: {
              id: true,
            },
          },
        },
        take: 1,
      },
      subscriptions: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          devices: true,
          endsAt: true,
          expiresAt: true,
          status: true,
        },
        take: 1,
      },
      username: true,
    },
    where: {
      role: "USER",
      ...(searchQueryNormalized
        ? {
            username: {
              contains: searchQueryNormalized,
            },
          }
        : {}),
    },
  });

  let users: AdminUsersListItem[] = rawUsers.map((user) => {
    const latestSubscription = user.subscriptions[0] ?? null;
    const subscriptionState: AdminUsersListItem["subscriptionState"] = latestSubscription
      ? latestSubscription.status === "ACTIVE"
        ? "active"
        : latestSubscription.status === "EXPIRED"
          ? "expired"
          : "expired"
      : "none";
    const invitedByReferralCode = user.referralCodeUse?.referralCode.code ?? null;
    const lastPayment = user.paymentRequests[0] ?? null;
    const lastPaymentAt = lastPayment
      ? (lastPayment.approvedAt ?? lastPayment.createdAt).toISOString()
      : null;

    return {
      createdAt: user.createdAt.toISOString(),
      credits: user.credits,
      devices: latestSubscription ? latestSubscription.devices : null,
      id: user.id,
      invitedByCode: invitedByReferralCode,
      invitedByType: invitedByReferralCode ? "referral" : "none",
      invitedCount: user.referralCodesCreated[0]?.uses.length ?? 0,
      lastPaymentAt,
      payments: user.paymentRequests.map((payment) => ({
        amountRub: payment.amountRub,
        date: (payment.approvedAt ?? payment.createdAt).toISOString(),
        method: payment.method,
        status: payment.status,
        tariff: payment.tariffName,
      })),
      ownReferralCode: user.referralCodesCreated[0]?.code ?? null,
      subscriptionEndsAt:
        latestSubscription?.expiresAt?.toISOString() ?? latestSubscription?.endsAt?.toISOString() ?? null,
      subscriptionState,
      username: user.username,
    };
  });

  if (subscriptionFilter !== "all") {
    users = users.filter((user) => user.subscriptionState === subscriptionFilter);
  }

  users.sort((left, right) => {
    void sort;
    return getJoinedTimestamp(right.createdAt) - getJoinedTimestamp(left.createdAt);
  });

  const totalUsers = users.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / perPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const from = totalUsers === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = totalUsers === 0 ? 0 : Math.min(safePage * perPage, totalUsers);
  const paginatedUsers = users.slice((safePage - 1) * perPage, safePage * perPage);

  return (
    <AdminUsersSection
      filters={{
        page: safePage,
        perPage,
        query: searchQuery,
        sort,
        subscription: subscriptionFilter,
      }}
      pagination={{
        from,
        to,
        total: totalUsers,
        totalPages,
      }}
      users={paginatedUsers}
    />
  );
}
