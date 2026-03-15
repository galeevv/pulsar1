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

function parseExpiryDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function getAdminActor() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?mode=login&error=РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРёС‚Рµ РІ Р°РєРєР°СѓРЅС‚.");
  }

  if (session.role !== "ADMIN") {
    redirect("/app");
  }

  const user = await prisma.user.findUnique({
    select: { id: true },
    where: { username: session.username },
  });

  if (!user) {
    redirect("/login?mode=login&error=РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРёС‚Рµ РІ Р°РєРєР°СѓРЅС‚.");
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
        error: "РЈРєР°Р¶РёС‚Рµ РєРѕСЂСЂРµРєС‚РЅС‹Р№ СЃСЂРѕРє РґРµР№СЃС‚РІРёСЏ invite-РєРѕРґР°.",
      })
    );
  }

  if (expiresAt.getTime() <= Date.now()) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "РЎСЂРѕРє РґРµР№СЃС‚РІРёСЏ invite-РєРѕРґР° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РІ Р±СѓРґСѓС‰РµРј.",
      })
    );
  }

  if (await isCodeTakenAcrossSystem(code)) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "РўР°РєРѕР№ РєРѕРґ СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚ РІ СЃРёСЃС‚РµРјРµ.",
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
      path: redirectPath,
      notice: "Invite-РєРѕРґ СЃРѕР·РґР°РЅ.",
    })
  );
}

export async function toggleInviteCodeAction(formData: FormData) {
  await getAdminActor();

  const id = String(formData.get("id") ?? "");
  const nextEnabled = String(formData.get("nextEnabled") ?? "") === "true";

  if (!id) {
    redirect(buildRedirectUrl({ path: "/admin/codes?tab=invite", error: "Invite-РєРѕРґ РЅРµ РЅР°Р№РґРµРЅ." }));
  }

  await prisma.inviteCode.update({
    data: { isEnabled: nextEnabled },
    where: { id },
  });

  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      path: "/admin/codes?tab=invite",
      notice: nextEnabled ? "Invite-РєРѕРґ РІРєР»СЋС‡РµРЅ." : "Invite-РєРѕРґ РІС‹РєР»СЋС‡РµРЅ.",
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
        error: "Р“Р»РѕР±Р°Р»СЊРЅР°СЏ СЃРєРёРґРєР° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ С‡РёСЃР»РѕРј РѕС‚ 1 РґРѕ 100.",
      })
    );
  }

  if (!Number.isFinite(defaultRewardCredits) || defaultRewardCredits <= 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/codes?tab=referral",
        error: "Р“Р»РѕР±Р°Р»СЊРЅС‹Р№ Р±РѕРЅСѓСЃ РІ РєСЂРµРґРёС‚Р°С… РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 0.",
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
      notice: "Р“Р»РѕР±Р°Р»СЊРЅС‹Рµ РЅР°СЃС‚СЂРѕР№РєРё СЂРµС„РµСЂР°Р»СЊРЅРѕР№ СЃРёСЃС‚РµРјС‹ СЃРѕС…СЂР°РЅРµРЅС‹.",
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
        error: "РЎРєРёРґРєР° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ С‡РёСЃР»РѕРј РѕС‚ 1 РґРѕ 100.",
      })
    );
  }

  if (!Number.isFinite(rewardCredits) || rewardCredits <= 0) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "РљРѕР»РёС‡РµСЃС‚РІРѕ Р±РѕРЅСѓСЃРЅС‹С… РєСЂРµРґРёС‚РѕРІ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 0.",
      })
    );
  }

  if (!expiresAt) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "РЈРєР°Р¶РёС‚Рµ РєРѕСЂСЂРµРєС‚РЅС‹Р№ СЃСЂРѕРє РґРµР№СЃС‚РІРёСЏ referral-РєРѕРґР°.",
      })
    );
  }

  if (expiresAt.getTime() <= Date.now()) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "РЎСЂРѕРє РґРµР№СЃС‚РІРёСЏ referral-РєРѕРґР° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РІ Р±СѓРґСѓС‰РµРј.",
      })
    );
  }

  if (await isCodeTakenAcrossSystem(code)) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "РўР°РєРѕР№ РєРѕРґ СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚ РІ СЃРёСЃС‚РµРјРµ.",
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
      path: redirectPath,
      notice: "РљР°СЃС‚РѕРјРЅС‹Р№ referral-РєРѕРґ СЃРѕР·РґР°РЅ.",
    })
  );
}

export async function toggleReferralCodeAction(formData: FormData) {
  await getAdminActor();

  const id = String(formData.get("id") ?? "");
  const nextEnabled = String(formData.get("nextEnabled") ?? "") === "true";

  if (!id) {
    redirect(buildRedirectUrl({ path: "/admin/codes?tab=referral", error: "Referral-РєРѕРґ РЅРµ РЅР°Р№РґРµРЅ." }));
  }

  await prisma.referralCode.update({
    data: { isEnabled: nextEnabled },
    where: { id },
  });

  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      path: "/admin/codes?tab=referral",
      notice: nextEnabled ? "Referral-РєРѕРґ РІРєР»СЋС‡РµРЅ." : "Referral-РєРѕРґ РІС‹РєР»СЋС‡РµРЅ.",
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
        error: "РљРѕР»РёС‡РµСЃС‚РІРѕ РєСЂРµРґРёС‚РѕРІ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 0.",
      })
    );
  }

  if (!Number.isFinite(maxRedemptions) || maxRedemptions <= 0) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Р›РёРјРёС‚ РїСЂРёРјРµРЅРµРЅРёР№ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 0.",
      })
    );
  }

  if (!expiresAt) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "РЈРєР°Р¶РёС‚Рµ РєРѕСЂСЂРµРєС‚РЅС‹Р№ СЃСЂРѕРє РґРµР№СЃС‚РІРёСЏ РїСЂРѕРјРѕРєРѕРґР°.",
      })
    );
  }

  if (expiresAt.getTime() <= Date.now()) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "РЎСЂРѕРє РґРµР№СЃС‚РІРёСЏ РїСЂРѕРјРѕРєРѕРґР° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РІ Р±СѓРґСѓС‰РµРј.",
      })
    );
  }

  if (await isCodeTakenAcrossSystem(code)) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "РўР°РєРѕР№ РєРѕРґ СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚ РІ СЃРёСЃС‚РµРјРµ.",
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
      path: redirectPath,
      notice: "РџСЂРѕРјРѕРєРѕРґ СЃРѕР·РґР°РЅ.",
    })
  );
}

export async function togglePromoCodeAction(formData: FormData) {
  await getAdminActor();

  const id = String(formData.get("id") ?? "");
  const nextEnabled = String(formData.get("nextEnabled") ?? "") === "true";

  if (!id) {
    redirect(buildRedirectUrl({ path: "/admin/codes?tab=promo", error: "РџСЂРѕРјРѕРєРѕРґ РЅРµ РЅР°Р№РґРµРЅ." }));
  }

  await prisma.promoCode.update({
    data: { isEnabled: nextEnabled },
    where: { id },
  });

  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      path: "/admin/codes?tab=promo",
      notice: nextEnabled ? "РџСЂРѕРјРѕРєРѕРґ РІРєР»СЋС‡РµРЅ." : "РџСЂРѕРјРѕРєРѕРґ РІС‹РєР»СЋС‡РµРЅ.",
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
    redirect(buildRedirectUrl({ path: "/admin/tariffs", error: "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Рµ РґР°РЅРЅС‹Рµ С‚Р°Р±Р»РёС†С‹ СЃСЂРѕРєРѕРІ." }));
  }

  if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
    redirect(buildRedirectUrl({ path: "/admin/tariffs", error: "Р”РѕР±Р°РІСЊС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ СЃСЂРѕРє РїРѕРґРїРёСЃРєРё." }));
  }

  if (!Number.isFinite(baseDeviceMonthlyPrice) || baseDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р‘Р°Р·РѕРІР°СЏ С†РµРЅР° РІ РјРµСЃСЏС† (1 СѓСЃС‚СЂРѕР№СЃС‚РІРѕ) РґРѕР»Р¶РЅР° Р±С‹С‚СЊ 0 РёР»Рё Р±РѕР»СЊС€Рµ.",
      })
    );
  }

  if (!Number.isFinite(extraDeviceMonthlyPrice) || extraDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р¦РµРЅР° РґРѕРї. СѓСЃС‚СЂРѕР№СЃС‚РІР° РІ РјРµСЃСЏС† РґРѕР»Р¶РЅР° Р±С‹С‚СЊ 0 РёР»Рё Р±РѕР»СЊС€Рµ.",
      })
    );
  }

  if (!Number.isFinite(durationMonthlyPrice) || durationMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р¦РµРЅР°/РјРµСЃ РґРѕР»Р¶РЅР° Р±С‹С‚СЊ 0 РёР»Рё Р±РѕР»СЊС€Рµ.",
      })
    );
  }

  if (!Number.isFinite(minDevices) || minDevices <= 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "РњРёРЅРёРјСѓРј СѓСЃС‚СЂРѕР№СЃС‚РІ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 0.",
      })
    );
  }

  if (!Number.isFinite(maxDevices) || maxDevices < minDevices) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "РњР°РєСЃРёРјСѓРј СѓСЃС‚СЂРѕР№СЃС‚РІ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ РёР»Рё СЂР°РІРµРЅ РјРёРЅРёРјСѓРјСѓ.",
      })
    );
  }

  if (maxDevices > 10) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "РњР°РєСЃРёРјСѓРј СѓСЃС‚СЂРѕР№СЃС‚РІ РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 10.",
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
          error: "РЎСЂРѕРє РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РІ РґРёР°РїР°Р·РѕРЅРµ РѕС‚ 1 РґРѕ 120 РјРµСЃСЏС†РµРІ.",
        })
      );
    }

    if (duplicateCheck.has(row.months)) {
      redirect(
        buildRedirectUrl({
          path: "/admin/tariffs",
          error: "РЎСЂРѕРєРё РґРѕР»Р¶РЅС‹ Р±С‹С‚СЊ СѓРЅРёРєР°Р»СЊРЅС‹РјРё.",
        })
      );
    }
    duplicateCheck.add(row.months);
    if (!Number.isFinite(row.discountPercent) || row.discountPercent < 0 || row.discountPercent > 100) {
      redirect(
        buildRedirectUrl({
          path: "/admin/tariffs",
          error: "РЎРєРёРґРєР° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ С†РµР»С‹Рј С‡РёСЃР»РѕРј РѕС‚ 0 РґРѕ 100.",
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
  redirect(buildRedirectUrl({ path: "/admin/tariffs", notice: "РќР°СЃС‚СЂРѕР№РєРё С‚Р°СЂРёС„Р° СЃРѕС…СЂР°РЅРµРЅС‹." }));
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
        error: "РњРёРЅРёРјСѓРј СѓСЃС‚СЂРѕР№СЃС‚РІ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 0.",
      })
    );
  }

  if (!Number.isFinite(maxDevices) || maxDevices < minDevices) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "РњР°РєСЃРёРјСѓРј СѓСЃС‚СЂРѕР№СЃС‚РІ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ РёР»Рё СЂР°РІРµРЅ РјРёРЅРёРјСѓРјСѓ.",
      })
    );
  }

  if (maxDevices > 10) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "РњР°РєСЃРёРјСѓРј СѓСЃС‚СЂРѕР№СЃС‚РІ РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 10.",
      })
    );
  }

  if (!Number.isFinite(baseDeviceMonthlyPrice) || baseDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р‘Р°Р·РѕРІР°СЏ С†РµРЅР° Р·Р° РјРµСЃСЏС† РґРѕР»Р¶РЅР° Р±С‹С‚СЊ 0 РёР»Рё Р±РѕР»СЊС€Рµ.",
      })
    );
  }

  if (!Number.isFinite(extraDeviceMonthlyPrice) || extraDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р¦РµРЅР° РґРѕРї. СѓСЃС‚СЂРѕР№СЃС‚РІР° РІ РјРµСЃСЏС† РґРѕР»Р¶РЅР° Р±С‹С‚СЊ 0 РёР»Рё Р±РѕР»СЊС€Рµ.",
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
  redirect(buildRedirectUrl({ path: "/admin/tariffs", notice: "РќР°СЃС‚СЂРѕР№РєРё СЃС‚РѕРёРјРѕСЃС‚Рё СЃРѕС…СЂР°РЅРµРЅС‹." }));
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
        error: "MAX_ACTIVE_SUBSCRIPTIONS РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ С†РµР»С‹Рј С‡РёСЃР»РѕРј РѕС‚ 0 Рё РІС‹С€Рµ.",
      })
    );
  }

  if (maxActiveSubscriptions > 100000) {
    redirect(
      buildRedirectUrl({
        path: "/admin/operations",
        error: "MAX_ACTIVE_SUBSCRIPTIONS СЃР»РёС€РєРѕРј Р±РѕР»СЊС€РѕР№ (РјР°РєСЃРёРјСѓРј 100000).",
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
          ? "Р›РёРјРёС‚ Р°РєС‚РёРІРЅС‹С… РїРѕРґРїРёСЃРѕРє РѕС‚РєР»СЋС‡РµРЅ."
          : "Р›РёРјРёС‚ Р°РєС‚РёРІРЅС‹С… РїРѕРґРїРёСЃРѕРє СЃРѕС…СЂР°РЅРµРЅ.",
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
        error: "РўРµРєСЃС‚ В«РџРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРѕРµ СЃРѕРіР»Р°С€РµРЅРёРµВ» РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РїСѓСЃС‚С‹Рј.",
      })
    );
  }

  if (!publicOfferText) {
    redirect(
      buildRedirectUrl({
        path: "/admin/rules",
        error: "РўРµРєСЃС‚ В«РџСѓР±Р»РёС‡РЅР°СЏ РѕС„РµСЂС‚Р°В» РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РїСѓСЃС‚С‹Рј.",
      })
    );
  }

  if (!privacyPolicyText) {
    redirect(
      buildRedirectUrl({
        path: "/admin/rules",
        error: "РўРµРєСЃС‚ В«РџРѕР»РёС‚РёРєР° РєРѕРЅС„РёРґРµРЅС†РёР°Р»СЊРЅРѕСЃС‚РёВ» РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РїСѓСЃС‚С‹Рј.",
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
        error: "РћРґРёРЅ РёР· СЋСЂРёРґРёС‡РµСЃРєРёС… РґРѕРєСѓРјРµРЅС‚РѕРІ СЃР»РёС€РєРѕРј РґР»РёРЅРЅС‹Р№.",
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
  redirect(buildRedirectUrl({ path: "/admin/rules", notice: "Р®СЂРёРґРёС‡РµСЃРєР°СЏ РёРЅС„РѕСЂРјР°С†РёСЏ РѕР±РЅРѕРІР»РµРЅР°." }));
}

export async function updateUserAgreementAction(formData: FormData) {
  return updateLegalDocumentsAction(formData);
}
