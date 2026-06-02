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
      migrationBannerEnabled: false,
      migrationBannerText: "После миграции нужно получить новую ссылку подписки и обновить ее в приложении.",
      migrationBannerTitle: "Обновите ссылку VPN",
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
    migrationBanner: {
      enabled: settings.migrationBannerEnabled,
      text: settings.migrationBannerText,
      title: settings.migrationBannerTitle,
    },
    maxActiveSubscriptions: settings.maxActiveSubscriptions,
  };
}
