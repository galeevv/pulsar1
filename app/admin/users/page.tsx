import { AdminUsersSection, type AdminUsersListItem } from "@/components/admin/admin-users-section";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type SubscriptionFilter = "all" | "active" | "expired" | "none" | "revoked";
type UsersSort =
  | "newest"
  | "oldest"
  | "credits_desc"
  | "last_payment_desc"
  | "active_subscription_first";

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
    value === "revoked" ||
    value === "all"
  ) {
    return value;
  }

  return "all";
}

function normalizeSort(value: string | undefined): UsersSort {
  if (
    value === "newest" ||
    value === "oldest" ||
    value === "credits_desc" ||
    value === "last_payment_desc" ||
    value === "active_subscription_first"
  ) {
    return value;
  }

  return "newest";
}

function parsePositiveInt(rawValue: string | undefined, fallback: number) {
  const value = Number.parseInt(rawValue ?? "", 10);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function getLastPaymentTimestamp(value: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }

  return parsed.getTime();
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
  const requestedPerPage = parsePositiveInt(getValue(resolvedSearchParams, "perPage"), 20);
  const perPage = requestedPerPage === 50 ? 50 : 20;

  const rawUsers = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
      credits: true,
      id: true,
      inviteCodesUsed: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          code: true,
        },
        take: 1,
      },
      paymentRequests: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          approvedAt: true,
          createdAt: true,
        },
        take: 1,
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
        },
        take: 1,
      },
      subscriptions: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          devices: true,
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
          : "revoked"
      : "none";
    const invitedByInviteCode = user.inviteCodesUsed[0]?.code ?? null;
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
      invitedByCode: invitedByInviteCode ?? invitedByReferralCode,
      invitedByType: invitedByInviteCode
        ? "invite"
        : invitedByReferralCode
          ? "referral"
          : "none",
      lastPaymentAt,
      ownReferralCode: user.referralCodesCreated[0]?.code ?? null,
      subscriptionState,
      username: user.username,
    };
  });

  if (subscriptionFilter !== "all") {
    users = users.filter((user) => user.subscriptionState === subscriptionFilter);
  }

  users.sort((left, right) => {
    if (sort === "oldest") {
      return getJoinedTimestamp(left.createdAt) - getJoinedTimestamp(right.createdAt);
    }

    if (sort === "credits_desc") {
      return (
        right.credits - left.credits ||
        getJoinedTimestamp(right.createdAt) - getJoinedTimestamp(left.createdAt)
      );
    }

    if (sort === "last_payment_desc") {
      return (
        getLastPaymentTimestamp(right.lastPaymentAt) - getLastPaymentTimestamp(left.lastPaymentAt) ||
        getJoinedTimestamp(right.createdAt) - getJoinedTimestamp(left.createdAt)
      );
    }

    if (sort === "active_subscription_first") {
      const leftWeight = left.subscriptionState === "active" ? 0 : 1;
      const rightWeight = right.subscriptionState === "active" ? 0 : 1;

      return (
        leftWeight - rightWeight ||
        getLastPaymentTimestamp(right.lastPaymentAt) - getLastPaymentTimestamp(left.lastPaymentAt) ||
        getJoinedTimestamp(right.createdAt) - getJoinedTimestamp(left.createdAt)
      );
    }

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
