"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DeviceOS } from "@/generated/prisma";

import {
  mapLegacyAnchorToAppTab,
  mapLegacyDialogToAppTab,
  type AppTab,
} from "@/lib/app-tabs";
import { generateReferralCodeValue } from "@/lib/admin-code-management";
import { getAppBenefitsData, validatePromoCodeForUser } from "@/lib/app-benefits";
import { getCurrentSession, normalizeCode } from "@/lib/auth";
import { detectDeviceOsFromUserAgent, parseSelectableDeviceOsValue } from "@/lib/device-os";
import {
  assignManagedSlotForUser,
  syncSlotConfigWithRetry,
} from "@/lib/device-slot-management";
import {
  isSlotWithinDeviceLimit,
  reconcileSubscriptionDeviceSlots,
} from "@/lib/device-slot-limits";
import { handleApprovedPaymentPostProcessing } from "@/lib/payment-post-approval-handler";
import { PayoutDomainError } from "@/lib/payouts/payout-errors";
import {
  cancelOwnPayoutRequest,
  createPayoutRequestForUser,
} from "@/lib/payouts/payout-service";
import { prisma } from "@/lib/prisma";
import {
  calculateSubscriptionPrice,
  getAppSubscriptionConstructorData,
} from "@/lib/subscription-constructor";
import {
  provisionSubscriptionSlotsInXui,
  reissueDeviceSlotCredentialInXui,
  revokeSubscriptionInXui,
  syncSubscriptionInXui,
} from "@/lib/xui-integration";

function buildRedirectUrl(params: {
  anchor?: string;
  dialog?: "promo" | "referral";
  error?: string;
  notice?: string;
  openSetup?: boolean;
  tab?: AppTab;
}) {
  const searchParams = new URLSearchParams();
  const tab =
    params.tab ??
    mapLegacyDialogToAppTab(params.dialog) ??
    mapLegacyAnchorToAppTab(params.anchor);
  searchParams.set("tab", tab);

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
  return `/app${query ? `?${query}` : ""}`;
}

function normalizeDiscountPct(discountPct: number) {
  return Math.max(0, Math.min(100, discountPct));
}

function mapPayoutErrorToMessage(error: unknown) {
  if (!(error instanceof PayoutDomainError)) {
    return "Не удалось выполнить операцию вывода. Попробуйте снова.";
  }

  if (error.code === "INVALID_AMOUNT") {
    return "Введите корректную сумму вывода.";
  }

  if (error.code === "MINIMUM_PAYOUT_NOT_REACHED") {
    return "Сумма меньше минимального порога вывода.";
  }

  if (error.code === "INSUFFICIENT_AVAILABLE_CREDITS") {
    return "Сумма превышает доступный баланс.";
  }

  if (error.code === "PAYOUT_REQUEST_ALREADY_ACTIVE") {
    return "У вас уже есть активная заявка на вывод.";
  }

  if (error.code === "USER_NOT_ELIGIBLE_FOR_PAYOUT") {
    return "Вывод доступен только после первой подтвержденной оплаты.";
  }

  if (error.code === "INVALID_PAYOUT_DETAILS") {
    return "Введите корректные реквизиты выплаты.";
  }

  if (error.code === "PAYOUT_REQUEST_NOT_FOUND") {
    return "Заявка на вывод не найдена.";
  }

  if (error.code === "PAYOUT_STATUS_TRANSITION_FAILED") {
    return "Не удалось изменить статус заявки. Обновите страницу и повторите попытку.";
  }

  return error.message;
}

type InlineDialogActionState = {
  message: string;
  nonce: number;
  status: "error" | "idle" | "success";
};

function inlineActionResult(
  status: InlineDialogActionState["status"],
  message: string
): InlineDialogActionState {
  return {
    message,
    nonce: Date.now(),
    status,
  };
}

function normalizeUserAgent(rawValue: string | null | undefined) {
  const value = rawValue?.trim() ?? "";
  return value ? value.slice(0, 1000) : null;
}

function resolveRequestedDeviceOs(
  rawDeviceOs: string | null | undefined,
  rawUserAgent?: string | null | undefined
) {
  const fromForm = parseSelectableDeviceOsValue(rawDeviceOs, null);
  if (fromForm) {
    return fromForm as DeviceOS;
  }

  const fromUserAgent = detectDeviceOsFromUserAgent(rawUserAgent);
  const selectableFromUserAgent = parseSelectableDeviceOsValue(fromUserAgent, null);
  return selectableFromUserAgent ? (selectableFromUserAgent as DeviceOS) : null;
}

type SetupAssignedSlotPayload = {
  configUrl: string | null;
  deviceOs: DeviceOS;
  id: string;
  slotIndex: number;
  status: "ACTIVE" | "BLOCKED" | "FREE";
};

type SetupSlotActionCode =
  | "ASSIGNED"
  | "NO_ACTIVE_SUBSCRIPTION"
  | "NO_FREE_SLOTS";

type SetupPreviewSlotPayload = {
  configUrl: string;
  id: string;
  slotIndex: number;
};

export type AssignSetupSlotActionResult = {
  code: SetupSlotActionCode;
  message: string;
  ok: boolean;
  slot: SetupAssignedSlotPayload | null;
};

function toSetupAssignedSlotPayload(slot: {
  configUrl: string | null;
  deviceOs: DeviceOS;
  id: string;
  slotIndex: number;
  status: "ACTIVE" | "BLOCKED" | "FREE";
}): SetupAssignedSlotPayload {
  return {
    configUrl: slot.configUrl,
    deviceOs: slot.deviceOs,
    id: slot.id,
    slotIndex: slot.slotIndex,
    status: slot.status,
  };
}

export async function getSetupPreviewSlotAction(): Promise<{
  ok: boolean;
  slot: SetupPreviewSlotPayload | null;
}> {
  const user = await getUserActor();
  const activeSubscription = await prisma.subscription.findFirst({
    orderBy: [{ startsAt: "desc" }, { startedAt: "desc" }],
    select: {
      deviceSlots: {
        orderBy: {
          slotIndex: "asc",
        },
        select: {
          configUrl: true,
          id: true,
          slotIndex: true,
        },
        take: 1,
        where: {
          configUrl: {
            not: null,
          },
          status: "FREE",
        },
      },
    },
    where: {
      status: "ACTIVE",
      userId: user.id,
    },
  });

  const slot = activeSubscription?.deviceSlots[0] ?? null;

  return {
    ok: true,
    slot: slot
      ? {
          configUrl: slot.configUrl!,
          id: slot.id,
          slotIndex: slot.slotIndex,
        }
      : null,
  };
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

function getRemainingSubscriptionDays(now: Date, expiresAt: Date) {
  const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());
  return Math.max(1, Math.ceil(remainingMs / 86_400_000));
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
    redirect(buildRedirectUrl({ anchor: "", dialog: "referral", error: "Пользователь не найден." }));
  }

  if (!appBenefitsData.referralProgramSettings.isEnabled) {
    redirect(
      buildRedirectUrl({
        anchor: "",
        dialog: "referral",
        error: "Реферальная программа сейчас отключена.",
      })
    );
  }

  if (!appBenefitsData.hasApprovedPayment) {
    redirect(
      buildRedirectUrl({
        anchor: "",
        dialog: "referral",
        error: "Реферальный код доступен после первой подтвержденной оплаты.",
      })
    );
  }

  if (appBenefitsData.ownReferralCode) {
    redirect(
      buildRedirectUrl({
        anchor: "",
        dialog: "referral",
        error: "У вас уже есть реферальный код.",
      })
    );
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
  redirect(
    buildRedirectUrl({
      anchor: "",
      dialog: "referral",
      notice: "Ваш реферальный код создан.",
    })
  );
}

export async function createPayoutRequestAction(formData: FormData) {
  const user = await getUserActor();
  const amountCredits = Number.parseInt(String(formData.get("amountCredits") ?? ""), 10);
  const payoutBank = String(formData.get("payoutBank") ?? "").trim();
  const payoutDestination = String(formData.get("payoutDestination") ?? "").trim();
  const legacyPayoutDetails = String(formData.get("payoutDetailsSnapshot") ?? "").trim();
  const allowedBanks = new Set(["Сбербанк", "Альфа-Банк", "Т-Банк", "Ozon Банк"]);

  let payoutDetails = legacyPayoutDetails;

  if (payoutBank || payoutDestination) {
    if (!payoutBank || !allowedBanks.has(payoutBank) || !payoutDestination) {
      redirect(
        buildRedirectUrl({
          anchor: "",
          dialog: "referral",
          error: "Укажите банк и номер телефона или карты.",
        })
      );
    }

    payoutDetails = `Банк: ${payoutBank}\nТелефон или карта: ${payoutDestination}`;
  }

  try {
    await createPayoutRequestForUser({
      amountCredits,
      payoutDetailsSnapshot: payoutDetails,
      userId: user.id,
    });
  } catch (error) {
    redirect(
      buildRedirectUrl({
        anchor: "",
        dialog: "referral",
        error: mapPayoutErrorToMessage(error),
      })
    );
  }

  revalidatePath("/app");
  revalidatePath("/admin/payouts");
  redirect(
    buildRedirectUrl({
      anchor: "",
      dialog: "referral",
      notice: "Заявка на вывод создана. Сумма зарезервирована до решения администратора.",
    })
  );
}

export async function cancelOwnPayoutRequestAction(formData: FormData) {
  const user = await getUserActor();
  const payoutRequestId = String(formData.get("payoutRequestId") ?? "").trim();

  if (!payoutRequestId) {
    redirect(
      buildRedirectUrl({
        anchor: "",
        dialog: "referral",
        error: "Не удалось определить заявку для отмены.",
      })
    );
  }

  try {
    await cancelOwnPayoutRequest({
      payoutRequestId,
      userId: user.id,
    });
  } catch (error) {
    redirect(
      buildRedirectUrl({
        anchor: "",
        dialog: "referral",
        error: mapPayoutErrorToMessage(error),
      })
    );
  }

  revalidatePath("/app");
  revalidatePath("/admin/payouts");
  redirect(
    buildRedirectUrl({
      anchor: "",
      dialog: "referral",
      notice: "Заявка на вывод отменена, резерв разморожен.",
    })
  );
}

export async function applyPromoCodeAction(formData: FormData) {
  const user = await getUserActor();
  const rawCode = String(formData.get("code") ?? "");
  const validation = await validatePromoCodeForUser(user.id, rawCode);

  if (!validation.ok) {
    redirect(buildRedirectUrl({ anchor: "", dialog: "promo", error: validation.message }));
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
      anchor: "",
      dialog: "promo",
      notice: `Промокод применен. Баланс увеличен на ${validation.promoCode.creditAmount} кредитов.`,
    })
  );
}

export async function generateOwnReferralCodeInlineAction(
  prevState: InlineDialogActionState,
  formData: FormData
): Promise<InlineDialogActionState> {
  void prevState;
  void formData;

  const user = await getUserActor();
  const appBenefitsData = await getAppBenefitsData(user.username);

  if (!appBenefitsData) {
    return inlineActionResult("error", "Пользователь не найден.");
  }

  if (!appBenefitsData.referralProgramSettings.isEnabled) {
    return inlineActionResult("error", "Реферальная программа сейчас отключена.");
  }

  if (!appBenefitsData.hasApprovedPayment) {
    return inlineActionResult("error", "Реферальный код доступен после первой подтвержденной оплаты.");
  }

  if (appBenefitsData.ownReferralCode) {
    return inlineActionResult("error", "У вас уже есть реферальный код.");
  }

  try {
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
  } catch {
    return inlineActionResult("error", "Не удалось сгенерировать реферальный код. Попробуйте снова.");
  }

  revalidatePath("/app");
  return inlineActionResult("success", "Ваш реферальный код создан.");
}

export async function createPayoutRequestInlineAction(
  _prevState: InlineDialogActionState,
  formData: FormData
): Promise<InlineDialogActionState> {
  const user = await getUserActor();
  const amountCredits = Number.parseInt(String(formData.get("amountCredits") ?? ""), 10);
  const payoutBank = String(formData.get("payoutBank") ?? "").trim();
  const payoutDestination = String(formData.get("payoutDestination") ?? "").trim();
  const legacyPayoutDetails = String(formData.get("payoutDetailsSnapshot") ?? "").trim();
  const allowedBanks = new Set(["Сбербанк", "Альфа-Банк", "Т-Банк", "Ozon Банк"]);

  let payoutDetails = legacyPayoutDetails;

  if (payoutBank || payoutDestination) {
    if (!payoutBank || !allowedBanks.has(payoutBank) || !payoutDestination) {
      return inlineActionResult("error", "Укажите банк и номер телефона или карты.");
    }

    payoutDetails = `Банк: ${payoutBank}\nТелефон или карта: ${payoutDestination}`;
  }

  try {
    await createPayoutRequestForUser({
      amountCredits,
      payoutDetailsSnapshot: payoutDetails,
      userId: user.id,
    });
  } catch (error) {
    return inlineActionResult("error", mapPayoutErrorToMessage(error));
  }

  revalidatePath("/app");
  revalidatePath("/admin/payouts");
  return inlineActionResult(
    "success",
    "Заявка на вывод создана. Сумма зарезервирована до решения администратора."
  );
}

export async function cancelOwnPayoutRequestInlineAction(
  _prevState: InlineDialogActionState,
  formData: FormData
): Promise<InlineDialogActionState> {
  const user = await getUserActor();
  const payoutRequestId = String(formData.get("payoutRequestId") ?? "").trim();

  if (!payoutRequestId) {
    return inlineActionResult("error", "Не удалось определить заявку для отмены.");
  }

  try {
    await cancelOwnPayoutRequest({
      payoutRequestId,
      userId: user.id,
    });
  } catch (error) {
    return inlineActionResult("error", mapPayoutErrorToMessage(error));
  }

  revalidatePath("/app");
  revalidatePath("/admin/payouts");
  return inlineActionResult("success", "Заявка на вывод отменена, резерв разморожен.");
}

export async function applyPromoCodeInlineAction(
  _prevState: InlineDialogActionState,
  formData: FormData
): Promise<InlineDialogActionState> {
  const user = await getUserActor();
  const rawCode = String(formData.get("code") ?? "");
  const validation = await validatePromoCodeForUser(user.id, rawCode);

  if (!validation.ok) {
    return inlineActionResult("error", validation.message);
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
  return inlineActionResult(
    "success",
    `Промокод применен. Баланс увеличен на ${validation.promoCode.creditAmount} кредитов.`
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
      await tx.userOperationLock.upsert({
        create: {
          lockedAt: now,
          operation: "credits_subscription_payment",
          userId: user.id,
        },
        update: {
          lockedAt: now,
          operation: "credits_subscription_payment",
        },
        where: { userId: user.id },
      });

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
    const integrationResult = await provisionSubscriptionSlotsInXui(createdSubscriptionId);

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
      tab: "home",
      notice: `Оплата кредитами завершена: списано эквивалент ${chargedRub} ₽.${discountNotice}${rewardNotice}${integrationNotice}`,
      openSetup: true,
    })
  );
}

export async function changeDeviceLimitWithCreditsAction(formData: FormData) {
  const user = await getUserActor();
  const nextDevices = parsePositiveInt(formData.get("nextDevices"));

  if (!nextDevices) {
    redirect(buildRedirectUrl({ tab: "devices", error: "Выберите новый лимит устройств." }));
  }

  const { pricingSettings } = await getAppSubscriptionConstructorData();
  const now = new Date();
  let subscriptionId: string | null = null;
  let chargedRub = 0;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.userOperationLock.upsert({
        create: {
          lockedAt: now,
          operation: "device_limit_change",
          userId: user.id,
        },
        update: {
          lockedAt: now,
          operation: "device_limit_change",
        },
        where: { userId: user.id },
      });

      const activeSubscription = await tx.subscription.findFirst({
        include: {
          deviceSlots: {
            select: { slotIndex: true },
          },
        },
        orderBy: [{ startsAt: "desc" }, { startedAt: "desc" }],
        where: {
          status: "ACTIVE",
          userId: user.id,
        },
      });

      if (!activeSubscription) {
        throw new Error("NO_ACTIVE_SUBSCRIPTION");
      }

      if (nextDevices <= activeSubscription.devices) {
        throw new Error("DEVICE_LIMIT_NOT_INCREASED");
      }

      if (nextDevices > pricingSettings.maxDevices) {
        throw new Error("DEVICE_LIMIT_TOO_HIGH");
      }

      const expiresAt = activeSubscription.expiresAt ?? activeSubscription.endsAt;
      const remainingDays = getRemainingSubscriptionDays(now, expiresAt);
      const extraDevices = nextDevices - activeSubscription.devices;
      chargedRub = Math.ceil(
        (extraDevices * pricingSettings.extraDeviceMonthlyPrice * remainingDays) / 30
      );

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
          amountRub: chargedRub,
          approvedAt: now,
          baseDeviceMonthlyPriceSnapshot: activeSubscription.baseDeviceMonthlyPriceSnapshot,
          currency: activeSubscription.currency,
          deviceLimit: nextDevices,
          devices: nextDevices,
          durationDiscountPercentSnapshot: activeSubscription.durationDiscountPercentSnapshot,
          extraDeviceMonthlyPriceSnapshot: pricingSettings.extraDeviceMonthlyPrice,
          markedPaidAt: now,
          method: "CREDITS",
          monthlyPriceSnapshot: activeSubscription.monthlyPriceSnapshot,
          months: 0,
          periodMonths: 0,
          referralDiscountPercentSnapshot: activeSubscription.referralDiscountPercentSnapshot,
          status: "APPROVED",
          tariffName: `Device limit: ${activeSubscription.devices} -> ${nextDevices}`,
          totalPriceBeforeDiscountRubSnapshot: chargedRub,
          userId: user.id,
        },
      });

      await tx.subscription.update({
        data: {
          deviceLimit: nextDevices,
          devices: nextDevices,
          extraDeviceMonthlyPriceSnapshot: pricingSettings.extraDeviceMonthlyPrice,
          pendingDevices: null,
        },
        where: { id: activeSubscription.id },
      });

      await tx.subscriptionRenewal.create({
        data: {
          amountRub: chargedRub,
          baseDeviceMonthlyPriceSnapshot: activeSubscription.baseDeviceMonthlyPriceSnapshot,
          currency: activeSubscription.currency,
          durationDiscountPercentSnapshot: activeSubscription.durationDiscountPercentSnapshot,
          extraDeviceMonthlyPriceSnapshot: pricingSettings.extraDeviceMonthlyPrice,
          monthlyPriceSnapshot: activeSubscription.monthlyPriceSnapshot,
          months: 0,
          nextDevices,
          nextExpiresAt: expiresAt,
          paymentRequestId: paymentRequest.id,
          previousDevices: activeSubscription.devices,
          previousExpiresAt: expiresAt,
          referralDiscountPercentSnapshot: activeSubscription.referralDiscountPercentSnapshot,
          subscriptionId: activeSubscription.id,
        },
      });

      await reconcileSubscriptionDeviceSlots(tx, {
        deviceLimit: nextDevices,
        subscriptionId: activeSubscription.id,
      });

      subscriptionId = activeSubscription.id;
    }, { timeout: 15_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "NO_ACTIVE_SUBSCRIPTION") {
      redirect(buildRedirectUrl({ tab: "devices", error: "Нет активной подписки." }));
    }

    if (message === "DEVICE_LIMIT_NOT_INCREASED") {
      redirect(buildRedirectUrl({ tab: "devices", error: "Новый лимит должен быть больше текущего." }));
    }

    if (message === "DEVICE_LIMIT_TOO_HIGH") {
      redirect(buildRedirectUrl({ tab: "devices", error: "Выбранный лимит выше доступного максимума." }));
    }

    if (message === "INSUFFICIENT_CREDITS") {
      redirect(buildRedirectUrl({ tab: "devices", error: "Недостаточно кредитов для доплаты." }));
    }

    throw error;
  }

  let syncNotice = "";
  if (subscriptionId) {
    const syncResult = await syncSubscriptionInXui(subscriptionId);
    syncNotice = syncResult.ok
      ? ""
      : " Лимит обновлен локально, но синхронизация 3x-ui завершилась ошибкой.";
  }

  revalidatePath("/app");
  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      tab: "devices",
      notice: `Лимит устройств обновлен. Списано ${chargedRub} credits.${syncNotice}`,
    })
  );
}

export async function syncOwnSubscriptionAction(formData?: FormData) {
  void formData;
  const user = await getUserActor();

  const subscription = await prisma.subscription.findFirst({
    orderBy: [{ startsAt: "desc" }, { startedAt: "desc" }],
    select: { id: true },
    where: {
      status: "ACTIVE",
      userId: user.id,
    },
  });

  if (!subscription) {
    redirect(buildRedirectUrl({ tab: "devices", error: "Нет активной подписки для синхронизации." }));
  }

  const result = await syncSubscriptionInXui(subscription.id);

  revalidatePath("/app");
  revalidatePath("/admin");

  redirect(
    buildRedirectUrl({
      tab: "devices",
      [result.ok ? "notice" : "error"]: result.ok
        ? "Подписка синхронизирована."
        : `Не удалось синхронизировать подписку: ${result.error ?? "неизвестная ошибка"}`,
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

  if (
    !isSlotWithinDeviceLimit({
      deviceLimit: slot.subscription.deviceLimit,
      slotIndex: slot.slotIndex,
    })
  ) {
    return null;
  }

  return slot;
}

export async function assignSetupSlotAction(input: {
  assignedUserAgent?: string;
  deviceOs?: string;
  slotId?: string;
}): Promise<AssignSetupSlotActionResult> {
  const user = await getUserActor();
  const slotId = String(input.slotId ?? "").trim();
  const assignedUserAgent = normalizeUserAgent(input.assignedUserAgent);
  const requestedDeviceOs = resolveRequestedDeviceOs(input.deviceOs, assignedUserAgent);

  if (!slotId) {
    return {
      code: "NO_FREE_SLOTS",
      message:
        "Все устройства заняты. Замените один из слотов в разделе \"Устройства\".",
      ok: false,
      slot: null,
    };
  }

  if (!requestedDeviceOs) {
    return {
      code: "NO_FREE_SLOTS",
      message: "Выберите операционную систему устройства.",
      ok: false,
      slot: null,
    };
  }

  const assignmentResult = await assignManagedSlotForUser({
    assignedUserAgent,
    deviceOs: requestedDeviceOs,
    slotId,
    userId: user.id,
  });

  if (assignmentResult.type !== "ASSIGNED") {
    if (assignmentResult.type === "NO_ACTIVE_SUBSCRIPTION") {
      return {
        code: "NO_ACTIVE_SUBSCRIPTION",
        message: "Для настройки устройства нужна активная подписка.",
        ok: false,
        slot: null,
      };
    }

    return {
      code: "NO_FREE_SLOTS",
      message:
        "Все устройства заняты. Замените один из слотов в разделе \"Устройства\".",
      ok: false,
      slot: null,
    };
  }

  revalidatePath("/app");
  revalidatePath("/admin");

  return {
    code: "ASSIGNED",
    message: "Настройка завершена.",
    ok: true,
    slot: toSetupAssignedSlotPayload(assignmentResult.slot),
  };
}

export async function retrySlotSyncAction(formData: FormData) {
  const user = await getUserActor();
  const slotId = String(formData.get("slotId") ?? "");

  if (!slotId) {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        error: "Слот не найден.",
      })
    );
  }

  const slot = await getManagedSlotForUser({ slotId, userId: user.id });

  if (!slot) {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        error: "Слот недоступен для управления.",
      })
    );
  }

  if (slot.status === "BLOCKED") {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        notice: `Слот ${slot.slotIndex} заблокирован.`,
      })
    );
  }

  const syncResult = await syncSlotConfigWithRetry({
    slotId: slot.id,
    subscriptionId: slot.subscription.id,
  });

  revalidatePath("/app");
  revalidatePath("/admin");

  if (syncResult.type === "SYNC_FAILED") {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        error: `Слот ${slot.slotIndex}: ${syncResult.errorMessage}`,
      })
    );
  }

  redirect(
    buildRedirectUrl({
      tab: "devices",
      notice: `Слот ${syncResult.slot.slotIndex} синхронизирован.`,
    })
  );
}

export async function activateDeviceSlotAction(formData: FormData) {
  const user = await getUserActor();
  const slotId = String(formData.get("slotId") ?? "");
  const assignedUserAgent = normalizeUserAgent(String(formData.get("assignedUserAgent") ?? ""));
  const requestedDeviceOs = resolveRequestedDeviceOs(
    String(formData.get("deviceOs") ?? ""),
    assignedUserAgent
  );

  if (!slotId) {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        error: "Слот не найден.",
      })
    );
  }

  if (!requestedDeviceOs) {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        error: "Выберите операционную систему устройства.",
      })
    );
  }

  const slot = await getManagedSlotForUser({ slotId, userId: user.id });

  if (!slot) {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        error: "Слот недоступен для управления.",
      })
    );
  }

  if (slot.status === "BLOCKED") {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        error: "Слот заблокирован и не может быть активирован.",
      })
    );
  }

  if (slot.status === "ACTIVE") {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        notice: `Слот ${slot.slotIndex} уже активен.`,
      })
    );
  }

  await prisma.deviceSlot.update({
    data: {
      assignedAt: new Date(),
      assignedUserAgent,
      deviceOs: requestedDeviceOs,
      status: "ACTIVE",
    },
    where: { id: slot.id },
  });

  revalidatePath("/app");
  revalidatePath("/admin");

  redirect(
    buildRedirectUrl({
      tab: "devices",
      notice: `Слот ${slot.slotIndex} активирован.`,
    })
  );
}

export async function updateDeviceSlotOsInlineAction(input: {
  deviceOs?: string;
  slotId?: string;
}) {
  const user = await getUserActor();
  const slotId = String(input.slotId ?? "").trim();
  const requestedDeviceOs = resolveRequestedDeviceOs(input.deviceOs);

  if (!slotId) {
    return {
      message: "Слот не найден.",
      ok: false,
    } as const;
  }

  if (!requestedDeviceOs) {
    return {
      message: "Выберите операционную систему устройства.",
      ok: false,
    } as const;
  }

  const slot = await getManagedSlotForUser({ slotId, userId: user.id });

  if (!slot) {
    return {
      message: "Слот недоступен для управления.",
      ok: false,
    } as const;
  }

  if (slot.status === "BLOCKED") {
    return {
      message: "Слот заблокирован и не может быть изменен.",
      ok: false,
    } as const;
  }

  await prisma.deviceSlot.update({
    data: {
      deviceOs: requestedDeviceOs,
    },
    where: { id: slot.id },
  });

  revalidatePath("/app");
  revalidatePath("/admin");
  return {
    message: `ОС слота ${slot.slotIndex} обновлена.`,
    ok: true,
  } as const;
}

export async function updateDeviceSlotOsAction(formData: FormData) {
  const result = await updateDeviceSlotOsInlineAction({
    deviceOs: String(formData.get("deviceOs") ?? ""),
    slotId: String(formData.get("slotId") ?? ""),
  });

  redirect(
    buildRedirectUrl({
      tab: "devices",
      [result.ok ? "notice" : "error"]: result.message,
    })
  );
}

export async function reissueDeviceSlotLinkAction(formData: FormData) {
  const user = await getUserActor();
  const slotId = String(formData.get("slotId") ?? "");
  const requestedDeviceOs = resolveRequestedDeviceOs(
    String(formData.get("deviceOs") ?? "")
  );

  if (!slotId) {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        error: "Слот не найден.",
      })
    );
  }

  const slot = await getManagedSlotForUser({ slotId, userId: user.id });

  if (!slot) {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        error: "Слот недоступен для управления.",
      })
    );
  }

  if (slot.status === "BLOCKED") {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        error: "Заблокированный слот нельзя перевыпустить.",
      })
    );
  }

  if (requestedDeviceOs) {
    await prisma.deviceSlot.update({
      data: {
        deviceOs: requestedDeviceOs,
      },
      where: { id: slot.id },
    });
  }

  const reissueResult = await reissueDeviceSlotCredentialInXui({ slotId: slot.id });

  revalidatePath("/app");
  revalidatePath("/admin");

  if (!reissueResult.ok) {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        error: `Слот ${slot.slotIndex}: ${reissueResult.error ?? "не удалось перевыпустить ссылку."}`,
      })
    );
  }

  redirect(
    buildRedirectUrl({
      tab: "devices",
      notice: `Ссылка для слота ${slot.slotIndex} перевыпущена.`,
    })
  );
}

export async function deactivateDeviceSlotAction(formData: FormData) {
  const user = await getUserActor();
  const slotId = String(formData.get("slotId") ?? "");

  if (!slotId) {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        error: "Слот не найден.",
      })
    );
  }

  const slot = await getManagedSlotForUser({ slotId, userId: user.id });

  if (!slot) {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        error: "Слот недоступен для управления.",
      })
    );
  }

  if (slot.status !== "ACTIVE") {
    redirect(
      buildRedirectUrl({
        tab: "devices",
        notice: `Слот ${slot.slotIndex} уже неактивен.`,
      })
    );
  }

  await prisma.deviceSlot.update({
    data: {
      assignedAt: null,
      assignedUserAgent: null,
      deviceOs: "UNKNOWN",
      lastSyncError: null,
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
      tab: "devices",
      notice: `Слот ${slot.slotIndex} деактивирован.${syncNotice}`,
    })
  );
}
