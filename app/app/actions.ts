"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generateReferralCodeValue } from "@/lib/admin-code-management";
import { getAppBenefitsData, validatePromoCodeForUser } from "@/lib/app-benefits";
import { getCurrentSession, normalizeCode } from "@/lib/auth";
import { handleApprovedPaymentPostProcessing } from "@/lib/payment-post-approval-handler";
import { prisma } from "@/lib/prisma";
import {
  calculateSubscriptionPrice,
  getAppSubscriptionConstructorData,
} from "@/lib/subscription-constructor";
import {
  issueSubscriptionInXui,
  revokeSubscriptionInXui,
  syncSubscriptionInXui,
} from "@/lib/xui-integration";

function buildRedirectUrl(params: {
  anchor?: string;
  dialog?: "promo" | "referral";
  error?: string;
  notice?: string;
  openSetup?: boolean;
}) {
  const searchParams = new URLSearchParams();

  if (params.notice) {
    searchParams.set("notice", params.notice);
  }

  if (params.error) {
    searchParams.set("error", params.error);
  }

  if (params.dialog) {
    searchParams.set("dialog", params.dialog);
  }

  if (params.openSetup) {
    searchParams.set("openSetup", "1");
  }

  const query = searchParams.toString();
  return `/app${query ? `?${query}` : ""}${params.anchor ?? "#dashboard"}`;
}

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

function parsePositiveInt(rawValue: FormDataEntryValue | null) {
  const parsed = Number.parseInt(String(rawValue ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function parseAndValidateConstructorSelection(
  userId: string,
  formData: FormData
) {
  const months = parsePositiveInt(formData.get("months"));
  const devices = parsePositiveInt(formData.get("devices"));

  if (!months) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Выберите срок подписки.",
      })
    );
  }

  if (!devices) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Выберите количество устройств.",
      })
    );
  }

  const [{ durationRules, pricingSettings }, activeSubscription, referralDiscountPct] =
    await Promise.all([
      getAppSubscriptionConstructorData(),
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
          userId,
        },
      }),
      getFirstPurchaseReferralDiscountPct(userId),
    ]);

  if (devices < pricingSettings.minDevices || devices > pricingSettings.maxDevices) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: `Количество устройств должно быть в диапазоне ${pricingSettings.minDevices}..${pricingSettings.maxDevices}.`,
      })
    );
  }

  const durationRule = durationRules.find((item) => item.months === months);

  if (!durationRule) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Выбранный срок отключен администратором.",
      })
    );
  }

  if (activeSubscription) {
    const activePaymentStatus = activeSubscription.paymentRequest?.status;

    if (activePaymentStatus !== "APPROVED") {
      redirect(
        buildRedirectUrl({
          anchor: "#tariffs",
          error:
            "Продление доступно только после завершения текущего платежа.",
        })
      );
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

  return {
    activeSubscription,
    months,
    pricingSettings,
    price,
  };
}

function buildConstructorTariffName(months: number, devices: number) {
  return `Constructor: ${months}m / ${devices} devices`;
}

export async function generateOwnReferralCodeAction() {
  const user = await getUserActor();
  const appBenefitsData = await getAppBenefitsData(user.username);

  if (!appBenefitsData) {
    redirect(buildRedirectUrl({ dialog: "referral", error: "Пользователь не найден." }));
  }

  if (!appBenefitsData.referralProgramSettings.isEnabled) {
    redirect(
      buildRedirectUrl({
        dialog: "referral",
        error: "Реферальная программа сейчас отключена.",
      })
    );
  }

  if (!appBenefitsData.hasApprovedPayment) {
    redirect(
      buildRedirectUrl({
        dialog: "referral",
        error: "Реферальный код доступен после первой подтвержденной оплаты.",
      })
    );
  }

  if (appBenefitsData.ownReferralCode) {
    redirect(buildRedirectUrl({ dialog: "referral", error: "У вас уже есть реферальный код." }));
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
  redirect(buildRedirectUrl({ dialog: "referral", notice: "Ваш реферальный код создан." }));
}

export async function applyPromoCodeAction(formData: FormData) {
  const user = await getUserActor();
  const rawCode = String(formData.get("code") ?? "");
  const validation = await validatePromoCodeForUser(user.id, rawCode);

  if (!validation.ok) {
    redirect(buildRedirectUrl({ dialog: "promo", error: validation.message }));
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
      dialog: "promo",
      notice: `Промокод применен. Баланс увеличен на ${validation.promoCode.creditAmount} кредитов.`,
    })
  );
}

export async function payTariffWithCreditsAction(formData: FormData) {
  const user = await getUserActor();
  const validated = await parseAndValidateConstructorSelection(user.id, formData);

  const now = new Date();
  let createdSubscriptionId: string | null = null;
  let revokedSubscriptionId: string | null = null;
  let chargedRub = 0;
  let appliedDiscountPct = 0;
  let referralRewardGranted = false;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.paymentRequest.updateMany({
        data: {
          plategaStatus: "REPLACED_BY_CREDITS_PAYMENT",
          rejectedAt: now,
          status: "REJECTED",
        },
        where: {
          status: "CREATED",
          userId: user.id,
        },
      });

      const [approvedBefore, referredUse] = await Promise.all([
        tx.paymentRequest.count({
          where: {
            status: "APPROVED",
            userId: user.id,
          },
        }),
        tx.referralCodeUse.findUnique({
          include: {
            referralCode: {
              select: {
                ownerUserId: true,
              },
            },
          },
          where: {
            referredUserId: user.id,
          },
        }),
      ]);

      appliedDiscountPct =
        approvedBefore === 0 && referredUse
          ? normalizeDiscountPct(referredUse.discountPctSnapshot)
          : 0;

      const recalculated = calculateSubscriptionPrice({
        baseDeviceMonthlyPrice: validated.price.baseDeviceMonthlyPrice,
        devices: validated.price.devices,
        durationDiscountPercent: validated.price.durationDiscountPercent,
        extraDeviceMonthlyPrice: validated.pricingSettings.extraDeviceMonthlyPrice,
        months: validated.price.months,
        referralDiscountPercent: appliedDiscountPct,
        vpnMonthlyPrice: validated.price.vpnMonthlyPrice,
      });

      chargedRub = recalculated.finalTotalRub;

      const debitResult = await tx.user.updateMany({
        data: {
          credits: {
            decrement: chargedRub,
          },
        },
        where: {
          credits: {
            gte: chargedRub,
          },
          id: user.id,
        },
      });

      if (debitResult.count !== 1) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      const paymentRequest = await tx.paymentRequest.create({
        data: {
          amountRub: recalculated.finalTotalRub,
          approvedAt: now,
          baseDeviceMonthlyPriceSnapshot: recalculated.baseDeviceMonthlyPrice,
          currency: "RUB",
          deviceLimit: recalculated.devices,
          devices: recalculated.devices,
          durationDiscountPercentSnapshot: recalculated.durationDiscountPercent,
          extraDeviceMonthlyPriceSnapshot: recalculated.extraDeviceMonthlyPrice,
          markedPaidAt: now,
          method: "CREDITS",
          monthlyPriceSnapshot: recalculated.monthlyPrice,
          months: recalculated.months,
          periodMonths: recalculated.months,
          referralDiscountPercentSnapshot: recalculated.referralDiscountPercent,
          status: "APPROVED",
          tariffName: buildConstructorTariffName(recalculated.months, recalculated.devices),
          totalPriceBeforeDiscountRubSnapshot: recalculated.totalBeforeDiscountRub,
          userId: user.id,
        },
      });

      const postApprovalResult = await handleApprovedPaymentPostProcessing({
        now,
        paymentRequest,
        tx,
      });
      createdSubscriptionId = postApprovalResult.createdSubscriptionId;
      revokedSubscriptionId = postApprovalResult.revokedSubscriptionId;
      referralRewardGranted = postApprovalResult.referralRewardGranted;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "INSUFFICIENT_CREDITS") {
      redirect(
        buildRedirectUrl({
          anchor: "#tariffs",
          error: "Недостаточно кредитов для этой оплаты.",
        })
      );
    }

    if (message === "ACTIVE_SUBSCRIPTIONS_LIMIT_REACHED") {
      redirect(
        buildRedirectUrl({
          anchor: "#tariffs",
          error: "Свободных мест сейчас нет.",
        })
      );
    }

    throw error;
  }

  let integrationNotice = "";

  if (revokedSubscriptionId) {
    const revokeResult = await revokeSubscriptionInXui(revokedSubscriptionId);

    if (!revokeResult.ok) {
      integrationNotice +=
        " Предыдущие конфиги отозваны локально, но удаление клиентов в 3x-ui завершилось ошибкой.";
    }
  }

  if (createdSubscriptionId) {
    const integrationResult = await issueSubscriptionInXui(createdSubscriptionId);

    if (!integrationResult.ok) {
      integrationNotice +=
        " Подписка активирована локально, но выдача в 3x-ui не удалась. Проверьте интеграции в админке.";
    }
  }

  revalidatePath("/app");
  revalidatePath("/admin");
  const discountNotice =
    appliedDiscountPct > 0
      ? ` Применена реферальная скидка первой покупки ${appliedDiscountPct}%.`
      : "";
  const rewardNotice = referralRewardGranted
    ? " Владельцу кода начислена реферальная награда."
    : "";

  redirect(
    buildRedirectUrl({
      anchor: "#dashboard",
      notice: `Оплата кредитами завершена: списано эквивалент ${chargedRub} ₽.${discountNotice}${rewardNotice}${integrationNotice}`,
      openSetup: true,
    })
  );
}

async function getManagedSlotForUser(input: { slotId: string; userId: string }) {
  const slot = await prisma.deviceSlot.findUnique({
    include: {
      subscription: {
        select: {
          deviceLimit: true,
          id: true,
          paymentRequest: {
            select: {
              status: true,
            },
          },
          status: true,
          userId: true,
        },
      },
    },
    where: { id: input.slotId },
  });

  if (!slot || slot.subscription.userId !== input.userId) {
    return null;
  }

  if (slot.subscription.status !== "ACTIVE") {
    return null;
  }

  return slot;
}

export async function activateDeviceSlotAction(formData: FormData) {
  const user = await getUserActor();
  const slotId = String(formData.get("slotId") ?? "");

  if (!slotId) {
    redirect(
      buildRedirectUrl({
        anchor: "#dashboard",
        error: "Слот не найден.",
      })
    );
  }

  const slot = await getManagedSlotForUser({ slotId, userId: user.id });

  if (!slot) {
    redirect(
      buildRedirectUrl({
        anchor: "#dashboard",
        error: "Слот недоступен для управления.",
      })
    );
  }

  if (slot.status === "BLOCKED") {
    redirect(
      buildRedirectUrl({
        anchor: "#dashboard",
        error: "Слот заблокирован и не может быть активирован.",
      })
    );
  }

  if (slot.status === "ACTIVE") {
    redirect(
      buildRedirectUrl({
        anchor: "#dashboard",
        notice: `Слот ${slot.slotIndex} уже активен.`,
      })
    );
  }

  const activeCount = await prisma.deviceSlot.count({
    where: {
      status: "ACTIVE",
      subscriptionId: slot.subscription.id,
    },
  });

  if (activeCount >= slot.subscription.deviceLimit) {
    redirect(
      buildRedirectUrl({
        anchor: "#dashboard",
        error: `Лимит устройств (${slot.subscription.deviceLimit}) уже достигнут.`,
      })
    );
  }

  await prisma.deviceSlot.update({
    data: {
      status: "ACTIVE",
    },
    where: { id: slot.id },
  });

  const syncResult = await syncSubscriptionInXui(slot.subscription.id);
  const syncNotice = syncResult.ok
    ? ""
    : " 3x-ui вернул ошибку синхронизации, проверьте логи интеграции.";

  revalidatePath("/app");
  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      anchor: "#dashboard",
      notice: `Слот ${slot.slotIndex} активирован.${syncNotice}`,
    })
  );
}

export async function deactivateDeviceSlotAction(formData: FormData) {
  const user = await getUserActor();
  const slotId = String(formData.get("slotId") ?? "");

  if (!slotId) {
    redirect(
      buildRedirectUrl({
        anchor: "#dashboard",
        error: "Слот не найден.",
      })
    );
  }

  const slot = await getManagedSlotForUser({ slotId, userId: user.id });

  if (!slot) {
    redirect(
      buildRedirectUrl({
        anchor: "#dashboard",
        error: "Слот недоступен для управления.",
      })
    );
  }

  if (slot.status !== "ACTIVE") {
    redirect(
      buildRedirectUrl({
        anchor: "#dashboard",
        notice: `Слот ${slot.slotIndex} уже неактивен.`,
      })
    );
  }

  await prisma.deviceSlot.update({
    data: {
      status: "FREE",
    },
    where: { id: slot.id },
  });

  const syncResult = await syncSubscriptionInXui(slot.subscription.id);
  const syncNotice = syncResult.ok
    ? ""
    : " 3x-ui вернул ошибку синхронизации, проверьте логи интеграции.";

  revalidatePath("/app");
  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      anchor: "#dashboard",
      notice: `Слот ${slot.slotIndex} деактивирован.${syncNotice}`,
    })
  );
}
