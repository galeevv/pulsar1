import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const paymentRequests = new Map<
    string,
    {
      approvedAt: Date | null;
      createdAt: Date;
      id: string;
      markedPaidAt: Date | null;
      plategaPayloadJson: string | null;
      plategaStatus: string | null;
      plategaTransactionId: string | null;
      rejectedAt: Date | null;
      status: "APPROVED" | "CREATED" | "REJECTED";
      userId: string;
    }
  >();
  const webhookLogs = new Map<
    string,
    {
      createdAt: Date;
      dedupKey: string;
      errorMessage: string | null;
      headersJson: string | null;
      id: string;
      paymentRequestId: string | null;
      payloadJson: string;
      processedAt: Date | null;
      processingStatus: "ERROR" | "IGNORED" | "PROCESSED" | "RECEIVED";
      statusRaw: string;
      transactionId: string;
      updatedAt: Date;
    }
  >();

  const createSubscriptionFromPaidRequestMock = vi.fn<
    (input: { paymentRequest: { id: string } }) => Promise<{
      createdSubscriptionId: string | null;
      revokedSubscriptionId: string | null;
    }>
  >(async (input) => ({
    createdSubscriptionId: `sub_${input.paymentRequest.id}`,
    revokedSubscriptionId: null,
  }));
  const issueSubscriptionInXuiMock = vi.fn(async () => ({ ok: true as const }));
  const revokeSubscriptionInXuiMock = vi.fn(async () => ({ ok: true as const }));

  const validatePlategaWebhookHeadersMock = vi.fn(() => true);
  const parsePlategaWebhookPayloadMock = vi.fn((payload: unknown) => {
    const cast = payload as { id?: string; status?: string };
    if (!cast?.id || !cast?.status) {
      return null;
    }

    return {
      amount: null,
      currency: null,
      method: null,
      payload: null,
      status: cast.status,
      transactionId: cast.id,
    };
  });

  const plategaWebhookLogApi = {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const row = {
        createdAt: new Date(),
        dedupKey: String(data.dedupKey),
        errorMessage: (data.errorMessage as string | null) ?? null,
        headersJson: (data.headersJson as string | null) ?? null,
        id: `log_${webhookLogs.size + 1}`,
        paymentRequestId: (data.paymentRequestId as string | null) ?? null,
        payloadJson: String(data.payloadJson),
        processedAt: (data.processedAt as Date | null) ?? null,
        processingStatus: (data.processingStatus as "ERROR" | "IGNORED" | "PROCESSED" | "RECEIVED") ?? "RECEIVED",
        statusRaw: String(data.statusRaw),
        transactionId: String(data.transactionId),
        updatedAt: new Date(),
      };
      webhookLogs.set(row.dedupKey, row);
      return row;
    }),
    findUnique: vi.fn(async ({ where }: { where: { dedupKey: string } }) => {
      return webhookLogs.get(where.dedupKey) ?? null;
    }),
    update: vi.fn(async ({ data, where }: { data: Record<string, unknown>; where: { id: string } }) => {
      const row = Array.from(webhookLogs.values()).find((item) => item.id === where.id);

      if (!row) {
        throw new Error("Webhook log not found");
      }

      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    }),
  };

  const paymentRequestApi = {
    findFirst: vi.fn(async ({ where }: { where: { plategaTransactionId?: string } }) => {
      return (
        Array.from(paymentRequests.values()).find(
          (item) =>
            where?.plategaTransactionId &&
            item.plategaTransactionId === where.plategaTransactionId
        ) ?? null
      );
    }),
    update: vi.fn(async ({ data, where }: { data: Record<string, unknown>; where: { id: string } }) => {
      const row = paymentRequests.get(where.id);
      if (!row) {
        throw new Error("Payment request not found");
      }

      Object.assign(row, data);
      paymentRequests.set(row.id, row);
      return row;
    }),
  };

  const prismaMock = {
    $transaction: vi.fn(async (callback: (tx: { paymentRequest: typeof paymentRequestApi }) => Promise<unknown>) =>
      callback({ paymentRequest: paymentRequestApi })
    ),
    paymentRequest: paymentRequestApi,
    plategaWebhookLog: plategaWebhookLogApi,
  };

  return {
    createSubscriptionFromPaidRequestMock,
    issueSubscriptionInXuiMock,
    parsePlategaWebhookPayloadMock,
    paymentRequests,
    prismaMock,
    revokeSubscriptionInXuiMock,
    validatePlategaWebhookHeadersMock,
    webhookLogs,
  };
});

vi.mock("@/lib/payment-subscription-issuance", () => ({
  createSubscriptionFromPaidRequest: hoisted.createSubscriptionFromPaidRequestMock,
}));

vi.mock("@/lib/xui-integration", () => ({
  issueSubscriptionInXui: hoisted.issueSubscriptionInXuiMock,
  revokeSubscriptionInXui: hoisted.revokeSubscriptionInXuiMock,
}));

vi.mock("@/server/services/platega/client", () => ({
  parsePlategaWebhookPayload: hoisted.parsePlategaWebhookPayloadMock,
  validatePlategaWebhookHeaders: hoisted.validatePlategaWebhookHeadersMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: hoisted.prismaMock,
}));

import { POST } from "@/app/api/payments/platega/webhook/route";

function buildWebhookRequest(body: Record<string, unknown>) {
  return new Request("https://example.com/api/payments/platega/webhook", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "X-MerchantId": "merchant-test",
      "X-Secret": "secret-test",
    },
    method: "POST",
  });
}

function seedPaymentRequest(input: {
  id: string;
  transactionId: string;
  status?: "APPROVED" | "CREATED" | "REJECTED";
}) {
  hoisted.paymentRequests.set(input.id, {
    approvedAt: null,
    createdAt: new Date("2026-03-12T10:00:00.000Z"),
    id: input.id,
    markedPaidAt: null,
    plategaPayloadJson: null,
    plategaStatus: null,
    plategaTransactionId: input.transactionId,
    rejectedAt: null,
    status: input.status ?? "CREATED",
    userId: "user_1",
  });
}

describe("Platega webhook idempotency", () => {
  beforeEach(() => {
    hoisted.paymentRequests.clear();
    hoisted.webhookLogs.clear();

    hoisted.createSubscriptionFromPaidRequestMock.mockClear();
    hoisted.issueSubscriptionInXuiMock.mockClear();
    hoisted.revokeSubscriptionInXuiMock.mockClear();
    hoisted.validatePlategaWebhookHeadersMock.mockClear();
    hoisted.parsePlategaWebhookPayloadMock.mockClear();
    hoisted.prismaMock.$transaction.mockClear();
  });

  it("deduplicates identical webhook events by dedup key", async () => {
    seedPaymentRequest({
      id: "payment_1",
      transactionId: "txn_1",
    });

    const firstResponse = await POST(
      buildWebhookRequest({
        id: "txn_1",
        status: "CONFIRMED",
      })
    );

    expect(firstResponse.status).toBe(200);
    expect(hoisted.createSubscriptionFromPaidRequestMock).toHaveBeenCalledTimes(1);
    expect(hoisted.issueSubscriptionInXuiMock).toHaveBeenCalledTimes(1);
    expect(hoisted.webhookLogs.size).toBe(1);

    const secondResponse = await POST(
      buildWebhookRequest({
        id: "txn_1",
        status: "CONFIRMED",
      })
    );

    const secondBody = (await secondResponse.json()) as { dedup?: boolean; ok?: boolean };

    expect(secondResponse.status).toBe(200);
    expect(secondBody.dedup).toBe(true);
    expect(hoisted.createSubscriptionFromPaidRequestMock).toHaveBeenCalledTimes(1);
    expect(hoisted.issueSubscriptionInXuiMock).toHaveBeenCalledTimes(1);
    expect(hoisted.webhookLogs.size).toBe(1);
  });

  it("keeps one activation per payment even for non-identical repeated CONFIRMED webhook", async () => {
    seedPaymentRequest({
      id: "payment_2",
      transactionId: "txn_2",
    });

    const firstResponse = await POST(
      buildWebhookRequest({
        id: "txn_2",
        payload: "first",
        status: "CONFIRMED",
      })
    );

    expect(firstResponse.status).toBe(200);
    expect(hoisted.createSubscriptionFromPaidRequestMock).toHaveBeenCalledTimes(1);
    expect(hoisted.issueSubscriptionInXuiMock).toHaveBeenCalledTimes(1);

    const secondResponse = await POST(
      buildWebhookRequest({
        id: "txn_2",
        payload: "second",
        status: "CONFIRMED",
      })
    );

    expect(secondResponse.status).toBe(200);
    expect(hoisted.createSubscriptionFromPaidRequestMock).toHaveBeenCalledTimes(1);
    expect(hoisted.issueSubscriptionInXuiMock).toHaveBeenCalledTimes(1);
    expect(hoisted.webhookLogs.size).toBe(2);

    const payment = hoisted.paymentRequests.get("payment_2");
    expect(payment?.status).toBe("APPROVED");
  });
});
