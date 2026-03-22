import { prisma } from "@/lib/prisma";

import { ensureBootstrapData, normalizeCode } from "./auth";

function isExpired(expiresAt: Date | null) {
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

export function buildReferralAnalyticsDerived(input: {
  confirmedInvitedCount: number;
  credits: number;
  reservedCredits: number;
  totalInvitedCount: number;
}) {
  const availableCredits = Math.max(0, input.credits - input.reservedCredits);
  const conversionRatePct =
    input.totalInvitedCount > 0
      ? Math.round((input.confirmedInvitedCount / input.totalInvitedCount) * 100)
      : 0;

  return {
    availableCredits,
    conversionRatePct,
  };
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
      referralCodeUse: {
        select: {
          discountPctSnapshot: true,
        },
      },
    },
    where: { username },
  });

  if (!user) {
    return null;
  }

  const [
    referralProgramSettings,
    ownReferralCode,
    approvedPaymentsCount,
    totalInvitedCount,
    confirmedInvitedCount,
    rewardedInvitesAggregate,
    totalPaidOutAggregate,
    activePayoutRequest,
    recentPayoutRequests,
    recentReferralActivity,
  ] = await Promise.all([
    prisma.referralProgramSettings.upsert({
      create: {
        defaultDiscountPct: 50,
        defaultRewardCredits: 100,
        id: 1,
        isEnabled: true,
        minimumPayoutCredits: 100,
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
    prisma.referralCodeUse.count({
      where: {
        referralCode: {
          ownerUserId: user.id,
        },
      },
    }),
    prisma.referralCodeUse.count({
      where: {
        referralCode: {
          ownerUserId: user.id,
        },
        referredUser: {
          paymentRequests: {
            some: {
              status: "APPROVED",
            },
          },
        },
      },
    }),
    prisma.referralCodeUse.aggregate({
      _sum: {
        rewardCreditsSnapshot: true,
      },
      where: {
        referralCode: {
          ownerUserId: user.id,
        },
        rewardGrantedAt: {
          not: null,
        },
      },
    }),
    prisma.payoutRequest.aggregate({
      _sum: {
        amountCredits: true,
      },
      where: {
        status: "PAID",
        userId: user.id,
      },
    }),
    prisma.payoutRequest.findFirst({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        amountCredits: true,
        amountRub: true,
        createdAt: true,
        id: true,
        status: true,
      },
      where: {
        status: {
          in: ["PENDING", "APPROVED"],
        },
        userId: user.id,
      },
    }),
    prisma.payoutRequest.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        amountCredits: true,
        amountRub: true,
        createdAt: true,
        id: true,
        rejectionReason: true,
        status: true,
      },
      take: 8,
      where: {
        userId: user.id,
      },
    }),
    prisma.referralCodeUse.findMany({
      include: {
        referredUser: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      where: {
        referralCode: {
          ownerUserId: user.id,
        },
      },
    }),
  ]);

  const hasApprovedPayment = approvedPaymentsCount > 0;
  const canGenerateReferralCode =
    referralProgramSettings.isEnabled && hasApprovedPayment && !ownReferralCode;
  const firstPurchaseDiscountPct =
    !hasApprovedPayment && user.referralCodeUse
      ? Math.max(0, Math.min(100, user.referralCodeUse.discountPctSnapshot))
      : 0;
  const reservedCredits = user.reservedCredits;
  const { availableCredits, conversionRatePct } = buildReferralAnalyticsDerived({
    confirmedInvitedCount,
    credits: user.credits,
    reservedCredits,
    totalInvitedCount,
  });
  const totalEarnedCredits = rewardedInvitesAggregate._sum.rewardCreditsSnapshot ?? 0;
  const totalPaidOutCredits = totalPaidOutAggregate._sum.amountCredits ?? 0;

  return {
    canGenerateReferralCode,
    firstPurchaseDiscountPct,
    hasApprovedPayment,
    ownReferralCode,
    payout: {
      activeRequest: activePayoutRequest,
      availableCredits,
      minimumPayoutCredits: referralProgramSettings.minimumPayoutCredits,
      recentRequests: recentPayoutRequests,
      reservedCredits,
      totalPaidOutCredits,
    },
    promoCodeRedemptions: user.promoCodeRedemptions,
    recentReferralActivity: recentReferralActivity.map((item) => ({
      createdAt: item.createdAt,
      discountPctSnapshot: item.discountPctSnapshot,
      id: item.id,
      referredUsername: item.referredUser.username,
      rewardCreditsSnapshot: item.rewardCreditsSnapshot,
      rewardGrantedAt: item.rewardGrantedAt,
    })),
    referralProgramSettings,
    referralStats: {
      confirmedInvitedCount,
      conversionRatePct,
      totalEarnedCredits,
      totalInvitedCount,
    },
    user: {
      credits: user.credits,
      id: user.id,
      reservedCredits,
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

