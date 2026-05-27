import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isActiveSubscriptionsLimitReached } from "@/lib/service-capacity";
import {
  calculateSubscriptionPrice,
  getAppSubscriptionConstructorData,
} from "@/lib/subscription-constructor";
import { createPlategaTransaction, PlategaApiError } from "@/server/services/platega/client";

const createPlategaPaymentSchema = z.object({
  amount: z.number().int().positive().optional(),
  description: z.string().trim().min(1).max(240).optional(),
  devices: z.number().int().positive(),
  months: z.number().int().min(0),
  orderId: z.string().trim().min(1).max(120).optional(),
  plategaPaymentMethod: z.enum(["CARD", "SBP"]).optional(),
  purpose: z.enum(["SUBSCRIPTION", "DEVICE_LIMIT_CHANGE"]).optional(),
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

function getRemainingSubscriptionDays(now: Date, expiresAt: Date) {
  const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());
  return Math.max(1, Math.ceil(remainingMs / 86_400_000));
}

function buildPlategaRedirectTarget(params: {
  fallbackRequestUrl: string;
  paymentRequestId: string;
  configuredUrl: string | undefined;
}) {
  const fallbackUrl = new URL("/app", params.fallbackRequestUrl);
  fallbackUrl.searchParams.set("plategaPaymentRequestId", params.paymentRequestId);

  if (!params.configuredUrl?.trim()) {
    return fallbackUrl.toString();
  }

  try {
    const configured = new URL(params.configuredUrl, params.fallbackRequestUrl);
    configured.searchParams.set("plategaPaymentRequestId", params.paymentRequestId);
    return configured.toString();
  } catch {
    return fallbackUrl.toString();
  }
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
  const purpose = parsedPayload.data.purpose ?? "SUBSCRIPTION";

  const [{ durationRules, pricingSettings }, referralDiscountPct, activeSubscription] =
    await Promise.all([
      getAppSubscriptionConstructorData(),
      getFirstPurchaseReferralDiscountPct(user.id),
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

  if (devices < pricingSettings.minDevices || devices > pricingSettings.maxDevices) {
    return NextResponse.json(
      {
        error: `Количество устройств должно быть в диапазоне ${pricingSettings.minDevices}..${pricingSettings.maxDevices}.`,
      },
      { status: 400 }
    );
  }

  if (purpose === "DEVICE_LIMIT_CHANGE") {
    if (!activeSubscription) {
      return NextResponse.json({ error: "Нет активной подписки." }, { status: 400 });
    }

    if (devices <= activeSubscription.devices) {
      return NextResponse.json(
        { error: "Новый лимит должен быть больше текущего." },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = activeSubscription.expiresAt ?? activeSubscription.endsAt;
    const remainingDays = getRemainingSubscriptionDays(now, expiresAt);
    const extraDevices = devices - activeSubscription.devices;
    const amountRub = Math.ceil(
      (extraDevices * pricingSettings.extraDeviceMonthlyPrice * remainingDays) / 30
    );

    if (
      typeof parsedPayload.data.amount === "number" &&
      parsedPayload.data.amount !== amountRub
    ) {
      return NextResponse.json({ error: "Сумма платежа устарела, обновите страницу." }, { status: 409 });
    }

    const selectedPlategaPaymentMethod = parsedPayload.data.plategaPaymentMethod ?? "SBP";
    const replacementTimestamp = new Date();
    const paymentRequest = await prisma.$transaction(async (tx) => {
      await tx.paymentRequest.updateMany({
        data: {
          plategaStatus: "REPLACED_BY_NEW_REQUEST",
          rejectedAt: replacementTimestamp,
          status: "REJECTED",
        },
        where: {
          status: "CREATED",
          userId: user.id,
        },
      });

      return tx.paymentRequest.create({
        data: {
          amountRub,
          baseDeviceMonthlyPriceSnapshot: activeSubscription.baseDeviceMonthlyPriceSnapshot,
          currency: activeSubscription.currency,
          deviceLimit: devices,
          devices,
          durationDiscountPercentSnapshot: activeSubscription.durationDiscountPercentSnapshot,
          extraDeviceMonthlyPriceSnapshot: pricingSettings.extraDeviceMonthlyPrice,
          method: "PLATEGA",
          monthlyPriceSnapshot: activeSubscription.monthlyPriceSnapshot,
          months: 0,
          periodMonths: 0,
          referralDiscountPercentSnapshot: activeSubscription.referralDiscountPercentSnapshot,
          status: "CREATED",
          tariffName: `Device limit: ${activeSubscription.devices} -> ${devices}`,
          totalPriceBeforeDiscountRubSnapshot: amountRub,
          userId: user.id,
        },
      });
    });

    const returnUrl = buildPlategaRedirectTarget({
      configuredUrl: process.env.PLATEGA_RETURN_URL,
      fallbackRequestUrl: request.url,
      paymentRequestId: paymentRequest.id,
    });
    const failedUrl = buildPlategaRedirectTarget({
      configuredUrl: process.env.PLATEGA_FAILED_URL,
      fallbackRequestUrl: request.url,
      paymentRequestId: paymentRequest.id,
    });
    const payloadJson = JSON.stringify({
      amountRub,
      orderId: parsedPayload.data.orderId ?? paymentRequest.id,
      paymentMethod: selectedPlategaPaymentMethod,
      paymentRequestId: paymentRequest.id,
      purpose,
      userId: parsedPayload.data.userId ?? user.id,
    });
    const description =
      parsedPayload.data.description ??
      `PulsarVPN: лимит устройств ${activeSubscription.devices} -> ${devices}`;

    try {
      const transaction = await createPlategaTransaction({
        amount: amountRub,
        description,
        failedUrl,
        orderId: paymentRequest.id,
        payload: payloadJson,
        paymentMethod: selectedPlategaPaymentMethod,
        returnUrl,
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

  if (months <= 0) {
    return NextResponse.json({ error: "Выбранный срок отключен администратором." }, { status: 400 });
  }

  const durationRule = durationRules.find((item) => item.months === months);
  if (!durationRule) {
    return NextResponse.json({ error: "Выбранный срок отключен администратором." }, { status: 400 });
  }

  if (activeSubscription && activeSubscription.paymentRequest?.status !== "APPROVED") {
    return NextResponse.json(
      {
        error:
          "Продление доступно только после завершения текущего платежа.",
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

  const selectedPlategaPaymentMethod = parsedPayload.data.plategaPaymentMethod ?? "SBP";
  const replacementTimestamp = new Date();
  const paymentRequest = await prisma.$transaction(async (tx) => {
    await tx.paymentRequest.updateMany({
      data: {
        plategaStatus: "REPLACED_BY_NEW_REQUEST",
        rejectedAt: replacementTimestamp,
        status: "REJECTED",
      },
      where: {
        status: "CREATED",
        userId: user.id,
      },
    });

    return tx.paymentRequest.create({
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
  });

  const returnUrl = buildPlategaRedirectTarget({
    configuredUrl: process.env.PLATEGA_RETURN_URL,
    fallbackRequestUrl: request.url,
    paymentRequestId: paymentRequest.id,
  });
  const failedUrl = buildPlategaRedirectTarget({
    configuredUrl: process.env.PLATEGA_FAILED_URL,
    fallbackRequestUrl: request.url,
    paymentRequestId: paymentRequest.id,
  });
  const payloadJson = JSON.stringify({
    amountRub: price.finalTotalRub,
    orderId: parsedPayload.data.orderId ?? paymentRequest.id,
    paymentMethod: selectedPlategaPaymentMethod,
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
      failedUrl,
      orderId: paymentRequest.id,
      payload: payloadJson,
      paymentMethod: selectedPlategaPaymentMethod,
      returnUrl,
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
