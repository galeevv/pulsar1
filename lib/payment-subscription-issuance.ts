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
  periodMonths?: number;
  referralDiscountPercentSnapshot: number;
  tariffName: string;
};

export async function createSubscriptionFromPaidRequest(input: {
  now: Date;
  paymentRequest: PaidPaymentRequestSnapshot;
  tx: Prisma.TransactionClient;
  userId: string;
}) {
  await input.tx.userOperationLock.upsert({
    create: {
      lockedAt: input.now,
      operation: "subscription_payment",
      userId: input.userId,
    },
    update: {
      lockedAt: input.now,
      operation: "subscription_payment",
    },
    where: { userId: input.userId },
  });

  const activeSubscription = await input.tx.subscription.findFirst({
    include: {
      deviceSlots: {
        select: {
          slotIndex: true,
        },
      },
    },
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
    const updatedSubscription = await input.tx.subscription.update({
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
        pendingDevices: null,
        periodMonths: input.paymentRequest.months,
        referralDiscountPercentSnapshot: input.paymentRequest.referralDiscountPercentSnapshot,
        status: "ACTIVE",
        tariffName: input.paymentRequest.tariffName,
        totalPaid: nextTotalPaid,
      },
      where: {
        id: activeSubscription.id,
      },
    });

    await input.tx.subscriptionRenewal.create({
      data: {
        amountRub: input.paymentRequest.amountRub,
        baseDeviceMonthlyPriceSnapshot: input.paymentRequest.baseDeviceMonthlyPriceSnapshot,
        currency: input.paymentRequest.currency,
        durationDiscountPercentSnapshot: input.paymentRequest.durationDiscountPercentSnapshot,
        extraDeviceMonthlyPriceSnapshot: input.paymentRequest.extraDeviceMonthlyPriceSnapshot,
        monthlyPriceSnapshot: input.paymentRequest.monthlyPriceSnapshot,
        months: input.paymentRequest.months,
        nextDevices: input.paymentRequest.devices,
        nextExpiresAt,
        paymentRequestId: input.paymentRequest.id,
        previousDevices: activeSubscription.devices,
        previousExpiresAt: activeSubscription.expiresAt ?? activeSubscription.endsAt,
        referralDiscountPercentSnapshot: input.paymentRequest.referralDiscountPercentSnapshot,
        subscriptionId: activeSubscription.id,
      },
    });

    const existingSlotIndexes = new Set(
      activeSubscription.deviceSlots.map((slot) => slot.slotIndex)
    );
    const missingSlots = Array.from(
      { length: input.paymentRequest.devices },
      (_, index) => index + 1
    ).filter((slotIndex) => !existingSlotIndexes.has(slotIndex));

    if (missingSlots.length > 0) {
      await input.tx.deviceSlot.createMany({
        data: missingSlots.map((slotIndex) => ({
          label: `Device ${slotIndex}`,
          slotIndex,
          status: "FREE",
          subscriptionId: activeSubscription.id,
        })),
      });
    }

    return {
      createdSubscriptionId: updatedSubscription.id,
      revokedSubscriptionId: null,
    };
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

  await input.tx.subscriptionRenewal.create({
    data: {
      amountRub: input.paymentRequest.amountRub,
      baseDeviceMonthlyPriceSnapshot: input.paymentRequest.baseDeviceMonthlyPriceSnapshot,
      currency: input.paymentRequest.currency,
      durationDiscountPercentSnapshot: input.paymentRequest.durationDiscountPercentSnapshot,
      extraDeviceMonthlyPriceSnapshot: input.paymentRequest.extraDeviceMonthlyPriceSnapshot,
      monthlyPriceSnapshot: input.paymentRequest.monthlyPriceSnapshot,
      months: input.paymentRequest.months,
      nextDevices: input.paymentRequest.devices,
      nextExpiresAt,
      paymentRequestId: input.paymentRequest.id,
      previousDevices: 0,
      previousExpiresAt: null,
      referralDiscountPercentSnapshot: input.paymentRequest.referralDiscountPercentSnapshot,
      subscriptionId: createdSubscription.id,
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
    revokedSubscriptionId: null,
  };
}
