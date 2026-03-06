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

export async function createTariffAction(formData: FormData) {
  await getAdminActor();

  const name = String(formData.get("name") ?? "").trim();
  const periodMonths = Number.parseInt(String(formData.get("periodMonths") ?? ""), 10);
  const priceRub = Number.parseInt(String(formData.get("priceRub") ?? ""), 10);
  const devicePriceRub = Number.parseInt(String(formData.get("devicePriceRub") ?? ""), 10);
  const deviceLimit = Number.parseInt(String(formData.get("deviceLimit") ?? ""), 10);
  const isEnabled = String(formData.get("isEnabled") ?? "") === "on";

  if (!name) {
    redirect(buildRedirectUrl({ anchor: "#tariffs", error: "Укажите название тарифа." }));
  }

  if (!Number.isFinite(periodMonths) || periodMonths <= 0) {
    redirect(
      buildRedirectUrl({ anchor: "#tariffs", error: "Период тарифа должен быть больше 0." })
    );
  }

  if (!Number.isFinite(priceRub) || priceRub <= 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Цена одного месяца должна быть больше 0.",
      })
    );
  }

  if (!Number.isFinite(devicePriceRub) || devicePriceRub < 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Цена одного устройства не может быть отрицательной.",
      })
    );
  }

  if (!Number.isFinite(deviceLimit) || deviceLimit <= 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Количество устройств должно быть больше 0.",
      })
    );
  }

  await prisma.tariff.create({
    data: {
      deviceLimit,
      devicePriceRub,
      isEnabled,
      name,
      periodMonths,
      priceRub,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/app");
  redirect(buildRedirectUrl({ anchor: "#tariffs", notice: "Тариф создан." }));
}

export async function updateTariffAction(formData: FormData) {
  await getAdminActor();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const periodMonths = Number.parseInt(String(formData.get("periodMonths") ?? ""), 10);
  const priceRub = Number.parseInt(String(formData.get("priceRub") ?? ""), 10);
  const devicePriceRub = Number.parseInt(String(formData.get("devicePriceRub") ?? ""), 10);
  const deviceLimit = Number.parseInt(String(formData.get("deviceLimit") ?? ""), 10);
  const isEnabled = String(formData.get("isEnabled") ?? "") === "on";

  if (!id) {
    redirect(buildRedirectUrl({ anchor: "#tariffs", error: "Тариф не найден." }));
  }

  if (!name) {
    redirect(buildRedirectUrl({ anchor: "#tariffs", error: "Укажите название тарифа." }));
  }

  if (!Number.isFinite(periodMonths) || periodMonths <= 0) {
    redirect(
      buildRedirectUrl({ anchor: "#tariffs", error: "Период тарифа должен быть больше 0." })
    );
  }

  if (!Number.isFinite(priceRub) || priceRub <= 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Цена одного месяца должна быть больше 0.",
      })
    );
  }

  if (!Number.isFinite(devicePriceRub) || devicePriceRub < 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Цена одного устройства не может быть отрицательной.",
      })
    );
  }

  if (!Number.isFinite(deviceLimit) || deviceLimit <= 0) {
    redirect(
      buildRedirectUrl({
        anchor: "#tariffs",
        error: "Количество устройств должно быть больше 0.",
      })
    );
  }

  await prisma.tariff.update({
    data: {
      deviceLimit,
      devicePriceRub,
      isEnabled,
      name,
      periodMonths,
      priceRub,
    },
    where: { id },
  });

  revalidatePath("/admin");
  revalidatePath("/app");
  redirect(buildRedirectUrl({ anchor: "#tariffs", notice: "Тариф сохранен." }));
}
