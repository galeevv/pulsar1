import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { createSubscriptionFromPaidRequest } from "@/lib/payment-subscription-issuance";
import { prisma } from "@/lib/prisma";
import { issueSubscriptionInXui, revokeSubscriptionInXui } from "@/lib/xui-integration";
import {
  parsePlategaWebhookPayload,
  validatePlategaWebhookHeaders,
} from "@/server/services/platega/client";

const REJECTED_PAYMENT_STATUSES = new Set([
  "CANCELED",
  "CANCELLED",
  "ERROR",
  "FAILED",
  "CHARGEBACK",
  "CHARGEBACKED",
]);

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function buildDedupKey(input: {
  payloadRaw: string;
  status: string;
  transactionId: string;
}) {
  const hash = createHash("sha256");
  hash.update(input.transactionId);
  hash.update("|");
  hash.update(input.status);
  hash.update("|");
  hash.update(input.payloadRaw);
  return hash.digest("hex");
}

function buildWebhookHeadersSnapshot(headers: Headers) {
  return {
    merchantId: headers.get("x-merchantid") ?? headers.get("X-MerchantId"),
    userAgent: headers.get("user-agent"),
    xForwardedFor: headers.get("x-forwarded-for"),
  };
}

type TxOutcome =
  | {
      createdSubscriptionId: null;
      kind: "ALREADY_APPROVED" | "ALREADY_REJECTED" | "NOT_FOUND" | "PENDING";
      paymentRequestId: string | null;
      revokedSubscriptionId: null;
    }
  | {
      createdSubscriptionId: null;
      kind: "CAPACITY_LIMIT" | "REJECTED";
      paymentRequestId: string;
      revokedSubscriptionId: null;
    }
  | {
      createdSubscriptionId: string | null;
      kind: "APPROVED";
      paymentRequestId: string;
      revokedSubscriptionId: string | null;
    };

function mapOutcomeToLogStatus(kind: TxOutcome["kind"]) {
  if (kind === "APPROVED" || kind === "REJECTED" || kind === "CAPACITY_LIMIT") {
    return "PROCESSED" as const;
  }

  return "IGNORED" as const;
}

export async function POST(request: Request) {
  let isWebhookAuthorized = false;
  try {
    isWebhookAuthorized = validatePlategaWebhookHeaders(request.headers);
  } catch {
    return NextResponse.json({ error: "Platega не сконфигурирован." }, { status: 500 });
  }

  if (!isWebhookAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsedPayload = parsePlategaWebhookPayload(payload);
  if (!parsedPayload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const now = new Date();
  const normalizedStatus = parsedPayload.status.toUpperCase();
  const webhookPayloadJson = truncate(rawBody || JSON.stringify(payload), 8000);
  const webhookHeadersJson = truncate(
    JSON.stringify(buildWebhookHeadersSnapshot(request.headers)),
    2000
  );
  const dedupKey = buildDedupKey({
    payloadRaw: rawBody,
    status: normalizedStatus,
    transactionId: parsedPayload.transactionId,
  });

  const existingLog = await prisma.plategaWebhookLog.findUnique({
    where: { dedupKey },
  });

  if (existingLog && existingLog.processingStatus !== "ERROR") {
    return NextResponse.json({ dedup: true, ok: true });
  }

  const webhookLog = existingLog
    ? await prisma.plategaWebhookLog.update({
        data: {
          errorMessage: null,
          headersJson: webhookHeadersJson,
          payloadJson: webhookPayloadJson,
          processedAt: null,
          processingStatus: "RECEIVED",
          statusRaw: normalizedStatus,
          transactionId: parsedPayload.transactionId,
        },
        where: { id: existingLog.id },
      })
    : await prisma.plategaWebhookLog.create({
        data: {
          dedupKey,
          headersJson: webhookHeadersJson,
          payloadJson: webhookPayloadJson,
          processingStatus: "RECEIVED",
          statusRaw: normalizedStatus,
          transactionId: parsedPayload.transactionId,
        },
      });

  try {
    const txResult = await prisma.$transaction(async (tx): Promise<TxOutcome> => {
      const paymentRequest = await tx.paymentRequest.findFirst({
        where: {
          plategaTransactionId: parsedPayload.transactionId,
        },
      });

      if (!paymentRequest) {
        return {
          createdSubscriptionId: null,
          kind: "NOT_FOUND",
          paymentRequestId: null,
          revokedSubscriptionId: null,
        };
      }

      await tx.paymentRequest.update({
        data: {
          plategaPayloadJson: webhookPayloadJson,
          plategaStatus: normalizedStatus,
        },
        where: {
          id: paymentRequest.id,
        },
      });

      if (REJECTED_PAYMENT_STATUSES.has(normalizedStatus)) {
        if (paymentRequest.status === "CREATED") {
          await tx.paymentRequest.update({
            data: {
              rejectedAt: now,
              status: "REJECTED",
            },
            where: {
              id: paymentRequest.id,
            },
          });
        }

        return {
          createdSubscriptionId: null,
          kind: "REJECTED",
          paymentRequestId: paymentRequest.id,
          revokedSubscriptionId: null,
        };
      }

      if (normalizedStatus !== "CONFIRMED") {
        return {
          createdSubscriptionId: null,
          kind: "PENDING",
          paymentRequestId: paymentRequest.id,
          revokedSubscriptionId: null,
        };
      }

      if (paymentRequest.status === "APPROVED") {
        return {
          createdSubscriptionId: null,
          kind: "ALREADY_APPROVED",
          paymentRequestId: paymentRequest.id,
          revokedSubscriptionId: null,
        };
      }

      if (paymentRequest.status === "REJECTED") {
        return {
          createdSubscriptionId: null,
          kind: "ALREADY_REJECTED",
          paymentRequestId: paymentRequest.id,
          revokedSubscriptionId: null,
        };
      }

      try {
        const creationResult = await createSubscriptionFromPaidRequest({
          now,
          paymentRequest,
          tx,
          userId: paymentRequest.userId,
        });

        await tx.paymentRequest.update({
          data: {
            approvedAt: now,
            markedPaidAt: now,
            plategaConfirmedAt: now,
            status: "APPROVED",
          },
          where: {
            id: paymentRequest.id,
          },
        });

        return {
          createdSubscriptionId: creationResult.createdSubscriptionId,
          kind: "APPROVED",
          paymentRequestId: paymentRequest.id,
          revokedSubscriptionId: creationResult.revokedSubscriptionId,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "";

        if (message === "ACTIVE_SUBSCRIPTIONS_LIMIT_REACHED") {
          await tx.paymentRequest.update({
            data: {
              plategaStatus: "CONFIRMED_LIMIT_REACHED",
              rejectedAt: now,
              status: "REJECTED",
            },
            where: {
              id: paymentRequest.id,
            },
          });

          return {
            createdSubscriptionId: null,
            kind: "CAPACITY_LIMIT",
            paymentRequestId: paymentRequest.id,
            revokedSubscriptionId: null,
          };
        }

        throw error;
      }
    });

    if (txResult.kind === "APPROVED") {
      if (txResult.revokedSubscriptionId) {
        await revokeSubscriptionInXui(txResult.revokedSubscriptionId);
      }

      if (txResult.createdSubscriptionId) {
        await issueSubscriptionInXui(txResult.createdSubscriptionId);
      }
    }

    await prisma.plategaWebhookLog.update({
      data: {
        paymentRequestId: txResult.paymentRequestId,
        processedAt: now,
        processingStatus: mapOutcomeToLogStatus(txResult.kind),
      },
      where: { id: webhookLog.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await prisma.plategaWebhookLog.update({
      data: {
        errorMessage: truncate(error instanceof Error ? error.message : "Unknown error", 2000),
        processedAt: now,
        processingStatus: "ERROR",
      },
      where: { id: webhookLog.id },
    });

    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
