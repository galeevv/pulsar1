"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  generateInviteCodeValue,
  generatePromoCodeValue,
  generateReferralCodeValue,
  isCodeTakenAcrossSystem,
} from "@/lib/admin-code-management";
import { getCurrentSession, normalizeCode } from "@/lib/auth";
import { saveLegalDocuments } from "@/lib/legal-documents";
import { prisma } from "@/lib/prisma";

function buildRedirectUrl(params: {
  path: string;
  error?: string;
  notice?: string;
}) {
  const [pathname, rawQuery = ""] = params.path.split("?");
  const searchParams = new URLSearchParams(rawQuery);

  if (params.notice) {
    searchParams.set("notice", params.notice);
  }

  if (params.error) {
    searchParams.set("error", params.error);
  }

  const query = searchParams.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

function resolveAdminRedirectPath(rawPath: string, fallbackPath: string) {
  if (!rawPath) {
    return fallbackPath;
  }

  if (!rawPath.startsWith("/admin")) {
    return fallbackPath;
  }

  return rawPath;
}

function withSearchParams(path: string, params: Record<string, string>) {
  const [pathname, rawQuery = ""] = path.split("?");
  const searchParams = new URLSearchParams(rawQuery);

  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

function parseExpiryDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function getAdminActor() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?mode=login&error=Сначала войдите в аккаунт.");
  }

  if (session.role !== "ADMIN") {
    redirect("/app");
  }

  const user = await prisma.user.findUnique({
    select: { id: true },
    where: { username: session.username },
  });

  if (!user) {
    redirect("/login?mode=login&error=Сначала войдите в аккаунт.");
  }

  return user;
}

export async function createInviteCodeAction(formData: FormData) {
  await getAdminActor();

  const rawCode = String(formData.get("code") ?? "");
  const rawExpiresAt = String(formData.get("expiresAt") ?? "");
  const rawRedirectPath = String(formData.get("redirectPath") ?? "");
  const redirectPath = resolveAdminRedirectPath(rawRedirectPath.trim(), "/admin/codes?tab=invite");
  const expiresAt = parseExpiryDate(rawExpiresAt);
  const code = normalizeCode(rawCode || generateInviteCodeValue());

  if (!expiresAt) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Set an expiration date for the invite code.",
      })
    );
  }

  if (expiresAt.getTime() <= Date.now()) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Invite code expiration must be in the future.",
      })
    );
  }

  if (await isCodeTakenAcrossSystem(code)) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "This code already exists in the system.",
      })
    );
  }

  await prisma.inviteCode.create({
    data: {
      code,
      expiresAt,
      isEnabled: true,
    },
  });

  revalidatePath("/admin");
  const successPath = withSearchParams(redirectPath, {
    codeTab: "invite",
    generatedInviteCode: code,
  });
  redirect(
    buildRedirectUrl({
      path: successPath,
      notice: "Invite code created.",
    })
  );
}
export async function toggleInviteCodeAction(formData: FormData) {
  await getAdminActor();

  const id = String(formData.get("id") ?? "");
  const nextEnabled = String(formData.get("nextEnabled") ?? "") === "true";

  if (!id) {
    redirect(buildRedirectUrl({ path: "/admin/codes?tab=invite", error: "Invite-код не найден." }));
  }

  await prisma.inviteCode.update({
    data: { isEnabled: nextEnabled },
    where: { id },
  });

  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      path: "/admin/codes?tab=invite",
      notice: nextEnabled ? "Invite-код включен." : "Invite-код выключен.",
    })
  );
}

export async function updateReferralProgramSettingsAction(formData: FormData) {
  await getAdminActor();

  const rawIsEnabled = String(formData.get("isEnabled") ?? "");
  const rawDiscountPct = String(formData.get("defaultDiscountPct") ?? "");
  const rawRewardCredits = String(formData.get("defaultRewardCredits") ?? "");

  const defaultDiscountPct = Number.parseInt(rawDiscountPct, 10);
  const defaultRewardCredits = Number.parseInt(rawRewardCredits, 10);
  const isEnabled = rawIsEnabled === "on";

  if (!Number.isFinite(defaultDiscountPct) || defaultDiscountPct <= 0 || defaultDiscountPct > 100) {
    redirect(
      buildRedirectUrl({
        path: "/admin/codes?tab=referral",
        error: "Глобальная скидка должна быть числом от 1 до 100.",
      })
    );
  }

  if (!Number.isFinite(defaultRewardCredits) || defaultRewardCredits <= 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/codes?tab=referral",
        error: "Глобальный бонус в кредитах должен быть больше 0.",
      })
    );
  }

  await prisma.referralProgramSettings.upsert({
    create: {
      defaultDiscountPct,
      defaultRewardCredits,
      id: 1,
      isEnabled,
    },
    update: {
      defaultDiscountPct,
      defaultRewardCredits,
      isEnabled,
    },
    where: { id: 1 },
  });

  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      path: "/admin/codes?tab=referral",
      notice: "Глобальные настройки реферальной системы сохранены.",
    })
  );
}

export async function createReferralCodeAction(formData: FormData) {
  await getAdminActor();

  const rawCode = String(formData.get("code") ?? "");
  const rawDiscountPct = String(formData.get("discountPct") ?? "");
  const rawRewardCredits = String(formData.get("rewardCredits") ?? "");
  const rawExpiresAt = String(formData.get("expiresAt") ?? "");
  const rawRedirectPath = String(formData.get("redirectPath") ?? "");
  const redirectPath = resolveAdminRedirectPath(rawRedirectPath.trim(), "/admin/codes?tab=referral");

  const discountPct = Number.parseInt(rawDiscountPct, 10);
  const rewardCredits = Number.parseInt(rawRewardCredits, 10);
  const expiresAt = parseExpiryDate(rawExpiresAt);
  const code = normalizeCode(rawCode || generateReferralCodeValue());

  if (!Number.isFinite(discountPct) || discountPct <= 0 || discountPct > 100) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Discount must be a number from 1 to 100.",
      })
    );
  }

  if (!Number.isFinite(rewardCredits) || rewardCredits <= 0) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Reward credits must be greater than 0.",
      })
    );
  }

  if (!expiresAt) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Set an expiration date for the referral code.",
      })
    );
  }

  if (expiresAt.getTime() <= Date.now()) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Referral code expiration must be in the future.",
      })
    );
  }

  if (await isCodeTakenAcrossSystem(code)) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "This code already exists in the system.",
      })
    );
  }

  await prisma.referralCode.create({
    data: {
      code,
      discountPct,
      expiresAt,
      isEnabled: true,
      ownerUserId: null,
      rewardCredits,
    },
  });

  revalidatePath("/admin");
  const successPath = withSearchParams(redirectPath, {
    codeTab: "referral",
    generatedReferralCode: code,
  });
  redirect(
    buildRedirectUrl({
      path: successPath,
      notice: "Referral code created.",
    })
  );
}
export async function toggleReferralCodeAction(formData: FormData) {
  await getAdminActor();

  const id = String(formData.get("id") ?? "");
  const nextEnabled = String(formData.get("nextEnabled") ?? "") === "true";

  if (!id) {
    redirect(buildRedirectUrl({ path: "/admin/codes?tab=referral", error: "Referral-код не найден." }));
  }

  await prisma.referralCode.update({
    data: { isEnabled: nextEnabled },
    where: { id },
  });

  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      path: "/admin/codes?tab=referral",
      notice: nextEnabled ? "Referral-код включен." : "Referral-код выключен.",
    })
  );
}

export async function createPromoCodeAction(formData: FormData) {
  await getAdminActor();

  const rawCode = String(formData.get("code") ?? "");
  const rawCreditAmount = String(formData.get("creditAmount") ?? "");
  const rawMaxRedemptions = String(formData.get("maxRedemptions") ?? "");
  const rawExpiresAt = String(formData.get("expiresAt") ?? "");
  const rawRedirectPath = String(formData.get("redirectPath") ?? "");
  const redirectPath = resolveAdminRedirectPath(rawRedirectPath.trim(), "/admin/codes?tab=promo");

  const creditAmount = Number.parseInt(rawCreditAmount, 10);
  const maxRedemptions = Number.parseInt(rawMaxRedemptions, 10);
  const expiresAt = parseExpiryDate(rawExpiresAt);
  const code = normalizeCode(rawCode || generatePromoCodeValue());

  if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Credit amount must be greater than 0.",
      })
    );
  }

  if (!Number.isFinite(maxRedemptions) || maxRedemptions <= 0) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Max redemptions must be greater than 0.",
      })
    );
  }

  if (!expiresAt) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Set an expiration date for the promo code.",
      })
    );
  }

  if (expiresAt.getTime() <= Date.now()) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Promo code expiration must be in the future.",
      })
    );
  }

  if (await isCodeTakenAcrossSystem(code)) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "This code already exists in the system.",
      })
    );
  }

  await prisma.promoCode.create({
    data: {
      code,
      creditAmount,
      expiresAt,
      isEnabled: true,
      maxRedemptions,
    },
  });

  revalidatePath("/admin");
  const successPath = withSearchParams(redirectPath, {
    codeTab: "promo",
    generatedPromoCode: code,
  });
  redirect(
    buildRedirectUrl({
      path: successPath,
      notice: "Promo code created.",
    })
  );
}
export async function togglePromoCodeAction(formData: FormData) {
  await getAdminActor();

  const id = String(formData.get("id") ?? "");
  const nextEnabled = String(formData.get("nextEnabled") ?? "") === "true";

  if (!id) {
    redirect(buildRedirectUrl({ path: "/admin/codes?tab=promo", error: "Промокод не найден." }));
  }

  await prisma.promoCode.update({
    data: { isEnabled: nextEnabled },
    where: { id },
  });

  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      path: "/admin/codes?tab=promo",
      notice: nextEnabled ? "Промокод включен." : "Промокод выключен.",
    })
  );
}

export async function saveSubscriptionDurationRulesAction(formData: FormData) {
  await getAdminActor();

  const rawRows = String(formData.get("rulesJson") ?? "");
  const minDevices = Number.parseInt(String(formData.get("minDevices") ?? ""), 10);
  const maxDevices = Number.parseInt(String(formData.get("maxDevices") ?? ""), 10);
  const baseDeviceMonthlyPrice = Number.parseInt(
    String(formData.get("baseDeviceMonthlyPrice") ?? ""),
    10
  );
  const extraDeviceMonthlyPrice = Number.parseInt(
    String(formData.get("extraDeviceMonthlyPrice") ?? ""),
    10
  );
  const durationMonthlyPrice = Number.parseInt(
    String(formData.get("durationMonthlyPrice") ?? ""),
    10
  );
  let parsedRows: Array<{
    id?: string;
    months: number;
    discountPercent: number;
  }> = [];

  try {
    parsedRows = JSON.parse(rawRows) as Array<{
      id?: string;
      months: number;
      discountPercent: number;
    }>;
  } catch {
    redirect(buildRedirectUrl({ path: "/admin/tariffs", error: "Некорректные данные таблицы сроков." }));
  }

  if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
    redirect(buildRedirectUrl({ path: "/admin/tariffs", error: "Добавьте хотя бы один срок подписки." }));
  }

  if (!Number.isFinite(baseDeviceMonthlyPrice) || baseDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Базовая цена в месяц (1 устройство) должна быть 0 или больше.",
      })
    );
  }

  if (!Number.isFinite(extraDeviceMonthlyPrice) || extraDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Цена доп. устройства в месяц должна быть 0 или больше.",
      })
    );
  }

  if (!Number.isFinite(durationMonthlyPrice) || durationMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Цена VPN в месяц должна быть 0 или больше.",
      })
    );
  }

  if (!Number.isFinite(minDevices) || minDevices <= 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Минимум устройств должен быть больше 0.",
      })
    );
  }

  if (!Number.isFinite(maxDevices) || maxDevices < minDevices) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Максимум устройств должен быть не меньше минимума.",
      })
    );
  }

  if (maxDevices > 10) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Максимум устройств не может быть больше 10.",
      })
    );
  }

  const normalizedRows = parsedRows.map((row) => ({
    discountPercent: Number.parseInt(String(row.discountPercent), 10),
    id: row.id ? String(row.id) : undefined,
    months: Number.parseInt(String(row.months), 10),
  }));

  const duplicateCheck = new Set<number>();
  for (const row of normalizedRows) {
    if (!Number.isFinite(row.months) || row.months <= 0 || row.months > 120) {
      redirect(
        buildRedirectUrl({
          path: "/admin/tariffs",
          error: "Срок должен быть в диапазоне от 1 до 120 месяцев.",
        })
      );
    }

    if (duplicateCheck.has(row.months)) {
      redirect(
        buildRedirectUrl({
          path: "/admin/tariffs",
          error: "Сроки должны быть уникальными.",
        })
      );
    }
    duplicateCheck.add(row.months);
    if (!Number.isFinite(row.discountPercent) || row.discountPercent < 0 || row.discountPercent > 100) {
      redirect(
        buildRedirectUrl({
          path: "/admin/tariffs",
          error: "Скидка должна быть целым числом от 0 до 100.",
        })
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.subscriptionPricingSettings.upsert({
      create: {
        baseDeviceMonthlyPrice,
        extraDeviceMonthlyPrice,
        id: 1,
        maxDevices,
        minDevices,
      },
      update: {
        baseDeviceMonthlyPrice,
        extraDeviceMonthlyPrice,
        maxDevices,
        minDevices,
      },
      where: { id: 1 },
    });

    const existingRows = await tx.subscriptionDurationRule.findMany({
      select: { id: true },
    });

    const submittedIds = new Set(
      normalizedRows.map((row) => row.id).filter((id): id is string => Boolean(id))
    );
    const idsToDelete = existingRows
      .map((row) => row.id)
      .filter((id) => !submittedIds.has(id));

    if (idsToDelete.length > 0) {
      await tx.subscriptionDurationRule.deleteMany({
        where: {
          id: {
            in: idsToDelete,
          },
        },
      });
    }

    for (const row of normalizedRows) {
      if (row.id) {
        await tx.subscriptionDurationRule.update({
          data: {
            discountPercent: row.discountPercent,
            isActive: true,
            monthlyPrice: durationMonthlyPrice,
            months: row.months,
          },
          where: { id: row.id },
        });
      } else {
        await tx.subscriptionDurationRule.create({
          data: {
            discountPercent: row.discountPercent,
            isActive: true,
            monthlyPrice: durationMonthlyPrice,
            months: row.months,
          },
        });
      }
    }
  });

  revalidatePath("/admin");
  revalidatePath("/app");
  redirect(buildRedirectUrl({ path: "/admin/tariffs", notice: "Настройки тарифа сохранены." }));
}

export async function updateSubscriptionPricingSettingsAction(formData: FormData) {
  await getAdminActor();

  const minDevices = Number.parseInt(String(formData.get("minDevices") ?? ""), 10);
  const maxDevices = Number.parseInt(String(formData.get("maxDevices") ?? ""), 10);
  const baseDeviceMonthlyPrice = Number.parseInt(
    String(formData.get("baseDeviceMonthlyPrice") ?? ""),
    10
  );
  const extraDeviceMonthlyPrice = Number.parseInt(
    String(formData.get("extraDeviceMonthlyPrice") ?? ""),
    10
  );

  if (!Number.isFinite(minDevices) || minDevices <= 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Минимум устройств должен быть больше 0.",
      })
    );
  }

  if (!Number.isFinite(maxDevices) || maxDevices < minDevices) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Максимум устройств должен быть не меньше минимума.",
      })
    );
  }

  if (maxDevices > 10) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Максимум устройств не может быть больше 10.",
      })
    );
  }

  if (!Number.isFinite(baseDeviceMonthlyPrice) || baseDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Базовая цена за месяц должна быть 0 или больше.",
      })
    );
  }

  if (!Number.isFinite(extraDeviceMonthlyPrice) || extraDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Цена доп. устройства в месяц должна быть 0 или больше.",
      })
    );
  }

  await prisma.subscriptionPricingSettings.upsert({
    create: {
      baseDeviceMonthlyPrice,
      extraDeviceMonthlyPrice,
      id: 1,
      maxDevices,
      minDevices,
    },
    update: {
      baseDeviceMonthlyPrice,
      extraDeviceMonthlyPrice,
      maxDevices,
      minDevices,
    },
    where: {
      id: 1,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/app");
  redirect(buildRedirectUrl({ path: "/admin/tariffs", notice: "Настройки стоимости сохранены." }));
}

export async function updateServiceCapacitySettingsAction(formData: FormData) {
  await getAdminActor();

  const maxActiveSubscriptions = Number.parseInt(
    String(formData.get("maxActiveSubscriptions") ?? ""),
    10
  );

  if (!Number.isFinite(maxActiveSubscriptions) || maxActiveSubscriptions < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/operations",
        error: "MAX_ACTIVE_SUBSCRIPTIONS должен быть целым числом от 0 и выше.",
      })
    );
  }

  if (maxActiveSubscriptions > 100000) {
    redirect(
      buildRedirectUrl({
        path: "/admin/operations",
        error: "MAX_ACTIVE_SUBSCRIPTIONS слишком большой (максимум 100000).",
      })
    );
  }

  await prisma.serviceCapacitySettings.upsert({
    create: {
      id: 1,
      maxActiveSubscriptions,
    },
    update: {
      maxActiveSubscriptions,
    },
    where: { id: 1 },
  });

  revalidatePath("/admin");
  revalidatePath("/app");
  redirect(
    buildRedirectUrl({
      path: "/admin/operations",
      notice:
        maxActiveSubscriptions === 0
          ? "Лимит активных подписок отключен."
          : "Лимит активных подписок сохранен.",
    })
  );
}

export async function updateLegalDocumentsAction(formData: FormData) {
  await getAdminActor();

  const userAgreementText = String(formData.get("userAgreementText") ?? "").trim();
  const publicOfferText = String(formData.get("publicOfferText") ?? "").trim();
  const privacyPolicyText = String(formData.get("privacyPolicyText") ?? "").trim();

  if (!userAgreementText) {
    redirect(
      buildRedirectUrl({
        path: "/admin/rules",
        error: "Текст «Пользовательское соглашение» не может быть пустым.",
      })
    );
  }

  if (!publicOfferText) {
    redirect(
      buildRedirectUrl({
        path: "/admin/rules",
        error: "Текст «Публичная оферта» не может быть пустым.",
      })
    );
  }

  if (!privacyPolicyText) {
    redirect(
      buildRedirectUrl({
        path: "/admin/rules",
        error: "Текст «Политика конфиденциальности» не может быть пустым.",
      })
    );
  }

  if (
    userAgreementText.length > 40000 ||
    publicOfferText.length > 40000 ||
    privacyPolicyText.length > 40000
  ) {
    redirect(
      buildRedirectUrl({
        path: "/admin/rules",
        error: "Один из юридических документов слишком длинный.",
      })
    );
  }

  await saveLegalDocuments({
    privacyPolicyText,
    publicOfferText,
    userAgreementText,
  });

  revalidatePath("/admin");
  revalidatePath("/rules");
  revalidatePath("/app");
  redirect(buildRedirectUrl({ path: "/admin/rules", notice: "Юридическая информация обновлена." }));
}

export async function updateUserAgreementAction(formData: FormData) {
  return updateLegalDocumentsAction(formData);
}

