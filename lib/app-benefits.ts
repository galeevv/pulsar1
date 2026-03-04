import { prisma } from "@/lib/prisma";

import { ensureBootstrapData, normalizeCode } from "./auth";

function isExpired(expiresAt: Date | null) {
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

export async function getAppBenefitsData(username: string) {
  await ensureBootstrapData();

  const user = await prisma.user.findUnique({
    include: {
      promoCodeRedemptions: {
        include: {
          promoCode: {
            select: {
              code: true,
              creditAmount: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    where: { username },
  });

  if (!user) {
    return null;
  }

  const [referralProgramSettings, ownReferralCode, approvedPaymentsCount] = await Promise.all([
    prisma.referralProgramSettings.upsert({
      create: {
        defaultDiscountPct: 50,
        defaultRewardCredits: 100,
        id: 1,
        isEnabled: true,
      },
      update: {},
      where: { id: 1 },
    }),
    prisma.referralCode.findFirst({
      include: {
        _count: {
          select: { uses: true },
        },
      },
      where: { ownerUserId: user.id },
    }),
    prisma.paymentRequest.count({
      where: {
        status: "APPROVED",
        userId: user.id,
      },
    }),
  ]);

  const hasApprovedPayment = approvedPaymentsCount > 0;
  const canGenerateReferralCode =
    referralProgramSettings.isEnabled && hasApprovedPayment && !ownReferralCode;

  return {
    canGenerateReferralCode,
    hasApprovedPayment,
    ownReferralCode,
    promoCodeRedemptions: user.promoCodeRedemptions,
    referralProgramSettings,
    user: {
      credits: user.credits,
      id: user.id,
      username: user.username,
    },
  };
}

export async function validatePromoCodeForUser(userId: string, rawCode: string) {
  const code = normalizeCode(rawCode);

  if (!code) {
    return { message: "Введите промокод.", ok: false as const };
  }

  const promoCode = await prisma.promoCode.findUnique({
    include: {
      _count: {
        select: { redemptions: true },
      },
    },
    where: { code },
  });

  if (!promoCode) {
    return { message: "Промокод не найден.", ok: false as const };
  }

  if (!promoCode.isEnabled) {
    return { message: "Промокод выключен.", ok: false as const };
  }

  if (isExpired(promoCode.expiresAt)) {
    return { message: "Срок действия промокода истек.", ok: false as const };
  }

  if (promoCode._count.redemptions >= promoCode.maxRedemptions) {
    return { message: "Лимит применений промокода исчерпан.", ok: false as const };
  }

  const alreadyRedeemed = await prisma.promoCodeRedemption.findUnique({
    where: {
      promoCodeId_userId: {
        promoCodeId: promoCode.id,
        userId,
      },
    },
  });

  if (alreadyRedeemed) {
    return { message: "Промокод уже использован.", ok: false as const };
  }

  return {
    ok: true as const,
    promoCode,
  };
}
