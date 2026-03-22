import { describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  createSubscriptionFromPaidRequestMock: vi.fn(async () => ({
    createdSubscriptionId: "sub_new",
    revokedSubscriptionId: null,
  })),
}));

vi.mock("@/lib/payment-subscription-issuance", () => ({
  createSubscriptionFromPaidRequest: hoisted.createSubscriptionFromPaidRequestMock,
}));

import { handleApprovedPaymentPostProcessing } from "@/lib/payment-post-approval-handler";

function createTxMocks(input: {
  approvedPaymentsBeforeCurrent: number;
  rewardAlreadyGranted?: boolean;
}) {
  const userUpdateMock = vi.fn(async () => ({}));
  const updateManyMock = vi.fn(async () => ({
    count: input.rewardAlreadyGranted ? 0 : 1,
  }));

  const tx = {
    paymentRequest: {
      count: vi.fn(async () => input.approvedPaymentsBeforeCurrent),
    },
    referralCodeUse: {
      findUnique: vi.fn(async () => ({
        id: "use_1",
        referralCode: {
          ownerUserId: "owner_1",
        },
        rewardCreditsSnapshot: 100,
        rewardGrantedAt: input.rewardAlreadyGranted ? new Date("2026-03-20T10:00:00.000Z") : null,
      })),
      updateMany: updateManyMock,
    },
    subscription: {
      findUnique: vi.fn(async () => null),
    },
    user: {
      update: userUpdateMock,
    },
  };

  return {
    tx,
    updateManyMock,
    userUpdateMock,
  };
}

describe("referral reward post-approval regression", () => {
  it("grants referral reward exactly once for first approved payment", async () => {
    const { tx, userUpdateMock } = createTxMocks({
      approvedPaymentsBeforeCurrent: 0,
      rewardAlreadyGranted: false,
    });

    const result = await handleApprovedPaymentPostProcessing({
      now: new Date("2026-03-21T12:00:00.000Z"),
      paymentRequest: {
        amountRub: 1000,
        baseDeviceMonthlyPriceSnapshot: 1000,
        currency: "RUB",
        deviceLimit: 1,
        devices: 1,
        durationDiscountPercentSnapshot: 0,
        extraDeviceMonthlyPriceSnapshot: 0,
        id: "payment_1",
        method: "PLATEGA",
        monthlyPriceSnapshot: 1000,
        months: 1,
        periodMonths: 1,
        referralDiscountPercentSnapshot: 0,
        status: "APPROVED",
        tariffName: "Constructor",
        totalPriceBeforeDiscountRubSnapshot: 1000,
        userId: "referred_user_1",
      },
      tx: tx as never,
    });

    expect(result.referralRewardGranted).toBe(true);
    expect(userUpdateMock).toHaveBeenCalledTimes(1);
    expect(userUpdateMock.mock.calls[0]?.[0]).toMatchObject({
      data: {
        credits: {
          increment: 100,
        },
      },
      where: {
        id: "owner_1",
      },
    });
  });

  it("does not grant reward when user already had approved payments", async () => {
    const { tx, userUpdateMock } = createTxMocks({
      approvedPaymentsBeforeCurrent: 1,
      rewardAlreadyGranted: false,
    });

    const result = await handleApprovedPaymentPostProcessing({
      now: new Date("2026-03-21T12:00:00.000Z"),
      paymentRequest: {
        amountRub: 1000,
        baseDeviceMonthlyPriceSnapshot: 1000,
        currency: "RUB",
        deviceLimit: 1,
        devices: 1,
        durationDiscountPercentSnapshot: 0,
        extraDeviceMonthlyPriceSnapshot: 0,
        id: "payment_2",
        method: "PLATEGA",
        monthlyPriceSnapshot: 1000,
        months: 1,
        periodMonths: 1,
        referralDiscountPercentSnapshot: 0,
        status: "APPROVED",
        tariffName: "Constructor",
        totalPriceBeforeDiscountRubSnapshot: 1000,
        userId: "referred_user_1",
      },
      tx: tx as never,
    });

    expect(result.referralRewardGranted).toBe(false);
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});
