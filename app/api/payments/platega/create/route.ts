import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isActiveSubscriptionsLimitReached } from "@/lib/service-capacity";
import { calculateSubscriptionPrice, getAppSubscriptionConstructorData } from "@/lib/subscription-constructor";
import { createPlategaTransaction, PlategaApiError } from "@/server/services/platega/client";

const createPlategaPaymentSchema = z.object({
  amount: z.number().int().positive().optional(),
  description: z.string().trim().min(1).max(240).optional(),
  devices: z.number().int().positive(),
  months: z.number().int().positive(),
  orderId: z.string().trim().min(1).max(120).optional(),
  userId: z.string().trim().min(1).max(120).optional(),
});

function normalizeDiscountPct(discountPct: number) {
  return Math.max(0, Math.min(100, discountPct));
}

async function getFirstPurchaseReferralDiscountPct(userId: string) {
  const [approvedPaymentsCount, referralCodeUse] = await Promise.all([
    prisma.paymentRequest.count({
      where: {
        status: "APPROVED",
        userId,
      },
    }),
    prisma.referralCodeUse.findUnique({
      select: {
        discountPctSnapshot: true,
      },
      where: {
        referredUserId: userId,
      },
    }),
  ]);

  if (approvedPaymentsCount > 0 || !referralCodeUse) {
    return 0;
  }

  return normalizeDiscountPct(referralCodeUse.discountPctSnapshot);
}

function buildConstructorTariffName(months: number, devices: number) {
  return `Constructor: ${months}m / ${devices} devices`;
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    select: { id: true },
    where: { username: session.username },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса." }, { status: 400 });
  }

  const parsedPayload = createPlategaPaymentSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return NextResponse.json({ error: "Некорректные параметры оплаты." }, { status: 400 });
  }

  const { devices, months } = parsedPayload.data;

  const [{ durationRules, pricingSettings }, referralDiscountPct, openPaymentRequest, activeSubscription] =
    await Promise.all([
      getAppSubscriptionConstructorData(),
      getFirstPurchaseReferralDiscountPct(user.id),
      prisma.paymentRequest.findFirst({
        where: {
          status: {
            in: ["CREATED"],
          },
          userId: user.id,
        },
      }),
      prisma.subscription.findFirst({
        include: {
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
      }),
    ]);

  if (openPaymentRequest) {
    return NextResponse.json(
      { error: "У вас уже есть незавершенный платеж. Дождитесь его завершения." },
      { status: 409 }
    );
  }

  if (devices < pricingSettings.minDevices || devices > pricingSettings.maxDevices) {
    return NextResponse.json(
      {
        error: `Количество устройств должно быть в диапазоне ${pricingSettings.minDevices}..${pricingSettings.maxDevices}.`,
      },
      { status: 400 }
    );
  }

  const durationRule = durationRules.find((item) => item.months === months);
  if (!durationRule) {
    return NextResponse.json({ error: "Выбранный срок отключен администратором." }, { status: 400 });
  }

  if (activeSubscription && activeSubscription.paymentRequest?.status !== "APPROVED") {
    return NextResponse.json(
      {
        error:
          "Продление доступно только после подтверждения администратором текущей оплаты подписки.",
      },
      { status: 400 }
    );
  }

  if (!activeSubscription) {
    const [settings, activeSubscriptionsCount] = await Promise.all([
      prisma.serviceCapacitySettings.upsert({
        create: {
          id: 1,
          maxActiveSubscriptions: 0,
        },
        update: {},
        where: { id: 1 },
      }),
      prisma.subscription.count({
        where: { status: "ACTIVE" },
      }),
    ]);

    if (
      isActiveSubscriptionsLimitReached({
        activeSubscriptionsCount,
        maxActiveSubscriptions: settings.maxActiveSubscriptions,
      })
    ) {
      return NextResponse.json({ error: "Свободных мест сейчас нет." }, { status: 409 });
    }
  }

  const price = calculateSubscriptionPrice({
    baseDeviceMonthlyPrice: pricingSettings.baseDeviceMonthlyPrice,
    devices,
    durationDiscountPercent: durationRule.discountPercent,
    extraDeviceMonthlyPrice: pricingSettings.extraDeviceMonthlyPrice,
    months,
    referralDiscountPercent: referralDiscountPct,
    vpnMonthlyPrice: durationRule.monthlyPrice,
  });

  if (
    typeof parsedPayload.data.amount === "number" &&
    parsedPayload.data.amount !== price.finalTotalRub
  ) {
    return NextResponse.json({ error: "Сумма платежа устарела, обновите страницу." }, { status: 409 });
  }

  const paymentRequest = await prisma.paymentRequest.create({
    data: {
      amountRub: price.finalTotalRub,
      baseDeviceMonthlyPriceSnapshot: price.baseDeviceMonthlyPrice,
      currency: "RUB",
      deviceLimit: price.devices,
      devices: price.devices,
      durationDiscountPercentSnapshot: price.durationDiscountPercent,
      extraDeviceMonthlyPriceSnapshot: price.extraDeviceMonthlyPrice,
      method: "PLATEGA",
      monthlyPriceSnapshot: price.monthlyPrice,
      months: price.months,
      periodMonths: price.months,
      referralDiscountPercentSnapshot: price.referralDiscountPercent,
      status: "CREATED",
      tariffName: buildConstructorTariffName(price.months, price.devices),
      totalPriceBeforeDiscountRubSnapshot: price.totalBeforeDiscountRub,
      userId: user.id,
    },
  });

  const origin = new URL(request.url).origin;
  const statusPageUrl = `${origin}/app?plategaPaymentRequestId=${paymentRequest.id}`;
  const payloadJson = JSON.stringify({
    amountRub: price.finalTotalRub,
    orderId: parsedPayload.data.orderId ?? paymentRequest.id,
    paymentRequestId: paymentRequest.id,
    userId: parsedPayload.data.userId ?? user.id,
  });
  const description =
    parsedPayload.data.description ??
    `PulsarVPN: ${price.months} мес. / ${price.devices} устройств`;

  try {
    const transaction = await createPlategaTransaction({
      amount: price.finalTotalRub,
      description,
      failedUrl: statusPageUrl,
      orderId: paymentRequest.id,
      payload: payloadJson,
      returnUrl: statusPageUrl,
    });

    await prisma.paymentRequest.update({
      data: {
        plategaPayloadJson: payloadJson,
        plategaRedirectUrl: transaction.redirectUrl,
        plategaStatus: transaction.status ?? "PENDING",
        plategaTransactionId: transaction.transactionId,
      },
      where: {
        id: paymentRequest.id,
      },
    });

    return NextResponse.json({
      paymentRequestId: paymentRequest.id,
      redirectUrl: transaction.redirectUrl,
    });
  } catch (error) {
    const message =
      error instanceof PlategaApiError
        ? error.responseBody || error.message
        : error instanceof Error
          ? error.message
          : "Не удалось создать платеж в Platega.";

    await prisma.paymentRequest.update({
      data: {
        plategaPayloadJson: JSON.stringify({
          error: message.slice(0, 2000),
          payload: payloadJson,
        }),
        plategaStatus: "CREATE_FAILED",
        rejectedAt: new Date(),
        status: "REJECTED",
      },
      where: {
        id: paymentRequest.id,
      },
    });

    return NextResponse.json({ error: "Не удалось создать платеж в Platega." }, { status: 502 });
  }
}
