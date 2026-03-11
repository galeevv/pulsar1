import { prisma } from "@/lib/prisma";

export function isActiveSubscriptionsLimitReached(input: {
  activeSubscriptionsCount: number;
  maxActiveSubscriptions: number;
}) {
  return input.maxActiveSubscriptions > 0 && input.activeSubscriptionsCount >= input.maxActiveSubscriptions;
}

export async function getServiceCapacitySettings() {
  return prisma.serviceCapacitySettings.upsert({
    create: {
      id: 1,
      maxActiveSubscriptions: 0,
    },
    update: {},
    where: { id: 1 },
  });
}

export async function getServiceCapacityState() {
  const [settings, activeSubscriptionsCount] = await Promise.all([
    getServiceCapacitySettings(),
    prisma.subscription.count({
      where: { status: "ACTIVE" },
    }),
  ]);

  return {
    activeSubscriptionsCount,
    isLimitReached: isActiveSubscriptionsLimitReached({
      activeSubscriptionsCount,
      maxActiveSubscriptions: settings.maxActiveSubscriptions,
    }),
    maxActiveSubscriptions: settings.maxActiveSubscriptions,
  };
}
