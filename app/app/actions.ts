"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generateReferralCodeValue } from "@/lib/admin-code-management";
import { getAppBenefitsData, validatePromoCodeForUser } from "@/lib/app-benefits";
import { getCurrentSession, normalizeCode } from "@/lib/auth";
import { issueSubscriptionInMarzban } from "@/lib/marzban-integration";
import { prisma } from "@/lib/prisma";

function buildRedirectUrl(params: {
  anchor?: string;
  error?: string;
  notice?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.notice) {
    searchParams.set("notice", params.notice);
  }

  if (params.error) {
    searchParams.set("error", params.error);
  }

  const query = searchParams.toString();
  return `/app${query ? `?${query}` : ""}${params.anchor ?? "#benefits"}`;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

async function getUserActor() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?mode=login&error=Сначала войдите в аккаунт.");
  }

  if (session.role !== "USER") {
    redirect("/admin");
  }

  const user = await prisma.user.findUnique({
    select: { id: true, username: true },
    where: { username: session.username },
  });

  if (!user) {
    redirect("/login?mode=login&error=Сначала войдите в аккаунт.");
  }

  return user;
}

export async function generateOwnReferralCodeAction() {
  const user = await getUserActor();
  const appBenefitsData = await getAppBenefitsData(user.username);

  if (!appBenefitsData) {
    redirect(buildRedirectUrl({ error: "Пользователь не найден." }));
  }

  if (!appBenefitsData.referralProgramSettings.isEnabled) {
    redirect(
      buildRedirectUrl({
        error: "Реферальная система временно выключена.",
      })
    );
  }

  if (!appBenefitsData.hasApprovedPayment) {
    redirect(
      buildRedirectUrl({
        error: "ReferralCode станет доступен после первой подтвержденной оплаты.",
      })
    );
  }

  if (appBenefitsData.ownReferralCode) {
    redirect(buildRedirectUrl({ error: "У вас уже есть referral-код." }));
  }

  const code = normalizeCode(generateReferralCodeValue());

  await prisma.referralCode.create({
    data: {
      code,
      discountPct: appBenefitsData.referralProgramSettings.defaultDiscountPct,
      isEnabled: true,
      ownerUserId: user.id,
      rewardCredits: appBenefitsData.referralProgramSettings.defaultRewardCredits,
    },
  });

  revalidatePath("/app");
  redirect(buildRedirectUrl({ notice: "Ваш referral-код создан." }));
}

export async function applyPromoCodeAction(formData: FormData) {
  const user = await getUserActor();
  const rawCode = String(formData.get("code") ?? "");
  const validation = await validatePromoCodeForUser(user.id, rawCode);

  if (!validation.ok) {
    redirect(buildRedirectUrl({ error: validation.message }));
  }

  await prisma.$transaction([
    prisma.promoCodeRedemption.create({
      data: {
        promoCodeId: validation.promoCode.id,
        userId: user.id,
      },
    }),
    prisma.user.update({
      data: {
        credits: {
          increment: validation.promoCode.creditAmount,
        },
      },
      where: { id: user.id },
    }),
  ]);

  revalidatePath("/app");
  redirect(
    buildRedirectUrl({
      notice: `Промокод применен. Баланс пополнен на ${validation.promoCode.creditAmount} кредитов.`,
    })
  );
}

export async function createPaymentRequestAction(formData: FormData) {
  const user = await getUserActor();
  const tariffId = String(formData.get("tariffId") ?? "");

  if (!tariffId) {
    redirect(
      buildRedirectUrl({
        anchor: "#payments",
        error: "Выберите тариф для создания заявки.",
      })
    );
  }

  const [tariff, openPaymentRequest] = await Promise.all([
    prisma.tariff.findFirst({
      where: {
        id: tariffId,
        isEnabled: true,
      },
    }),
    prisma.paymentRequest.findFirst({
      where: {
        status: {
          in: ["CREATED", "MARKED_PAID"],
        },
        userId: user.id,
      },
    }),
  ]);

  if (!tariff) {
    redirect(
      buildRedirectUrl({
        anchor: "#payments",
        error: "Тариф не найден или уже отключен.",
      })
    );
  }

  if (openPaymentRequest) {
    redirect(
      buildRedirectUrl({
        anchor: "#payments",
        error: "У вас уже есть активная заявка. Сначала завершите ее.",
      })
    );
  }

  await prisma.paymentRequest.create({
    data: {
      amountRub: tariff.priceRub,
      deviceLimit: tariff.deviceLimit,
      periodMonths: tariff.periodMonths,
      tariffId: tariff.id,
      tariffName: tariff.name,
      userId: user.id,
    },
  });

  revalidatePath("/app");
  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      anchor: "#payments",
      notice: "Платежная заявка создана. После перевода нажмите «Оплачено».",
    })
  );
}

export async function markPaymentRequestPaidAction(formData: FormData) {
  const user = await getUserActor();
  const paymentRequestId = String(formData.get("paymentRequestId") ?? "");

  if (!paymentRequestId) {
    redirect(buildRedirectUrl({ anchor: "#payments", error: "Заявка не найдена." }));
  }

  const paymentRequest = await prisma.paymentRequest.findFirst({
    where: {
      id: paymentRequestId,
      userId: user.id,
    },
  });

  if (!paymentRequest) {
    redirect(buildRedirectUrl({ anchor: "#payments", error: "Заявка не найдена." }));
  }

  if (paymentRequest.status !== "CREATED") {
    redirect(
      buildRedirectUrl({
        anchor: "#payments",
        error: "Эту заявку уже нельзя отметить как оплаченную повторно.",
      })
    );
  }

  const now = new Date();
  let createdSubscriptionId: string | null = null;

  await prisma.$transaction(async (tx) => {
    await tx.paymentRequest.update({
      data: {
        markedPaidAt: now,
        status: "MARKED_PAID",
      },
      where: { id: paymentRequest.id },
    });

    await tx.subscription.updateMany({
      data: {
        revokedAt: now,
        status: "REVOKED",
      },
      where: {
        status: "ACTIVE",
        userId: paymentRequest.userId,
      },
    });

    const createdSubscription = await tx.subscription.create({
      data: {
        deviceLimit: paymentRequest.deviceLimit,
        endsAt: addMonths(now, paymentRequest.periodMonths),
        paymentRequestId: paymentRequest.id,
        periodMonths: paymentRequest.periodMonths,
        startedAt: now,
        status: "ACTIVE",
        tariffName: paymentRequest.tariffName,
        userId: paymentRequest.userId,
      },
    });

    createdSubscriptionId = createdSubscription.id;

    await tx.deviceSlot.createMany({
      data: Array.from({ length: paymentRequest.deviceLimit }, (_, index) => ({
        label: `Устройство ${index + 1}`,
        slotIndex: index + 1,
        status: "FREE",
        subscriptionId: createdSubscription.id,
      })),
    });
  });

  let marzbanNotice = "";

  if (createdSubscriptionId) {
    const integrationResult = await issueSubscriptionInMarzban(createdSubscriptionId);

    if (!integrationResult.ok) {
      marzbanNotice =
        " Подписка активирована локально, но выдача в Marzban завершилась с ошибкой. Проверьте раздел интеграции.";
    }
  }

  revalidatePath("/app");
  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      anchor: "#payments",
      notice: `Подписка активирована сразу. Администратор позже проверит оплату и при необходимости отзовет доступ.${marzbanNotice}`,
    })
  );
}
