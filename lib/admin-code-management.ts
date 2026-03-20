import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { getLegalDocuments } from "@/lib/legal-documents";
import { getAdminSubscriptionConstructorData } from "@/lib/subscription-constructor";
import { getServiceCapacitySettings } from "@/lib/service-capacity";

import { ensureBootstrapData, normalizeCode } from "./auth";

function buildCode(prefix: string) {
  return `${prefix}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function generateInviteCodeValue() {
  return buildCode("INV");
}

export function generateReferralCodeValue() {
  return buildCode("REF");
}

export function generatePromoCodeValue() {
  return buildCode("PROMO");
}

export async function isCodeTakenAcrossSystem(code: string) {
  const normalizedCode = normalizeCode(code);

  const [inviteCode, referralCode, promoCode] = await Promise.all([
    prisma.inviteCode.findUnique({ where: { code: normalizedCode }, select: { id: true } }),
    prisma.referralCode.findUnique({ where: { code: normalizedCode }, select: { id: true } }),
    prisma.promoCode.findUnique({ where: { code: normalizedCode }, select: { id: true } }),
  ]);

  return Boolean(inviteCode || referralCode || promoCode);
}

export async function getAdminDashboardData() {
  await ensureBootstrapData();

  const constructorData = await getAdminSubscriptionConstructorData();
  const legalDocumentsPromise = getLegalDocuments();
  const serviceCapacitySettingsPromise = getServiceCapacitySettings();

  const [
    users,
    inviteCodes,
    referralCodes,
    referralCodeGrantedRewardCounts,
    promoCodes,
    referralProgramSettings,
    paymentRequests,
    activeSubscriptions,
    expiredSubscriptions,
    revokedSubscriptions,
    freeDeviceSlots,
    activeDeviceSlots,
    blockedDeviceSlots,
    recentSubscriptions,
    legalDocuments,
    serviceCapacitySettings,
  ] =
    await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          credits: true,
          role: true,
          username: true,
        },
        take: 8,
      }),
      prisma.inviteCode.findMany({
        include: {
          usedBy: {
            select: { username: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.referralCode.findMany({
        include: {
          _count: {
            select: { uses: true },
          },
          ownerUser: {
            select: { username: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.referralCodeUse.groupBy({
        _count: {
          _all: true,
        },
        by: ["referralCodeId"],
        where: {
          rewardGrantedAt: {
            not: null,
          },
        },
      }),
      prisma.promoCode.findMany({
        include: {
          _count: {
            select: { redemptions: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
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
      prisma.paymentRequest.findMany({
        include: {
          user: {
            select: { username: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.subscription.count({
        where: { status: "ACTIVE" },
      }),
      prisma.subscription.count({
        where: { status: "EXPIRED" },
      }),
      prisma.subscription.count({
        where: { status: "REVOKED" },
      }),
      prisma.deviceSlot.count({
        where: { status: "FREE" },
      }),
      prisma.deviceSlot.count({
        where: { status: "ACTIVE" },
      }),
      prisma.deviceSlot.count({
        where: { status: "BLOCKED" },
      }),
      prisma.subscription.findMany({
        include: {
          user: {
            select: { username: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      legalDocumentsPromise,
      serviceCapacitySettingsPromise,
    ]);

  const grantedRewardsByReferralCodeId = new Map<string, number>();
  for (const item of referralCodeGrantedRewardCounts) {
    grantedRewardsByReferralCodeId.set(item.referralCodeId, item._count._all);
  }

  const referralCodesWithRewards = referralCodes.map((item) => ({
    ...item,
    grantedRewardsCount: grantedRewardsByReferralCodeId.get(item.id) ?? 0,
  }));

  return {
    deviceSlotStats: {
      active: activeDeviceSlots,
      blocked: blockedDeviceSlots,
      free: freeDeviceSlots,
    },
    inviteCodes,
    paymentRequests,
    promoCodes,
    recentSubscriptions,
    referralProgramSettings,
    serviceCapacitySettings,
    legalDocuments,
    userAgreementText: legalDocuments.userAgreementText,
    referralCodes: referralCodesWithRewards,
    subscriptionDurationRules: constructorData.durationRules,
    subscriptionPricingSettings: constructorData.pricingSettings,
    subscriptionStats: {
      active: activeSubscriptions,
      expired: expiredSubscriptions,
      revoked: revokedSubscriptions,
    },
    users,
  };
}
