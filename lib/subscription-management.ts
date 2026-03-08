import { prisma } from "@/lib/prisma";

import { ensureBootstrapData } from "./auth";

async function expireSubscriptionsIfNeeded(userId: string) {
  const now = new Date();

  await prisma.subscription.updateMany({
    data: {
      status: "EXPIRED",
    },
    where: {
      OR: [
        {
          expiresAt: {
            lte: now,
          },
        },
        {
          endsAt: {
            lte: now,
          },
        },
      ],
      status: "ACTIVE",
      userId,
    },
  });
}

export async function getAppSubscriptionData(username: string) {
  await ensureBootstrapData();

  const user = await prisma.user.findUnique({
    select: { id: true },
    where: { username },
  });

  if (!user) {
    return null;
  }

  await expireSubscriptionsIfNeeded(user.id);

  const activeSubscription = await prisma.subscription.findFirst({
    include: {
      deviceSlots: {
        orderBy: { slotIndex: "asc" },
      },
      paymentRequest: {
        select: {
          status: true,
        },
      },
    },
    orderBy: [{ startsAt: "desc" }, { startedAt: "desc" }],
    where: {
      status: "ACTIVE",
      userId: user.id,
    },
  });

  const latestSubscriptions = await prisma.subscription.findMany({
    orderBy: [{ startsAt: "desc" }, { startedAt: "desc" }],
    take: 5,
    where: { userId: user.id },
  });

  return {
    activeSubscription,
    latestSubscriptions,
  };
}
