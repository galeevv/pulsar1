import {
  PayoutRequestStatus,
  type Prisma,
  type PayoutRequest,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

import { PayoutDomainError } from "./payout-errors";

const ACTIVE_PAYOUT_STATUSES: PayoutRequestStatus[] = [
  PayoutRequestStatus.PENDING,
  PayoutRequestStatus.APPROVED,
];

type UserScopedPayoutRequest = Pick<
  PayoutRequest,
  | "amountCredits"
  | "amountRub"
  | "createdAt"
  | "id"
  | "payoutDetailsSnapshot"
  | "payoutMethod"
  | "status"
  | "updatedAt"
>;

type PrismaLike = Pick<typeof prisma, "$transaction">;

function normalizeAmount(amountCredits: number) {
  if (!Number.isFinite(amountCredits)) {
    throw new PayoutDomainError("INVALID_AMOUNT", "Payout amount must be a valid number.");
  }

  const rounded = Math.trunc(amountCredits);

  if (rounded <= 0) {
    throw new PayoutDomainError("INVALID_AMOUNT", "Payout amount must be greater than zero.");
  }

  return rounded;
}

function normalizePayoutDetails(rawValue: string) {
  const normalized = rawValue.trim();

  if (normalized.length < 8) {
    throw new PayoutDomainError(
      "INVALID_PAYOUT_DETAILS",
      "Provide payout details with at least 8 characters."
    );
  }

  if (normalized.length > 2000) {
    throw new PayoutDomainError(
      "INVALID_PAYOUT_DETAILS",
      "Payout details are too long."
    );
  }

  return normalized;
}

function getAvailableCredits(credits: number, reservedCredits: number) {
  return Math.max(0, credits - reservedCredits);
}

async function getMinimumPayoutCredits(tx: Prisma.TransactionClient) {
  const settings = await tx.referralProgramSettings.upsert({
    create: {
      defaultDiscountPct: 50,
      defaultRewardCredits: 100,
      id: 1,
      isEnabled: true,
      minimumPayoutCredits: 100,
    },
    update: {},
    where: { id: 1 },
  });

  return settings.minimumPayoutCredits;
}

type CreatePayoutRequestInput = {
  amountCredits: number;
  payoutDetailsSnapshot: string;
  userId: string;
};

export async function createPayoutRequestForUser(
  input: CreatePayoutRequestInput,
  db: PrismaLike = prisma
): Promise<UserScopedPayoutRequest> {
  const amountCredits = normalizeAmount(input.amountCredits);
  const payoutDetailsSnapshot = normalizePayoutDetails(input.payoutDetailsSnapshot);

  return db.$transaction(async (tx) => {
    const [user, approvedPaymentsCount, activePayoutRequestsCount, minimumPayoutCredits] =
      await Promise.all([
        tx.user.findUnique({
          select: {
            credits: true,
            id: true,
            reservedCredits: true,
            role: true,
          },
          where: {
            id: input.userId,
          },
        }),
        tx.paymentRequest.count({
          where: {
            status: "APPROVED",
            userId: input.userId,
          },
        }),
        tx.payoutRequest.count({
          where: {
            status: {
              in: ACTIVE_PAYOUT_STATUSES,
            },
            userId: input.userId,
          },
        }),
        getMinimumPayoutCredits(tx),
      ]);

    if (!user) {
      throw new PayoutDomainError("USER_NOT_FOUND", "User not found.");
    }

    if (user.role !== "USER") {
      throw new PayoutDomainError("FORBIDDEN", "Only users can create payout requests.");
    }

    if (approvedPaymentsCount <= 0) {
      throw new PayoutDomainError(
        "USER_NOT_ELIGIBLE_FOR_PAYOUT",
        "Payout is available after the first approved payment."
      );
    }

    if (amountCredits < minimumPayoutCredits) {
      throw new PayoutDomainError(
        "MINIMUM_PAYOUT_NOT_REACHED",
        "Payout amount is below the configured minimum."
      );
    }

    if (activePayoutRequestsCount > 0) {
      throw new PayoutDomainError(
        "PAYOUT_REQUEST_ALREADY_ACTIVE",
        "User already has an active payout request."
      );
    }

    const availableCredits = getAvailableCredits(user.credits, user.reservedCredits);
    if (amountCredits > availableCredits) {
      throw new PayoutDomainError(
        "INSUFFICIENT_AVAILABLE_CREDITS",
        "Payout amount exceeds available credits."
      );
    }

    const reserveResult = await tx.user.updateMany({
      data: {
        reservedCredits: {
          increment: amountCredits,
        },
      },
      where: {
        credits: user.credits,
        id: user.id,
        reservedCredits: user.reservedCredits,
      },
    });

    if (reserveResult.count !== 1) {
      throw new PayoutDomainError(
        "PAYOUT_STATUS_TRANSITION_FAILED",
        "Could not reserve credits for payout request."
      );
    }

    return tx.payoutRequest.create({
      data: {
        amountCredits,
        amountRub: amountCredits,
        payoutDetailsSnapshot,
        payoutMethod: "bank_card",
        status: PayoutRequestStatus.PENDING,
        userId: user.id,
      },
      select: {
        amountCredits: true,
        amountRub: true,
        createdAt: true,
        id: true,
        payoutDetailsSnapshot: true,
        payoutMethod: true,
        status: true,
        updatedAt: true,
      },
    });
  });
}

type CancelOwnPayoutRequestInput = {
  payoutRequestId: string;
  userId: string;
};

export async function cancelOwnPayoutRequest(
  input: CancelOwnPayoutRequestInput,
  db: PrismaLike = prisma
): Promise<UserScopedPayoutRequest> {
  return db.$transaction(async (tx) => {
    const request = await tx.payoutRequest.findUnique({
      select: {
        amountCredits: true,
        id: true,
        status: true,
        userId: true,
      },
      where: {
        id: input.payoutRequestId,
      },
    });

    if (!request || request.userId !== input.userId) {
      throw new PayoutDomainError("PAYOUT_REQUEST_NOT_FOUND", "Payout request not found.");
    }

    if (request.status !== PayoutRequestStatus.PENDING) {
      throw new PayoutDomainError(
        "PAYOUT_STATUS_TRANSITION_FAILED",
        "Only pending payout requests can be canceled."
      );
    }

    const updateRequestResult = await tx.payoutRequest.updateMany({
      data: {
        status: PayoutRequestStatus.CANCELED,
      },
      where: {
        id: request.id,
        status: PayoutRequestStatus.PENDING,
        userId: input.userId,
      },
    });

    if (updateRequestResult.count !== 1) {
      throw new PayoutDomainError(
        "PAYOUT_STATUS_TRANSITION_FAILED",
        "Failed to cancel payout request."
      );
    }

    const unreserveResult = await tx.user.updateMany({
      data: {
        reservedCredits: {
          decrement: request.amountCredits,
        },
      },
      where: {
        id: input.userId,
        reservedCredits: {
          gte: request.amountCredits,
        },
      },
    });

    if (unreserveResult.count !== 1) {
      throw new PayoutDomainError(
        "PAYOUT_STATUS_TRANSITION_FAILED",
        "Failed to release reserved credits."
      );
    }

    return tx.payoutRequest.findUniqueOrThrow({
      select: {
        amountCredits: true,
        amountRub: true,
        createdAt: true,
        id: true,
        payoutDetailsSnapshot: true,
        payoutMethod: true,
        status: true,
        updatedAt: true,
      },
      where: {
        id: request.id,
      },
    });
  });
}

type AdminPayoutTransitionResult = Pick<
  PayoutRequest,
  | "adminNote"
  | "amountCredits"
  | "amountRub"
  | "createdAt"
  | "id"
  | "paidAt"
  | "payoutDetailsSnapshot"
  | "payoutMethod"
  | "rejectionReason"
  | "reviewedAt"
  | "reviewedByAdminId"
  | "status"
  | "updatedAt"
  | "userId"
>;

type AdminActionBaseInput = {
  adminId: string;
  payoutRequestId: string;
};

type ApproveInput = AdminActionBaseInput & {
  adminNote?: string | null;
};

export async function approvePayoutRequest(
  input: ApproveInput,
  db: PrismaLike = prisma
): Promise<AdminPayoutTransitionResult> {
  return db.$transaction(async (tx) => {
    const now = new Date();
    const updateResult = await tx.payoutRequest.updateMany({
      data: {
        adminNote: input.adminNote?.trim() || null,
        reviewedAt: now,
        reviewedByAdminId: input.adminId,
        status: PayoutRequestStatus.APPROVED,
      },
      where: {
        id: input.payoutRequestId,
        status: PayoutRequestStatus.PENDING,
      },
    });

    if (updateResult.count !== 1) {
      throw new PayoutDomainError(
        "PAYOUT_STATUS_TRANSITION_FAILED",
        "Only pending requests can be approved."
      );
    }

    return tx.payoutRequest.findUniqueOrThrow({
      select: {
        adminNote: true,
        amountCredits: true,
        amountRub: true,
        createdAt: true,
        id: true,
        paidAt: true,
        payoutDetailsSnapshot: true,
        payoutMethod: true,
        rejectionReason: true,
        reviewedAt: true,
        reviewedByAdminId: true,
        status: true,
        updatedAt: true,
        userId: true,
      },
      where: {
        id: input.payoutRequestId,
      },
    });
  });
}

type RejectInput = AdminActionBaseInput & {
  adminNote?: string | null;
  rejectionReason: string;
};

export async function rejectPayoutRequest(
  input: RejectInput,
  db: PrismaLike = prisma
): Promise<AdminPayoutTransitionResult> {
  const rejectionReason = input.rejectionReason.trim();
  if (rejectionReason.length < 3) {
    throw new PayoutDomainError(
      "REJECTION_REASON_REQUIRED",
      "Provide a rejection reason."
    );
  }

  return db.$transaction(async (tx) => {
    const request = await tx.payoutRequest.findUnique({
      select: {
        amountCredits: true,
        id: true,
        status: true,
        userId: true,
      },
      where: {
        id: input.payoutRequestId,
      },
    });

    if (!request) {
      throw new PayoutDomainError("PAYOUT_REQUEST_NOT_FOUND", "Payout request not found.");
    }

    if (
      request.status !== PayoutRequestStatus.PENDING &&
      request.status !== PayoutRequestStatus.APPROVED
    ) {
      throw new PayoutDomainError(
        "PAYOUT_STATUS_TRANSITION_FAILED",
        "Only pending or approved requests can be rejected."
      );
    }

    const now = new Date();
    const updateResult = await tx.payoutRequest.updateMany({
      data: {
        adminNote: input.adminNote?.trim() || null,
        rejectionReason,
        reviewedAt: now,
        reviewedByAdminId: input.adminId,
        status: PayoutRequestStatus.REJECTED,
      },
      where: {
        id: request.id,
        status: {
          in: [PayoutRequestStatus.PENDING, PayoutRequestStatus.APPROVED],
        },
      },
    });

    if (updateResult.count !== 1) {
      throw new PayoutDomainError(
        "PAYOUT_STATUS_TRANSITION_FAILED",
        "Failed to reject payout request."
      );
    }

    const unreserveResult = await tx.user.updateMany({
      data: {
        reservedCredits: {
          decrement: request.amountCredits,
        },
      },
      where: {
        id: request.userId,
        reservedCredits: {
          gte: request.amountCredits,
        },
      },
    });

    if (unreserveResult.count !== 1) {
      throw new PayoutDomainError(
        "PAYOUT_STATUS_TRANSITION_FAILED",
        "Failed to release reserved credits for rejected payout."
      );
    }

    return tx.payoutRequest.findUniqueOrThrow({
      select: {
        adminNote: true,
        amountCredits: true,
        amountRub: true,
        createdAt: true,
        id: true,
        paidAt: true,
        payoutDetailsSnapshot: true,
        payoutMethod: true,
        rejectionReason: true,
        reviewedAt: true,
        reviewedByAdminId: true,
        status: true,
        updatedAt: true,
        userId: true,
      },
      where: {
        id: request.id,
      },
    });
  });
}

type MarkPaidInput = AdminActionBaseInput & {
  adminNote?: string | null;
};

export async function markPayoutRequestPaid(
  input: MarkPaidInput,
  db: PrismaLike = prisma
): Promise<AdminPayoutTransitionResult> {
  return db.$transaction(async (tx) => {
    const request = await tx.payoutRequest.findUnique({
      select: {
        amountCredits: true,
        id: true,
        reviewedAt: true,
        status: true,
        userId: true,
      },
      where: {
        id: input.payoutRequestId,
      },
    });

    if (!request) {
      throw new PayoutDomainError("PAYOUT_REQUEST_NOT_FOUND", "Payout request not found.");
    }

    if (request.status !== PayoutRequestStatus.APPROVED) {
      throw new PayoutDomainError(
        "PAYOUT_STATUS_TRANSITION_FAILED",
        "Only approved requests can be marked as paid."
      );
    }

    const debitResult = await tx.user.updateMany({
      data: {
        credits: {
          decrement: request.amountCredits,
        },
        reservedCredits: {
          decrement: request.amountCredits,
        },
      },
      where: {
        credits: {
          gte: request.amountCredits,
        },
        id: request.userId,
        reservedCredits: {
          gte: request.amountCredits,
        },
      },
    });

    if (debitResult.count !== 1) {
      throw new PayoutDomainError(
        "INSUFFICIENT_AVAILABLE_CREDITS",
        "Could not finalize payout due to insufficient user balance."
      );
    }

    const now = new Date();
    const updateResult = await tx.payoutRequest.updateMany({
      data: {
        adminNote: input.adminNote?.trim() || null,
        paidAt: now,
        reviewedAt: request.reviewedAt ?? now,
        reviewedByAdminId: input.adminId,
        status: PayoutRequestStatus.PAID,
      },
      where: {
        id: request.id,
        status: PayoutRequestStatus.APPROVED,
      },
    });

    if (updateResult.count !== 1) {
      throw new PayoutDomainError(
        "PAYOUT_STATUS_TRANSITION_FAILED",
        "Failed to mark payout request as paid."
      );
    }

    return tx.payoutRequest.findUniqueOrThrow({
      select: {
        adminNote: true,
        amountCredits: true,
        amountRub: true,
        createdAt: true,
        id: true,
        paidAt: true,
        payoutDetailsSnapshot: true,
        payoutMethod: true,
        rejectionReason: true,
        reviewedAt: true,
        reviewedByAdminId: true,
        status: true,
        updatedAt: true,
        userId: true,
      },
      where: {
        id: request.id,
      },
    });
  });
}

export function calculateAvailableCredits(credits: number, reservedCredits: number) {
  return getAvailableCredits(credits, reservedCredits);
}
