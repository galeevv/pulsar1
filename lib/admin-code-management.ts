import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

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

  const [
    users,
    inviteCodes,
    referralCodes,
    promoCodes,
    referralProgramSettings,
    tariffs,
    paymentRequests,
    activeSubscriptions,
    expiredSubscriptions,
    revokedSubscriptions,
    freeDeviceSlots,
    activeDeviceSlots,
    blockedDeviceSlots,
    recentSubscriptions,
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
        take: 12,
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
        take: 12,
      }),
      prisma.promoCode.findMany({
        include: {
          _count: {
            select: { redemptions: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
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
      prisma.tariff.findMany({
        orderBy: [{ isEnabled: "desc" }, { createdAt: "desc" }],
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
    ]);

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
    referralCodes,
    subscriptionStats: {
      active: activeSubscriptions,
      expired: expiredSubscriptions,
      revoked: revokedSubscriptions,
    },
    tariffs,
    users,
  };
}
