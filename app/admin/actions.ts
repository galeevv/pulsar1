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
    redirect("/login?mode=login&error=Р РЋР Р…Р В°РЎвЂЎР В°Р В»Р В° Р Р†Р С•Р в„–Р Т‘Р С‘РЎвЂљР Вµ Р Р† Р В°Р С”Р С”Р В°РЎС“Р Р…РЎвЂљ.");
  }

  if (session.role !== "ADMIN") {
    redirect("/app");
  }

  const user = await prisma.user.findUnique({
    select: { id: true },
    where: { username: session.username },
  });

  if (!user) {
    redirect("/login?mode=login&error=Р РЋР Р…Р В°РЎвЂЎР В°Р В»Р В° Р Р†Р С•Р в„–Р Т‘Р С‘РЎвЂљР Вµ Р Р† Р В°Р С”Р С”Р В°РЎС“Р Р…РЎвЂљ.");
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
  redirect(
    buildRedirectUrl({
      path: redirectPath,
      notice: "Invite code created.",
    })
  );
}
export async function toggleInviteCodeAction(formData: FormData) {
  await getAdminActor();

  const id = String(formData.get("id") ?? "");
  const nextEnabled = String(formData.get("nextEnabled") ?? "") === "true";

  if (!id) {
    redirect(buildRedirectUrl({ path: "/admin/codes?tab=invite", error: "Invite-Р С”Р С•Р Т‘ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…." }));
  }

  await prisma.inviteCode.update({
    data: { isEnabled: nextEnabled },
    where: { id },
  });

  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      path: "/admin/codes?tab=invite",
      notice: nextEnabled ? "Invite-Р С”Р С•Р Т‘ Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…." : "Invite-Р С”Р С•Р Т‘ Р Р†РЎвЂ№Р С”Р В»РЎР‹РЎвЂЎР ВµР Р….",
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
        error: "Р вЂњР В»Р С•Р В±Р В°Р В»РЎРЉР Р…Р В°РЎРЏ РЎРѓР С”Р С‘Р Т‘Р С”Р В° Р Т‘Р С•Р В»Р В¶Р Р…Р В° Р В±РЎвЂ№РЎвЂљРЎРЉ РЎвЂЎР С‘РЎРѓР В»Р С•Р С Р С•РЎвЂљ 1 Р Т‘Р С• 100.",
      })
    );
  }

  if (!Number.isFinite(defaultRewardCredits) || defaultRewardCredits <= 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/codes?tab=referral",
        error: "Р вЂњР В»Р С•Р В±Р В°Р В»РЎРЉР Р…РЎвЂ№Р в„– Р В±Р С•Р Р…РЎС“РЎРѓ Р Р† Р С”РЎР‚Р ВµР Т‘Р С‘РЎвЂљР В°РЎвЂ¦ Р Т‘Р С•Р В»Р В¶Р ВµР Р… Р В±РЎвЂ№РЎвЂљРЎРЉ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ 0.",
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
      notice: "Р вЂњР В»Р С•Р В±Р В°Р В»РЎРЉР Р…РЎвЂ№Р Вµ Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р в„–Р С”Р С‘ РЎР‚Р ВµРЎвЂћР ВµРЎР‚Р В°Р В»РЎРЉР Р…Р С•Р в„– РЎРѓР С‘РЎРѓРЎвЂљР ВµР СРЎвЂ№ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р ВµР Р…РЎвЂ№.",
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
  redirect(
    buildRedirectUrl({
      path: redirectPath,
      notice: "Referral code created.",
    })
  );
}
export async function toggleReferralCodeAction(formData: FormData) {
  await getAdminActor();

  const id = String(formData.get("id") ?? "");
  const nextEnabled = String(formData.get("nextEnabled") ?? "") === "true";

  if (!id) {
    redirect(buildRedirectUrl({ path: "/admin/codes?tab=referral", error: "Referral-Р С”Р С•Р Т‘ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…." }));
  }

  await prisma.referralCode.update({
    data: { isEnabled: nextEnabled },
    where: { id },
  });

  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      path: "/admin/codes?tab=referral",
      notice: nextEnabled ? "Referral-Р С”Р С•Р Т‘ Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…." : "Referral-Р С”Р С•Р Т‘ Р Р†РЎвЂ№Р С”Р В»РЎР‹РЎвЂЎР ВµР Р….",
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
  redirect(
    buildRedirectUrl({
      path: redirectPath,
      notice: "Promo code created.",
    })
  );
}
export async function togglePromoCodeAction(formData: FormData) {
  await getAdminActor();

  const id = String(formData.get("id") ?? "");
  const nextEnabled = String(formData.get("nextEnabled") ?? "") === "true";

  if (!id) {
    redirect(buildRedirectUrl({ path: "/admin/codes?tab=promo", error: "Р СџРЎР‚Р С•Р СР С•Р С”Р С•Р Т‘ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…." }));
  }

  await prisma.promoCode.update({
    data: { isEnabled: nextEnabled },
    where: { id },
  });

  revalidatePath("/admin");
  redirect(
    buildRedirectUrl({
      path: "/admin/codes?tab=promo",
      notice: nextEnabled ? "Р СџРЎР‚Р С•Р СР С•Р С”Р С•Р Т‘ Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…." : "Р СџРЎР‚Р С•Р СР С•Р С”Р С•Р Т‘ Р Р†РЎвЂ№Р С”Р В»РЎР‹РЎвЂЎР ВµР Р….",
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
    redirect(buildRedirectUrl({ path: "/admin/tariffs", error: "Р СњР ВµР С”Р С•РЎР‚РЎР‚Р ВµР С”РЎвЂљР Р…РЎвЂ№Р Вµ Р Т‘Р В°Р Р…Р Р…РЎвЂ№Р Вµ РЎвЂљР В°Р В±Р В»Р С‘РЎвЂ РЎвЂ№ РЎРѓРЎР‚Р С•Р С”Р С•Р Р†." }));
  }

  if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
    redirect(buildRedirectUrl({ path: "/admin/tariffs", error: "Р вЂќР С•Р В±Р В°Р Р†РЎРЉРЎвЂљР Вµ РЎвЂ¦Р С•РЎвЂљРЎРЏ Р В±РЎвЂ№ Р С•Р Т‘Р С‘Р Р… РЎРѓРЎР‚Р С•Р С” Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”Р С‘." }));
  }

  if (!Number.isFinite(baseDeviceMonthlyPrice) || baseDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р вЂР В°Р В·Р С•Р Р†Р В°РЎРЏ РЎвЂ Р ВµР Р…Р В° Р Р† Р СР ВµРЎРѓРЎРЏРЎвЂ  (1 РЎС“РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р†Р С•) Р Т‘Р С•Р В»Р В¶Р Р…Р В° Р В±РЎвЂ№РЎвЂљРЎРЉ 0 Р С‘Р В»Р С‘ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ.",
      })
    );
  }

  if (!Number.isFinite(extraDeviceMonthlyPrice) || extraDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р В¦Р ВµР Р…Р В° Р Т‘Р С•Р С—. РЎС“РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р†Р В° Р Р† Р СР ВµРЎРѓРЎРЏРЎвЂ  Р Т‘Р С•Р В»Р В¶Р Р…Р В° Р В±РЎвЂ№РЎвЂљРЎРЉ 0 Р С‘Р В»Р С‘ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ.",
      })
    );
  }

  if (!Number.isFinite(durationMonthlyPrice) || durationMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р В¦Р ВµР Р…Р В°/Р СР ВµРЎРѓ Р Т‘Р С•Р В»Р В¶Р Р…Р В° Р В±РЎвЂ№РЎвЂљРЎРЉ 0 Р С‘Р В»Р С‘ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ.",
      })
    );
  }

  if (!Number.isFinite(minDevices) || minDevices <= 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р СљР С‘Р Р…Р С‘Р СРЎС“Р С РЎС“РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р† Р Т‘Р С•Р В»Р В¶Р ВµР Р… Р В±РЎвЂ№РЎвЂљРЎРЉ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ 0.",
      })
    );
  }

  if (!Number.isFinite(maxDevices) || maxDevices < minDevices) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р СљР В°Р С”РЎРѓР С‘Р СРЎС“Р С РЎС“РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р† Р Т‘Р С•Р В»Р В¶Р ВµР Р… Р В±РЎвЂ№РЎвЂљРЎРЉ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ Р С‘Р В»Р С‘ РЎР‚Р В°Р Р†Р ВµР Р… Р СР С‘Р Р…Р С‘Р СРЎС“Р СРЎС“.",
      })
    );
  }

  if (maxDevices > 10) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р СљР В°Р С”РЎРѓР С‘Р СРЎС“Р С РЎС“РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р† Р Р…Р Вµ Р СР С•Р В¶Р ВµРЎвЂљ Р В±РЎвЂ№РЎвЂљРЎРЉ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ 10.",
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
          error: "Р РЋРЎР‚Р С•Р С” Р Т‘Р С•Р В»Р В¶Р ВµР Р… Р В±РЎвЂ№РЎвЂљРЎРЉ Р Р† Р Т‘Р С‘Р В°Р С—Р В°Р В·Р С•Р Р…Р Вµ Р С•РЎвЂљ 1 Р Т‘Р С• 120 Р СР ВµРЎРѓРЎРЏРЎвЂ Р ВµР Р†.",
        })
      );
    }

    if (duplicateCheck.has(row.months)) {
      redirect(
        buildRedirectUrl({
          path: "/admin/tariffs",
          error: "Р РЋРЎР‚Р С•Р С”Р С‘ Р Т‘Р С•Р В»Р В¶Р Р…РЎвЂ№ Р В±РЎвЂ№РЎвЂљРЎРЉ РЎС“Р Р…Р С‘Р С”Р В°Р В»РЎРЉР Р…РЎвЂ№Р СР С‘.",
        })
      );
    }
    duplicateCheck.add(row.months);
    if (!Number.isFinite(row.discountPercent) || row.discountPercent < 0 || row.discountPercent > 100) {
      redirect(
        buildRedirectUrl({
          path: "/admin/tariffs",
          error: "Р РЋР С”Р С‘Р Т‘Р С”Р В° Р Т‘Р С•Р В»Р В¶Р Р…Р В° Р В±РЎвЂ№РЎвЂљРЎРЉ РЎвЂ Р ВµР В»РЎвЂ№Р С РЎвЂЎР С‘РЎРѓР В»Р С•Р С Р С•РЎвЂљ 0 Р Т‘Р С• 100.",
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
  redirect(buildRedirectUrl({ path: "/admin/tariffs", notice: "Р СњР В°РЎРѓРЎвЂљРЎР‚Р С•Р в„–Р С”Р С‘ РЎвЂљР В°РЎР‚Р С‘РЎвЂћР В° РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р ВµР Р…РЎвЂ№." }));
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
        error: "Р СљР С‘Р Р…Р С‘Р СРЎС“Р С РЎС“РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р† Р Т‘Р С•Р В»Р В¶Р ВµР Р… Р В±РЎвЂ№РЎвЂљРЎРЉ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ 0.",
      })
    );
  }

  if (!Number.isFinite(maxDevices) || maxDevices < minDevices) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р СљР В°Р С”РЎРѓР С‘Р СРЎС“Р С РЎС“РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р† Р Т‘Р С•Р В»Р В¶Р ВµР Р… Р В±РЎвЂ№РЎвЂљРЎРЉ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ Р С‘Р В»Р С‘ РЎР‚Р В°Р Р†Р ВµР Р… Р СР С‘Р Р…Р С‘Р СРЎС“Р СРЎС“.",
      })
    );
  }

  if (maxDevices > 10) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р СљР В°Р С”РЎРѓР С‘Р СРЎС“Р С РЎС“РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р† Р Р…Р Вµ Р СР С•Р В¶Р ВµРЎвЂљ Р В±РЎвЂ№РЎвЂљРЎРЉ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ 10.",
      })
    );
  }

  if (!Number.isFinite(baseDeviceMonthlyPrice) || baseDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р вЂР В°Р В·Р С•Р Р†Р В°РЎРЏ РЎвЂ Р ВµР Р…Р В° Р В·Р В° Р СР ВµРЎРѓРЎРЏРЎвЂ  Р Т‘Р С•Р В»Р В¶Р Р…Р В° Р В±РЎвЂ№РЎвЂљРЎРЉ 0 Р С‘Р В»Р С‘ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ.",
      })
    );
  }

  if (!Number.isFinite(extraDeviceMonthlyPrice) || extraDeviceMonthlyPrice < 0) {
    redirect(
      buildRedirectUrl({
        path: "/admin/tariffs",
        error: "Р В¦Р ВµР Р…Р В° Р Т‘Р С•Р С—. РЎС“РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р†Р В° Р Р† Р СР ВµРЎРѓРЎРЏРЎвЂ  Р Т‘Р С•Р В»Р В¶Р Р…Р В° Р В±РЎвЂ№РЎвЂљРЎРЉ 0 Р С‘Р В»Р С‘ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ.",
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
  redirect(buildRedirectUrl({ path: "/admin/tariffs", notice: "Р СњР В°РЎРѓРЎвЂљРЎР‚Р С•Р в„–Р С”Р С‘ РЎРѓРЎвЂљР С•Р С‘Р СР С•РЎРѓРЎвЂљР С‘ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р ВµР Р…РЎвЂ№." }));
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
        error: "MAX_ACTIVE_SUBSCRIPTIONS Р Т‘Р С•Р В»Р В¶Р ВµР Р… Р В±РЎвЂ№РЎвЂљРЎРЉ РЎвЂ Р ВµР В»РЎвЂ№Р С РЎвЂЎР С‘РЎРѓР В»Р С•Р С Р С•РЎвЂљ 0 Р С‘ Р Р†РЎвЂ№РЎв‚¬Р Вµ.",
      })
    );
  }

  if (maxActiveSubscriptions > 100000) {
    redirect(
      buildRedirectUrl({
        path: "/admin/operations",
        error: "MAX_ACTIVE_SUBSCRIPTIONS РЎРѓР В»Р С‘РЎв‚¬Р С”Р С•Р С Р В±Р С•Р В»РЎРЉРЎв‚¬Р С•Р в„– (Р СР В°Р С”РЎРѓР С‘Р СРЎС“Р С 100000).",
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
          ? "Р вЂєР С‘Р СР С‘РЎвЂљ Р В°Р С”РЎвЂљР С‘Р Р†Р Р…РЎвЂ№РЎвЂ¦ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С•Р С” Р С•РЎвЂљР С”Р В»РЎР‹РЎвЂЎР ВµР Р…."
          : "Р вЂєР С‘Р СР С‘РЎвЂљ Р В°Р С”РЎвЂљР С‘Р Р†Р Р…РЎвЂ№РЎвЂ¦ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С•Р С” РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р ВµР Р….",
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
        error: "Р СћР ВµР С”РЎРѓРЎвЂљ Р’В«Р СџР С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЉРЎРѓР С”Р С•Р Вµ РЎРѓР С•Р С–Р В»Р В°РЎв‚¬Р ВµР Р…Р С‘Р ВµР’В» Р Р…Р Вµ Р СР С•Р В¶Р ВµРЎвЂљ Р В±РЎвЂ№РЎвЂљРЎРЉ Р С—РЎС“РЎРѓРЎвЂљРЎвЂ№Р С.",
      })
    );
  }

  if (!publicOfferText) {
    redirect(
      buildRedirectUrl({
        path: "/admin/rules",
        error: "Р СћР ВµР С”РЎРѓРЎвЂљ Р’В«Р СџРЎС“Р В±Р В»Р С‘РЎвЂЎР Р…Р В°РЎРЏ Р С•РЎвЂћР ВµРЎР‚РЎвЂљР В°Р’В» Р Р…Р Вµ Р СР С•Р В¶Р ВµРЎвЂљ Р В±РЎвЂ№РЎвЂљРЎРЉ Р С—РЎС“РЎРѓРЎвЂљРЎвЂ№Р С.",
      })
    );
  }

  if (!privacyPolicyText) {
    redirect(
      buildRedirectUrl({
        path: "/admin/rules",
        error: "Р СћР ВµР С”РЎРѓРЎвЂљ Р’В«Р СџР С•Р В»Р С‘РЎвЂљР С‘Р С”Р В° Р С”Р С•Р Р…РЎвЂћР С‘Р Т‘Р ВµР Р…РЎвЂ Р С‘Р В°Р В»РЎРЉР Р…Р С•РЎРѓРЎвЂљР С‘Р’В» Р Р…Р Вµ Р СР С•Р В¶Р ВµРЎвЂљ Р В±РЎвЂ№РЎвЂљРЎРЉ Р С—РЎС“РЎРѓРЎвЂљРЎвЂ№Р С.",
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
        error: "Р С›Р Т‘Р С‘Р Р… Р С‘Р В· РЎР‹РЎР‚Р С‘Р Т‘Р С‘РЎвЂЎР ВµРЎРѓР С”Р С‘РЎвЂ¦ Р Т‘Р С•Р С”РЎС“Р СР ВµР Р…РЎвЂљР С•Р Р† РЎРѓР В»Р С‘РЎв‚¬Р С”Р С•Р С Р Т‘Р В»Р С‘Р Р…Р Р…РЎвЂ№Р в„–.",
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
  redirect(buildRedirectUrl({ path: "/admin/rules", notice: "Р В®РЎР‚Р С‘Р Т‘Р С‘РЎвЂЎР ВµРЎРѓР С”Р В°РЎРЏ Р С‘Р Р…РЎвЂћР С•РЎР‚Р СР В°РЎвЂ Р С‘РЎРЏ Р С•Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…Р В°." }));
}

export async function updateUserAgreementAction(formData: FormData) {
  return updateLegalDocumentsAction(formData);
}

