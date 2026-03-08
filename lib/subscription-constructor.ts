import { prisma } from "@/lib/prisma";
export const DEFAULT_DURATION_MONTHS = [1, 3, 6, 12] as const;

const DEFAULT_DURATION_DISCOUNTS: Record<number, number> = {
  1: 0,
  3: 5,
  6: 10,
  12: 20,
};

const DEFAULT_PRICING_SETTINGS = {
  baseDeviceMonthlyPrice: 299,
  extraDeviceMonthlyPrice: 100,
  maxDevices: 5,
  minDevices: 1,
};

async function ensureDurationMonthlyPriceColumn() {
  const columns = (await prisma.$queryRawUnsafe(
    'PRAGMA table_info("SubscriptionDurationRule")'
  )) as Array<{ name: string }>;
  const hasMonthlyPrice = columns.some((column) => column.name === "monthlyPrice");

  if (!hasMonthlyPrice) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "SubscriptionDurationRule" ADD COLUMN "monthlyPrice" INTEGER NOT NULL DEFAULT 299'
    );
  }
}

export { applyPercentDiscount, calculateSubscriptionPrice } from "@/lib/subscription-pricing";

export async function ensureSubscriptionConstructorDefaults() {
  await ensureDurationMonthlyPriceColumn();

  await prisma.subscriptionPricingSettings.upsert({
    create: {
      ...DEFAULT_PRICING_SETTINGS,
      id: 1,
    },
    update: {},
    where: { id: 1 },
  });

  const existingRules = await prisma.subscriptionDurationRule.findMany({
    select: { months: true },
  });
  const existingMonths = new Set(existingRules.map((item) => item.months));
  const missingRules = DEFAULT_DURATION_MONTHS.filter((months) => !existingMonths.has(months)).map(
    (months) => ({
      discountPercent: DEFAULT_DURATION_DISCOUNTS[months] ?? 0,
      isActive: true,
      monthlyPrice: DEFAULT_PRICING_SETTINGS.baseDeviceMonthlyPrice,
      months,
    })
  );

  if (missingRules.length > 0) {
    await prisma.subscriptionDurationRule.createMany({
      data: missingRules,
    });
  }
}

export async function getAppSubscriptionConstructorData() {
  await ensureSubscriptionConstructorDefaults();

  const [pricingSettings, durationRules] = await Promise.all([
    prisma.subscriptionPricingSettings.findUnique({
      where: { id: 1 },
    }),
    prisma.subscriptionDurationRule.findMany({
      orderBy: { months: "asc" },
      where: {
        isActive: true,
      },
    }),
  ]);

  if (!pricingSettings) {
    throw new Error("Subscription pricing settings are missing.");
  }

  return {
    durationRules,
    pricingSettings,
  };
}

export async function getAdminSubscriptionConstructorData() {
  await ensureSubscriptionConstructorDefaults();

  const [pricingSettings, durationRules] = await Promise.all([
    prisma.subscriptionPricingSettings.findUnique({
      where: { id: 1 },
    }),
    prisma.subscriptionDurationRule.findMany({
      orderBy: { months: "asc" },
    }),
  ]);

  if (!pricingSettings) {
    throw new Error("Subscription pricing settings are missing.");
  }

  return {
    durationRules,
    pricingSettings,
  };
}
