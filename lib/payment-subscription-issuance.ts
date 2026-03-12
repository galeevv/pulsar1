import type { Prisma } from "@/generated/prisma";
import { isActiveSubscriptionsLimitReached } from "@/lib/service-capacity";

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export type PaidPaymentRequestSnapshot = {
  amountRub: number;
  baseDeviceMonthlyPriceSnapshot: number;
  currency: string;
  deviceLimit: number;
  devices: number;
  durationDiscountPercentSnapshot: number;
  extraDeviceMonthlyPriceSnapshot: number;
  id: string;
  monthlyPriceSnapshot: number;
  months: number;
  referralDiscountPercentSnapshot: number;
  tariffName: string;
};

export async function createSubscriptionFromPaidRequest(input: {
  now: Date;
  paymentRequest: PaidPaymentRequestSnapshot;
  tx: Prisma.TransactionClient;
  userId: string;
}) {
  const activeSubscription = await input.tx.subscription.findFirst({
    orderBy: [{ startsAt: "desc" }, { startedAt: "desc" }],
    where: {
      status: "ACTIVE",
      userId: input.userId,
    },
  });
  const serviceCapacitySettings = await input.tx.serviceCapacitySettings.upsert({
    create: {
      id: 1,
      maxActiveSubscriptions: 0,
    },
    update: {},
    where: { id: 1 },
  });

  if (!activeSubscription && serviceCapacitySettings.maxActiveSubscriptions > 0) {
    const activeSubscriptionsCount = await input.tx.subscription.count({
      where: {
        status: "ACTIVE",
      },
    });

    if (
      isActiveSubscriptionsLimitReached({
        activeSubscriptionsCount,
        maxActiveSubscriptions: serviceCapacitySettings.maxActiveSubscriptions,
      })
    ) {
      throw new Error("ACTIVE_SUBSCRIPTIONS_LIMIT_REACHED");
    }
  }

  const now = input.now;
  const previousStartAt = activeSubscription?.startsAt ?? activeSubscription?.startedAt ?? now;
  const extensionBaseDate = activeSubscription?.expiresAt ?? activeSubscription?.endsAt ?? now;
  const nextExpiresAt = addMonths(extensionBaseDate, input.paymentRequest.months);
  const nextMonthsPurchased =
    (activeSubscription?.monthsPurchased ?? activeSubscription?.periodMonths ?? 0) +
    input.paymentRequest.months;
  const nextTotalPaid = (activeSubscription?.totalPaid ?? 0) + input.paymentRequest.amountRub;

  if (activeSubscription) {
    await input.tx.subscription.update({
      data: {
        marzbanUsername: null,
        revokedAt: now,
        status: "REVOKED",
      },
      where: {
        id: activeSubscription.id,
      },
    });

    await input.tx.deviceSlot.updateMany({
      data: {
        status: "BLOCKED",
      },
      where: {
        subscriptionId: activeSubscription.id,
      },
    });
  }

  const createdSubscription = await input.tx.subscription.create({
    data: {
      baseDeviceMonthlyPriceSnapshot: input.paymentRequest.baseDeviceMonthlyPriceSnapshot,
      currency: input.paymentRequest.currency,
      deviceLimit: input.paymentRequest.deviceLimit,
      devices: input.paymentRequest.devices,
      durationDiscountPercentSnapshot: input.paymentRequest.durationDiscountPercentSnapshot,
      endsAt: nextExpiresAt,
      expiresAt: nextExpiresAt,
      extraDeviceMonthlyPriceSnapshot: input.paymentRequest.extraDeviceMonthlyPriceSnapshot,
      monthlyPriceSnapshot: input.paymentRequest.monthlyPriceSnapshot,
      monthsPurchased: nextMonthsPurchased,
      paymentRequestId: input.paymentRequest.id,
      pendingDevices: null,
      periodMonths: input.paymentRequest.months,
      referralDiscountPercentSnapshot: input.paymentRequest.referralDiscountPercentSnapshot,
      startsAt: previousStartAt,
      startedAt: previousStartAt,
      status: "ACTIVE",
      tariffName: input.paymentRequest.tariffName,
      totalPaid: nextTotalPaid,
      userId: input.userId,
    },
  });

  await input.tx.deviceSlot.createMany({
    data: Array.from({ length: input.paymentRequest.devices }, (_, index) => ({
      label: `Device ${index + 1}`,
      slotIndex: index + 1,
      status: "FREE",
      subscriptionId: createdSubscription.id,
    })),
  });

  return {
    createdSubscriptionId: createdSubscription.id,
    revokedSubscriptionId: activeSubscription?.id ?? null,
  };
}
