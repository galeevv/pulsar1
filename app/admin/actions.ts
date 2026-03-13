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
  anchor: string;
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
  return `/admin${query ? `?${query}` : ""}${params.anchor}`;
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
  const expiresAt = parseExpiryDate(rawExpiresAt);
  const code = normalizeCode(rawCode || generateInviteCodeValue());

  if (!expiresAt) {
    redirect(
      buildRedirectUrl({
        anchor: "#invite-codes",
        error: "Укажите корректный срок действия invite-кода.",
      })
    );
  }

  if (expiresAt.getTime() <= Date.now()) {
    redirect(
      buildRedirectUrl({
        anchor: "#invite-codes",
        error: "Срок действия invite-кода должен быть в будущем.",
      })
    );
  }

  if (await isCodeTakenAcrossSystem(code)) {
    redirect(
      buildRedirectUrl({
        anchor: "#invite-codes",
        error: "Такой код уже существует в системе.",
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
  redirect(
    buildRedirectUrl({
      anchor: "#invite-codes",
      notice: "Invite-код создан.",
    })
  );
}

export async function toggleInviteCodeAction(formData: FormData) {
  await getAdminActor();

  const id = String(formData.get("id") ?? "");
  const nextEnabled = String(formData.get("nextEnabled") ?? "") === "true";

  if (!id) {
    redirect(buildRedirectUrl({ anchor: "#invite-codes", error: "Invite-код не найден." }));
  }

  await prisma.inviteCode.update({
    data: { isEnabled: nextEnabled },
    where: { id },
  });

  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      anchor: "#invite-codes",
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
        anchor: "#referral-codes",
        error: "Глобальная скидка должна быть числом от 1 до 100.",
      })
    );
  }

  if (!Number.isFinite(defaultRewardCredits) || defaultRewardCredits <= 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#referral-codes",
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
      anchor: "#referral-codes",
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

  const discountPct = Number.parseInt(rawDiscountPct, 10);
  const rewardCredits = Number.parseInt(rawRewardCredits, 10);
  const expiresAt = parseExpiryDate(rawExpiresAt);
  const code = normalizeCode(rawCode || generateReferralCodeValue());

  if (!Number.isFinite(discountPct) || discountPct <= 0 || discountPct > 100) {
    redirect(
      buildRedirectUrl({
        anchor: "#referral-codes",
        error: "Скидка должна быть числом от 1 до 100.",
      })
    );
  }

  if (!Number.isFinite(rewardCredits) || rewardCredits <= 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#referral-codes",
        error: "Количество бонусных кредитов должно быть больше 0.",
      })
    );
  }

  if (!expiresAt) {
    redirect(
      buildRedirectUrl({
        anchor: "#referral-codes",
        error: "Укажите корректный срок действия referral-кода.",
      })
    );
  }

  if (expiresAt.getTime() <= Date.now()) {
    redirect(
      buildRedirectUrl({
        anchor: "#referral-codes",
        error: "Срок действия referral-кода должен быть в будущем.",
      })
    );
  }

  if (await isCodeTakenAcrossSystem(code)) {
    redirect(
      buildRedirectUrl({
        anchor: "#referral-codes",
        error: "Такой код уже существует в системе.",
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
  redirect(
    buildRedirectUrl({
      anchor: "#referral-codes",
      notice: "Кастомный referral-код создан.",
    })
  );
}

export async function toggleReferralCodeAction(formData: FormData) {
  await getAdminActor();

  const id = String(formData.get("id") ?? "");
  const nextEnabled = String(formData.get("nextEnabled") ?? "") === "true";

  if (!id) {
    redirect(buildRedirectUrl({ anchor: "#referral-codes", error: "Referral-код не найден." }));
  }

  await prisma.referralCode.update({
    data: { isEnabled: nextEnabled },
    where: { id },
  });

  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      anchor: "#referral-codes",
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

  const creditAmount = Number.parseInt(rawCreditAmount, 10);
  const maxRedemptions = Number.parseInt(rawMaxRedemptions, 10);
  const expiresAt = parseExpiryDate(rawExpiresAt);
  const code = normalizeCode(rawCode || generatePromoCodeValue());

  if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#promocodes",
        error: "Количество кредитов должно быть больше 0.",
      })
    );
  }

  if (!Number.isFinite(maxRedemptions) || maxRedemptions <= 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#promocodes",
        error: "Лимит применений должен быть больше 0.",
      })
    );
  }

  if (!expiresAt) {
    redirect(
      buildRedirectUrl({
        anchor: "#promocodes",
        error: "Укажите корректный срок действия промокода.",
      })
    );
  }

  if (expiresAt.getTime() <= Date.now()) {
    redirect(
      buildRedirectUrl({
        anchor: "#promocodes",
        error: "Срок действия промокода должен быть в будущем.",
      })
    );
  }

  if (await isCodeTakenAcrossSystem(code)) {
    redirect(
      buildRedirectUrl({
        anchor: "#promocodes",
        error: "Такой код уже существует в системе.",
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
  redirect(
    buildRedirectUrl({
      anchor: "#promocodes",
      notice: "Промокод создан.",
    })
  );
}

export async function togglePromoCodeAction(formData: FormData) {
  await getAdminActor();

  const id = String(formData.get("id") ?? "");
  const nextEnabled = String(formData.get("nextEnabled") ?? "") === "true";

  if (!id) {
    redirect(buildRedirectUrl({ anchor: "#promocodes", error: "Промокод не найден." }));
  }

  await prisma.promoCode.update({
    data: { isEnabled: nextEnabled },
    where: { id },
  });

  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      anchor: "#promocodes",
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
    redirect(buildRedirectUrl({ anchor: "#tariffs", error: "Некорректные данные таблицы сроков." }));
  }

  if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
    redirect(buildRedirectUrl({ anchor: "#tariffs", error: "Добавьте хотя бы один срок подписки." }));
  }

  if (!Number.isFinite(baseDeviceMonthlyPrice) || baseDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Базовая цена в месяц (1 устройство) должна быть 0 или больше.",
      })
    );
  }

  if (!Number.isFinite(extraDeviceMonthlyPrice) || extraDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Цена доп. устройства в месяц должна быть 0 или больше.",
      })
    );
  }

  if (!Number.isFinite(durationMonthlyPrice) || durationMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Цена/мес должна быть 0 или больше.",
      })
    );
  }

  if (!Number.isFinite(minDevices) || minDevices <= 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Минимум устройств должен быть больше 0.",
      })
    );
  }

  if (!Number.isFinite(maxDevices) || maxDevices < minDevices) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Максимум устройств должен быть больше или равен минимуму.",
      })
    );
  }

  if (maxDevices > 10) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
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
          anchor: "#tariffs",
          error: "Срок должен быть в диапазоне от 1 до 120 месяцев.",
        })
      );
    }

    if (duplicateCheck.has(row.months)) {
      redirect(
        buildRedirectUrl({
          anchor: "#tariffs",
          error: "Сроки должны быть уникальными.",
        })
      );
    }
    duplicateCheck.add(row.months);
    if (!Number.isFinite(row.discountPercent) || row.discountPercent < 0 || row.discountPercent > 100) {
      redirect(
        buildRedirectUrl({
          anchor: "#tariffs",
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
  redirect(buildRedirectUrl({ anchor: "#tariffs", notice: "Настройки тарифа сохранены." }));
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
        anchor: "#tariffs",
        error: "Минимум устройств должен быть больше 0.",
      })
    );
  }

  if (!Number.isFinite(maxDevices) || maxDevices < minDevices) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Максимум устройств должен быть больше или равен минимуму.",
      })
    );
  }

  if (maxDevices > 10) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Максимум устройств не может быть больше 10.",
      })
    );
  }

  if (!Number.isFinite(baseDeviceMonthlyPrice) || baseDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Базовая цена за месяц должна быть 0 или больше.",
      })
    );
  }

  if (!Number.isFinite(extraDeviceMonthlyPrice) || extraDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
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
  redirect(buildRedirectUrl({ anchor: "#tariffs", notice: "Настройки стоимости сохранены." }));
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
        anchor: "#operations",
        error: "MAX_ACTIVE_SUBSCRIPTIONS должен быть целым числом от 0 и выше.",
      })
    );
  }

  if (maxActiveSubscriptions > 100000) {
    redirect(
      buildRedirectUrl({
        anchor: "#operations",
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
      anchor: "#operations",
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
        anchor: "#rules",
        error: "Текст «Пользовательское соглашение» не может быть пустым.",
      })
    );
  }

  if (!publicOfferText) {
    redirect(
      buildRedirectUrl({
        anchor: "#rules",
        error: "Текст «Публичная оферта» не может быть пустым.",
      })
    );
  }

  if (!privacyPolicyText) {
    redirect(
      buildRedirectUrl({
        anchor: "#rules",
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
        anchor: "#rules",
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
  redirect(buildRedirectUrl({ anchor: "#rules", notice: "Юридическая информация обновлена." }));
}

export async function updateUserAgreementAction(formData: FormData) {
  return updateLegalDocumentsAction(formData);
}
