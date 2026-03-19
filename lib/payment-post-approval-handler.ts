import type { Prisma } from "@/generated/prisma";
import {
  createSubscriptionFromPaidRequest,
  type PaidPaymentRequestSnapshot,
} from "@/lib/payment-subscription-issuance";

type ApprovedPaymentSnapshot = PaidPaymentRequestSnapshot & {
  id: string;
  userId: string;
};

export type PostApprovalResult = {
  createdSubscriptionId: string | null;
  referralRewardGranted: boolean;
  revokedSubscriptionId: string | null;
};

export async function handleApprovedPaymentPostProcessing(input: {
  now: Date;
  paymentRequest: ApprovedPaymentSnapshot;
  tx: Prisma.TransactionClient;
}): Promise<PostApprovalResult> {
  let createdSubscriptionId: string | null = null;
  let revokedSubscriptionId: string | null = null;
  let referralRewardGranted = false;

  const existingSubscription = await input.tx.subscription.findUnique({
    select: { id: true },
    where: {
      paymentRequestId: input.paymentRequest.id,
    },
  });

  if (!existingSubscription) {
    const created = await createSubscriptionFromPaidRequest({
      now: input.now,
      paymentRequest: input.paymentRequest,
      tx: input.tx,
      userId: input.paymentRequest.userId,
    });
    createdSubscriptionId = created.createdSubscriptionId;
    revokedSubscriptionId = created.revokedSubscriptionId;
  }

  const referredUse = await input.tx.referralCodeUse.findUnique({
    include: {
      referralCode: {
        select: {
          ownerUserId: true,
        },
      },
    },
    where: {
      referredUserId: input.paymentRequest.userId,
    },
  });

  if (
    !referredUse ||
    referredUse.rewardGrantedAt ||
    !referredUse.referralCode.ownerUserId
  ) {
    return {
      createdSubscriptionId,
      referralRewardGranted,
      revokedSubscriptionId,
    };
  }

  const approvedPaymentsBeforeCurrent = await input.tx.paymentRequest.count({
    where: {
      id: {
        not: input.paymentRequest.id,
      },
      status: "APPROVED",
      userId: input.paymentRequest.userId,
    },
  });

  if (approvedPaymentsBeforeCurrent !== 0) {
    return {
      createdSubscriptionId,
      referralRewardGranted,
      revokedSubscriptionId,
    };
  }

  const claimReward = await input.tx.referralCodeUse.updateMany({
    data: {
      rewardGrantedAt: input.now,
    },
    where: {
      id: referredUse.id,
      rewardGrantedAt: null,
    },
  });

  if (claimReward.count !== 1) {
    return {
      createdSubscriptionId,
      referralRewardGranted,
      revokedSubscriptionId,
    };
  }

  await input.tx.user.update({
    data: {
      credits: {
        increment: referredUse.rewardCreditsSnapshot,
      },
    },
    where: {
      id: referredUse.referralCode.ownerUserId,
    },
  });

  referralRewardGranted = true;

  return {
    createdSubscriptionId,
    referralRewardGranted,
    revokedSubscriptionId,
  };
}

export async function handleRejectedPaymentPostProcessing(input: {
  now: Date;
  paymentRequestId: string;
  tx: Prisma.TransactionClient;
}) {
  const activeSubscription = await input.tx.subscription.findFirst({
    select: {
      id: true,
    },
    where: {
      paymentRequestId: input.paymentRequestId,
      status: "ACTIVE",
    },
  });

  if (!activeSubscription) {
    return {
      revokedSubscriptionId: null,
    };
  }

  await input.tx.subscription.update({
    data: {
      marzbanUsername: null,
      revokedAt: input.now,
      status: "REVOKED",
    },
    where: {
      id: activeSubscription.id,
    },
  });

  await input.tx.deviceSlot.updateMany({
    data: {
      status: "BLOCKED",
    },
    where: {
      subscriptionId: activeSubscription.id,
    },
  });

  return {
    revokedSubscriptionId: activeSubscription.id,
  };
}
