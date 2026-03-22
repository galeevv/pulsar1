import { describe, expect, it } from "vitest";

import { buildReferralAnalyticsDerived } from "@/lib/app-benefits";
import { PayoutDomainError } from "@/lib/payouts/payout-errors";
import {
  approvePayoutRequest,
  cancelOwnPayoutRequest,
  createPayoutRequestForUser,
  markPayoutRequestPaid,
  rejectPayoutRequest,
} from "@/lib/payouts/payout-service";

type TestUser = {
  credits: number;
  id: string;
  reservedCredits: number;
  role: "ADMIN" | "USER";
};

type TestPaymentRequest = {
  id: string;
  status: "APPROVED" | "CREATED" | "REJECTED";
  userId: string;
};

type TestPayoutRequest = {
  adminNote: string | null;
  amountCredits: number;
  amountRub: number;
  createdAt: Date;
  id: string;
  paidAt: Date | null;
  payoutDetailsSnapshot: string;
  payoutMethod: string;
  rejectionReason: string | null;
  reviewedAt: Date | null;
  reviewedByAdminId: string | null;
  status: "APPROVED" | "CANCELED" | "PAID" | "PENDING" | "REJECTED";
  updatedAt: Date;
  userId: string;
};

type TestState = {
  paymentRequests: TestPaymentRequest[];
  payoutRequests: TestPayoutRequest[];
  referralProgramSettings: {
    defaultDiscountPct: number;
    defaultRewardCredits: number;
    id: number;
    isEnabled: boolean;
    minimumPayoutCredits: number;
  } | null;
  users: TestUser[];
};

function createTestDb(initialState: TestState) {
  let state = structuredClone(initialState);
  let payoutIdCounter = 1;

  function pickSelected<T extends Record<string, unknown>>(row: T, select?: Record<string, boolean>) {
    if (!select) {
      return row;
    }

    const result: Record<string, unknown> = {};
    for (const [key, enabled] of Object.entries(select)) {
      if (enabled) {
        result[key] = row[key];
      }
    }

    return result as T;
  }

  function matchesPayoutWhere(
    row: TestPayoutRequest,
    where: {
      id?: string;
      status?: string | { in?: string[] };
      userId?: string;
    }
  ) {
    if (where.id && row.id !== where.id) {
      return false;
    }

    if (where.userId && row.userId !== where.userId) {
      return false;
    }

    if (typeof where.status === "string" && row.status !== where.status) {
      return false;
    }

    if (where.status && typeof where.status === "object" && where.status.in) {
      return where.status.in.includes(row.status);
    }

    return true;
  }

  type TestDb = {
    $transaction: <T>(callback: (tx: {
      paymentRequest: {
        count: (args: { where: { status: string; userId: string } }) => Promise<number>;
      };
      payoutRequest: {
        count: (args: { where: { status?: { in?: string[] }; userId?: string } }) => Promise<number>;
        create: (args: {
          data: {
            amountCredits: number;
            amountRub: number;
            payoutDetailsSnapshot: string;
            payoutMethod: string;
            status: string;
            userId: string;
          };
          select: Record<string, boolean>;
        }) => Promise<Record<string, unknown>>;
        findUnique: (args: {
          select?: Record<string, boolean>;
          where: { id: string };
        }) => Promise<Record<string, unknown> | null>;
        findUniqueOrThrow: (args: {
          select?: Record<string, boolean>;
          where: { id: string };
        }) => Promise<Record<string, unknown>>;
        updateMany: (args: {
          data: Record<string, unknown>;
          where: {
            id?: string;
            status?: string | { in?: string[] };
            userId?: string;
          };
        }) => Promise<{ count: number }>;
      };
      referralProgramSettings: {
        upsert: (args: { create: TestState["referralProgramSettings"]; where: { id: number } }) => Promise<{
          defaultDiscountPct: number;
          defaultRewardCredits: number;
          id: number;
          isEnabled: boolean;
          minimumPayoutCredits: number;
        }>;
      };
      user: {
        findUnique: (args: { select: Record<string, boolean>; where: { id: string } }) => Promise<TestUser | null>;
        updateMany: (args: {
          data: {
            credits?: { decrement?: number };
            reservedCredits?: { decrement?: number; increment?: number };
          };
          where: {
            credits?: number | { gte?: number };
            id: string;
            reservedCredits?: number | { gte?: number };
          };
        }) => Promise<{ count: number }>;
      };
    }) => Promise<T>) => Promise<T>;
    __getState: () => TestState;
  };

  const db: TestDb = {
    $transaction: async (callback) => {
      const draft = structuredClone(state);

      const tx = {
        paymentRequest: {
          count: async (args) =>
            draft.paymentRequests.filter(
              (row) => row.userId === args.where.userId && row.status === args.where.status
            ).length,
        },
        payoutRequest: {
          count: async (args) =>
            draft.payoutRequests.filter((row) => {
              if (args.where.userId && row.userId !== args.where.userId) {
                return false;
              }

              if (args.where.status?.in) {
                return args.where.status.in.includes(row.status);
              }

              return true;
            }).length,
          create: async (args) => {
            const now = new Date("2026-03-21T10:00:00.000Z");
            const row: TestPayoutRequest = {
              adminNote: null,
              amountCredits: args.data.amountCredits,
              amountRub: args.data.amountRub,
              createdAt: now,
              id: `payout_${payoutIdCounter++}`,
              paidAt: null,
              payoutDetailsSnapshot: args.data.payoutDetailsSnapshot,
              payoutMethod: args.data.payoutMethod,
              rejectionReason: null,
              reviewedAt: null,
              reviewedByAdminId: null,
              status: args.data.status as TestPayoutRequest["status"],
              updatedAt: now,
              userId: args.data.userId,
            };
            draft.payoutRequests.push(row);
            return pickSelected(row, args.select);
          },
          findUnique: async (args) => {
            const row = draft.payoutRequests.find((item) => item.id === args.where.id) ?? null;
            if (!row) {
              return null;
            }

            return pickSelected(row, args.select);
          },
          findUniqueOrThrow: async (args) => {
            const row = draft.payoutRequests.find((item) => item.id === args.where.id);
            if (!row) {
              throw new Error("Not found");
            }

            return pickSelected(row, args.select);
          },
          updateMany: async (args) => {
            let updated = 0;
            draft.payoutRequests = draft.payoutRequests.map((row) => {
              if (!matchesPayoutWhere(row, args.where)) {
                return row;
              }

              updated += 1;
              const next: TestPayoutRequest = {
                ...row,
                ...args.data,
                status: (args.data.status as TestPayoutRequest["status"]) ?? row.status,
                updatedAt: new Date("2026-03-21T10:30:00.000Z"),
              };
              return next;
            });
            return { count: updated };
          },
        },
        referralProgramSettings: {
          upsert: async (args) => {
            if (!draft.referralProgramSettings) {
              draft.referralProgramSettings = args.create;
            }

            return draft.referralProgramSettings;
          },
        },
        user: {
          findUnique: async (args) =>
            draft.users.find((item) => item.id === args.where.id) ?? null,
          updateMany: async (args) => {
            const user = draft.users.find((item) => item.id === args.where.id);

            if (!user) {
              return { count: 0 };
            }

            if (typeof args.where.credits === "number" && user.credits !== args.where.credits) {
              return { count: 0 };
            }

            if (
              args.where.credits &&
              typeof args.where.credits === "object" &&
              typeof args.where.credits.gte === "number" &&
              user.credits < args.where.credits.gte
            ) {
              return { count: 0 };
            }

            if (
              typeof args.where.reservedCredits === "number" &&
              user.reservedCredits !== args.where.reservedCredits
            ) {
              return { count: 0 };
            }

            if (
              args.where.reservedCredits &&
              typeof args.where.reservedCredits === "object" &&
              typeof args.where.reservedCredits.gte === "number" &&
              user.reservedCredits < args.where.reservedCredits.gte
            ) {
              return { count: 0 };
            }

            if (args.data.credits?.decrement) {
              user.credits -= args.data.credits.decrement;
            }

            if (args.data.reservedCredits?.increment) {
              user.reservedCredits += args.data.reservedCredits.increment;
            }

            if (args.data.reservedCredits?.decrement) {
              user.reservedCredits -= args.data.reservedCredits.decrement;
            }

            return { count: 1 };
          },
        },
      };

      try {
        const result = await callback(tx);
        state = draft;
        return result;
      } catch (error) {
        throw error;
      }
    },
    __getState: () => state,
  };

  return db;
}

function expectDomainError(error: unknown, code: string) {
  expect(error).toBeInstanceOf(PayoutDomainError);
  expect((error as PayoutDomainError).code).toBe(code);
}

async function expectRejectCode(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    throw new Error(`Expected rejection with code ${code}`);
  } catch (error) {
    expectDomainError(error, code);
  }
}

function baseState(): TestState {
  return {
    paymentRequests: [
      {
        id: "payment_1",
        status: "APPROVED",
        userId: "user_1",
      },
    ],
    payoutRequests: [],
    referralProgramSettings: {
      defaultDiscountPct: 50,
      defaultRewardCredits: 100,
      id: 1,
      isEnabled: true,
      minimumPayoutCredits: 100,
    },
    users: [
      {
        credits: 500,
        id: "user_1",
        reservedCredits: 0,
        role: "USER",
      },
      {
        credits: 0,
        id: "admin_1",
        reservedCredits: 0,
        role: "ADMIN",
      },
    ],
  };
}

describe("payout workflow domain", () => {
  it("blocks create payout when amount is below minimum", async () => {
    const db = createTestDb(baseState());

    await expectRejectCode(
      createPayoutRequestForUser(
        {
          amountCredits: 80,
          payoutDetailsSnapshot: "Card 0000 1111 2222 3333",
          userId: "user_1",
        },
        db
      ),
      "MINIMUM_PAYOUT_NOT_REACHED"
    );
  });

  it("blocks create payout when amount exceeds available credits", async () => {
    const state = baseState();
    state.users[0].reservedCredits = 450;
    const db = createTestDb(state);

    await expectRejectCode(
      createPayoutRequestForUser(
        {
          amountCredits: 120,
          payoutDetailsSnapshot: "Card 0000 1111 2222 3333",
          userId: "user_1",
        },
        db
      ),
      "INSUFFICIENT_AVAILABLE_CREDITS"
    );
  });

  it("blocks second active payout request for a user", async () => {
    const state = baseState();
    state.payoutRequests.push({
      adminNote: null,
      amountCredits: 120,
      amountRub: 120,
      createdAt: new Date("2026-03-20T10:00:00.000Z"),
      id: "payout_existing",
      paidAt: null,
      payoutDetailsSnapshot: "Card 0000",
      payoutMethod: "bank_card",
      rejectionReason: null,
      reviewedAt: null,
      reviewedByAdminId: null,
      status: "PENDING",
      updatedAt: new Date("2026-03-20T10:00:00.000Z"),
      userId: "user_1",
    });
    const db = createTestDb(state);

    await expectRejectCode(
      createPayoutRequestForUser(
        {
          amountCredits: 120,
          payoutDetailsSnapshot: "Card 0000 1111 2222 3333",
          userId: "user_1",
        },
        db
      ),
      "PAYOUT_REQUEST_ALREADY_ACTIVE"
    );
  });

  it("reserves credits on create and does not immediately debit credits", async () => {
    const db = createTestDb(baseState());

    const created = await createPayoutRequestForUser(
      {
        amountCredits: 140,
        payoutDetailsSnapshot: "Card 0000 1111 2222 3333",
        userId: "user_1",
      },
      db
    );

    const user = db.__getState().users.find((item) => item.id === "user_1");
    expect(created.status).toBe("PENDING");
    expect(user?.credits).toBe(500);
    expect(user?.reservedCredits).toBe(140);
  });

  it("unreserves credits on reject", async () => {
    const db = createTestDb(baseState());

    const created = await createPayoutRequestForUser(
      {
        amountCredits: 150,
        payoutDetailsSnapshot: "Card 0000 1111 2222 3333",
        userId: "user_1",
      },
      db
    );

    await rejectPayoutRequest(
      {
        adminId: "admin_1",
        payoutRequestId: created.id,
        rejectionReason: "Incorrect payout details.",
      },
      db
    );

    const user = db.__getState().users.find((item) => item.id === "user_1");
    const request = db.__getState().payoutRequests.find((item) => item.id === created.id);
    expect(request?.status).toBe("REJECTED");
    expect(user?.reservedCredits).toBe(0);
    expect(user?.credits).toBe(500);
  });

  it("unreserves credits on user cancel", async () => {
    const db = createTestDb(baseState());

    const created = await createPayoutRequestForUser(
      {
        amountCredits: 120,
        payoutDetailsSnapshot: "Card 0000 1111 2222 3333",
        userId: "user_1",
      },
      db
    );

    await cancelOwnPayoutRequest(
      {
        payoutRequestId: created.id,
        userId: "user_1",
      },
      db
    );

    const user = db.__getState().users.find((item) => item.id === "user_1");
    const request = db.__getState().payoutRequests.find((item) => item.id === created.id);
    expect(request?.status).toBe("CANCELED");
    expect(user?.reservedCredits).toBe(0);
    expect(user?.credits).toBe(500);
  });

  it("debits credits and reserved credits when marked as paid", async () => {
    const db = createTestDb(baseState());

    const created = await createPayoutRequestForUser(
      {
        amountCredits: 200,
        payoutDetailsSnapshot: "Card 0000 1111 2222 3333",
        userId: "user_1",
      },
      db
    );

    await approvePayoutRequest(
      {
        adminId: "admin_1",
        payoutRequestId: created.id,
      },
      db
    );

    await markPayoutRequestPaid(
      {
        adminId: "admin_1",
        payoutRequestId: created.id,
      },
      db
    );

    const user = db.__getState().users.find((item) => item.id === "user_1");
    const request = db.__getState().payoutRequests.find((item) => item.id === created.id);
    expect(request?.status).toBe("PAID");
    expect(user?.credits).toBe(300);
    expect(user?.reservedCredits).toBe(0);
  });

  it("blocks mark as paid for non-approved payout", async () => {
    const db = createTestDb(baseState());

    const created = await createPayoutRequestForUser(
      {
        amountCredits: 130,
        payoutDetailsSnapshot: "Card 0000 1111 2222 3333",
        userId: "user_1",
      },
      db
    );

    await expectRejectCode(
      markPayoutRequestPaid(
        {
          adminId: "admin_1",
          payoutRequestId: created.id,
        },
        db
      ),
      "PAYOUT_STATUS_TRANSITION_FAILED"
    );
  });

  it("blocks repeated actions on terminal statuses", async () => {
    const db = createTestDb(baseState());

    const created = await createPayoutRequestForUser(
      {
        amountCredits: 110,
        payoutDetailsSnapshot: "Card 0000 1111 2222 3333",
        userId: "user_1",
      },
      db
    );

    await rejectPayoutRequest(
      {
        adminId: "admin_1",
        payoutRequestId: created.id,
        rejectionReason: "Reject once",
      },
      db
    );

    await expectRejectCode(
      rejectPayoutRequest(
        {
          adminId: "admin_1",
          payoutRequestId: created.id,
          rejectionReason: "Reject second time",
        },
        db
      ),
      "PAYOUT_STATUS_TRANSITION_FAILED"
    );
  });

  it("computes referral analytics derived values", () => {
    const result = buildReferralAnalyticsDerived({
      confirmedInvitedCount: 3,
      credits: 500,
      reservedCredits: 140,
      totalInvitedCount: 5,
    });

    expect(result.availableCredits).toBe(360);
    expect(result.conversionRatePct).toBe(60);
  });
});
