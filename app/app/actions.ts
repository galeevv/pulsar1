"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generateReferralCodeValue } from "@/lib/admin-code-management";
import { getAppBenefitsData, validatePromoCodeForUser } from "@/lib/app-benefits";
import { getCurrentSession, normalizeCode } from "@/lib/auth";
import { issueSubscriptionInMarzban } from "@/lib/marzban-integration";
import { prisma } from "@/lib/prisma";
import {
  calculateSubscriptionPrice,
  getAppSubscriptionConstructorData,
} from "@/lib/subscription-constructor";

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

  const [{ durationRules, pricingSettings }, openPaymentRequest, activeSubscription, referralDiscountPct] =
    await Promise.all([
      getAppSubscriptionConstructorData(),
      prisma.paymentRequest.findFirst({
        where: {
          status: {
            in: ["CREATED", "MARKED_PAID"],
          },
          userId,
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
          userId,
        },
      }),
      getFirstPurchaseReferralDiscountPct(userId),
    ]);

  if (openPaymentRequest) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "У вас уже есть открытая заявка на оплату. Дождитесь проверки администратором.",
      })
    );
  }

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
            "Продление доступно только после подтверждения администратором текущей оплаты подписки.",
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

async function createSubscriptionFromPaidRequest(input: {
  now: Date;
  paymentRequest: {
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
  tx: Omit<
    typeof prisma,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
  >;
  userId: string;
}) {
  const activeSubscription = await input.tx.subscription.findFirst({
    orderBy: [{ startsAt: "desc" }, { startedAt: "desc" }],
    where: {
      status: "ACTIVE",
      userId: input.userId,
    },
  });

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

  return createdSubscription.id;
}

function buildConstructorTariffName(months: number, devices: number) {
  return `Constructor: ${months}m / ${devices} devices`;
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
        error: "Реферальная программа сейчас отключена.",
      })
    );
  }

  if (!appBenefitsData.hasApprovedPayment) {
    redirect(
      buildRedirectUrl({
        error: "Реферальный код доступен после первой подтвержденной оплаты.",
      })
    );
  }

  if (appBenefitsData.ownReferralCode) {
    redirect(buildRedirectUrl({ error: "У вас уже есть реферальный код." }));
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
  redirect(buildRedirectUrl({ notice: "Ваш реферальный код создан." }));
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
      notice: `Промокод применен. Баланс увеличен на ${validation.promoCode.creditAmount} кредитов.`,
    })
  );
}

export async function confirmTariffPaymentAction(formData: FormData) {
  const user = await getUserActor();
  const validated = await parseAndValidateConstructorSelection(user.id, formData);
  const now = new Date();
  let createdSubscriptionId: string | null = null;

  await prisma.$transaction(async (tx) => {
    const paymentRequest = await tx.paymentRequest.create({
      data: {
        amountRub: validated.price.finalTotalRub,
        baseDeviceMonthlyPriceSnapshot: validated.price.baseDeviceMonthlyPrice,
        currency: "RUB",
        deviceLimit: validated.price.devices,
        devices: validated.price.devices,
        durationDiscountPercentSnapshot: validated.price.durationDiscountPercent,
        extraDeviceMonthlyPriceSnapshot: validated.price.extraDeviceMonthlyPrice,
        markedPaidAt: now,
        method: "BANK_TRANSFER",
        monthlyPriceSnapshot: validated.price.monthlyPrice,
        months: validated.price.months,
        periodMonths: validated.price.months,
        referralDiscountPercentSnapshot: validated.price.referralDiscountPercent,
        status: "MARKED_PAID",
        tariffName: buildConstructorTariffName(validated.price.months, validated.price.devices),
        totalPriceBeforeDiscountRubSnapshot: validated.price.totalBeforeDiscountRub,
        userId: user.id,
      },
    });

    createdSubscriptionId = await createSubscriptionFromPaidRequest({
      now,
      paymentRequest: paymentRequest,
      tx,
      userId: user.id,
    });
  });

  let marzbanNotice = "";

  if (createdSubscriptionId) {
    const integrationResult = await issueSubscriptionInMarzban(createdSubscriptionId);

    if (!integrationResult.ok) {
      marzbanNotice =
        " Подписка активирована локально, но выдача в Marzban не удалась. Проверьте интеграции в админке.";
    }
  }

  revalidatePath("/app");
  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      anchor: "#dashboard",
      notice: `Оплата отмечена как выполненная. Подписка активирована сразу и ожидает проверки администратором.${marzbanNotice}`,
    })
  );
}

export async function payTariffWithCreditsAction(formData: FormData) {
  const user = await getUserActor();
  const validated = await parseAndValidateConstructorSelection(user.id, formData);

  const now = new Date();
  let createdSubscriptionId: string | null = null;
  let chargedRub = 0;
  let appliedDiscountPct = 0;
  let referralRewardGranted = false;

  try {
    await prisma.$transaction(async (tx) => {
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

      createdSubscriptionId = await createSubscriptionFromPaidRequest({
        now,
        paymentRequest: paymentRequest,
        tx,
        userId: user.id,
      });

      const canGrantReferralReward =
        approvedBefore === 0 &&
        Boolean(referredUse && !referredUse.rewardGrantedAt && referredUse.referralCode.ownerUserId);

      if (canGrantReferralReward && referredUse?.referralCode.ownerUserId) {
        await tx.user.update({
          data: {
            credits: {
              increment: referredUse.rewardCreditsSnapshot,
            },
          },
          where: {
            id: referredUse.referralCode.ownerUserId,
          },
        });

        await tx.referralCodeUse.update({
          data: {
            rewardGrantedAt: now,
          },
          where: {
            id: referredUse.id,
          },
        });

        referralRewardGranted = true;
      }
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

    throw error;
  }

  let marzbanNotice = "";

  if (createdSubscriptionId) {
    const integrationResult = await issueSubscriptionInMarzban(createdSubscriptionId);

    if (!integrationResult.ok) {
      marzbanNotice =
        " Подписка активирована локально, но выдача в Marzban не удалась. Проверьте интеграции в админке.";
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
      notice: `Оплата кредитами завершена: списано эквивалент ${chargedRub} ₽.${discountNotice}${rewardNotice}${marzbanNotice}`,
    })
  );
}

export async function createPaymentRequestAction(_formData: FormData) {
  void _formData;
  redirect(
    buildRedirectUrl({
      anchor: "#tariffs",
      error: "Это действие устарело. Используйте оплату через конструктор подписки.",
    })
  );
}

export async function markPaymentRequestPaidAction(_formData: FormData) {
  void _formData;
  redirect(
    buildRedirectUrl({
      anchor: "#tariffs",
      error: "Это действие устарело. Используйте оплату через конструктор подписки.",
    })
  );
}
