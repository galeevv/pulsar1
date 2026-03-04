import { prisma } from "@/lib/prisma";
import { getMarzbanAdapter } from "@/server/services/marzban";
import { MarzbanHttpError } from "@/server/services/marzban/http-client";

type IntegrationResult = {
  ok: boolean;
  error?: string;
};

const ERROR_LIMIT = 400;
const JSON_LIMIT = 6000;

function toSafeErrorMessage(error: unknown) {
  if (error instanceof MarzbanHttpError) {
    const responseBody = error.responseBody?.slice(0, ERROR_LIMIT) ?? "";
    return responseBody
      ? `${error.message}. response: ${responseBody}`
      : error.message.slice(0, ERROR_LIMIT);
  }

  if (error instanceof Error) {
    return error.message.slice(0, ERROR_LIMIT);
  }

  return "Unknown Marzban integration error.";
}

function toJsonSnapshot(value: unknown) {
  try {
    const serialized = JSON.stringify(value);
    return serialized.length > JSON_LIMIT
      ? `${serialized.slice(0, JSON_LIMIT)}...`
      : serialized;
  } catch {
    return JSON.stringify({ error: "Unable to serialize response payload." });
  }
}

function getUsernamePrefix() {
  const rawPrefix = process.env.MARZBAN_USERNAME_PREFIX?.trim() || "dev_pulsar";
  const normalized = rawPrefix
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "pulsar";
}

function normalizeUsernamePart(value: string, maxLength: number, fallback: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const safe = normalized || fallback;
  return safe.slice(0, maxLength);
}

function isValidMarzbanUsername(username: string) {
  return /^[a-z0-9_]{3,32}$/.test(username);
}

export function buildMarzbanSubscriptionUsername(
  subscriptionId: string,
  appUsername?: string | null
) {
  const userPart = normalizeUsernamePart(appUsername ?? "", 32, "");

  if (isValidMarzbanUsername(userPart)) {
    return userPart;
  }

  const prefix = normalizeUsernamePart(getUsernamePrefix(), 10, "pulsar");
  const shortSub = normalizeUsernamePart(subscriptionId, 12, "sub");
  return `${prefix}_s_${shortSub}`;
}

function resolveSubscriptionUsername(input: {
  existing?: string | null;
  subscriptionId: string;
  appUsername?: string | null;
}) {
  const appUsername = normalizeUsernamePart(input.appUsername ?? "", 32, "");
  if (isValidMarzbanUsername(appUsername)) {
    return appUsername;
  }

  if (input.existing && isValidMarzbanUsername(input.existing)) {
    return input.existing;
  }

  return buildMarzbanSubscriptionUsername(input.subscriptionId, input.appUsername);
}

async function logIntegrationEvent(input: {
  operation: string;
  targetId: string;
  status: "SUCCESS" | "ERROR";
  requestJson?: string | null;
  responseJson?: string | null;
  errorMessage?: string | null;
}) {
  await prisma.integrationSyncLog.create({
    data: {
      errorMessage: input.errorMessage ?? null,
      operation: input.operation,
      provider: "MARZBAN",
      requestJson: input.requestJson ?? null,
      responseJson: input.responseJson ?? null,
      status: input.status,
      targetId: input.targetId,
      targetType: "SUBSCRIPTION",
    },
  });
}

export async function issueSubscriptionInMarzban(
  subscriptionId: string
): Promise<IntegrationResult> {
  const subscription = await prisma.subscription.findUnique({
    select: {
      endsAt: true,
      id: true,
      marzbanUsername: true,
      provisionedAt: true,
      user: {
        select: {
          username: true,
        },
      },
    },
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return { error: "Subscription not found.", ok: false };
  }

  const username = resolveSubscriptionUsername({
    appUsername: subscription.user.username,
    existing: subscription.marzbanUsername,
    subscriptionId: subscription.id,
  });
  const requestPayload = {
    expireAt: subscription.endsAt.toISOString(),
    status: "active",
    username,
  };
  const now = new Date();
  const adapter = getMarzbanAdapter();

  try {
    const existing = await adapter.getVpnUser(username);

    const user = existing
      ? await adapter.updateVpnUser({
          expireAt: subscription.endsAt,
          note: "by Landing",
          status: "active",
          username,
        })
      : await adapter.createVpnUser({
          expireAt: subscription.endsAt,
          note: "by Landing",
          status: "active",
          username,
        });

    const subscriptionUrl =
      user.subscriptionUrl ?? (await adapter.getSubscriptionUrl(username));

    await prisma.subscription.update({
      data: {
        lastSyncAt: now,
        lastSyncError: null,
        marzbanDataJson: toJsonSnapshot(user.raw),
        marzbanStatus: user.status,
        marzbanUsername: user.username || username,
        provisionedAt: subscription.provisionedAt ?? now,
        subscriptionUrl: subscriptionUrl ?? null,
      },
      where: { id: subscription.id },
    });

    await logIntegrationEvent({
      operation: existing ? "UPDATE_VPN_USER" : "CREATE_VPN_USER",
      requestJson: toJsonSnapshot(requestPayload),
      responseJson: toJsonSnapshot(user.raw),
      status: "SUCCESS",
      targetId: subscription.id,
    });

    return { ok: true };
  } catch (error) {
    const errorMessage = toSafeErrorMessage(error);

    await prisma.subscription.update({
      data: {
        lastSyncAt: now,
        lastSyncError: errorMessage,
        marzbanUsername: username,
      },
      where: { id: subscription.id },
    });

    await logIntegrationEvent({
      errorMessage,
      operation: "CREATE_OR_UPDATE_VPN_USER",
      requestJson: toJsonSnapshot(requestPayload),
      status: "ERROR",
      targetId: subscription.id,
    });

    return { error: errorMessage, ok: false };
  }
}

export async function syncSubscriptionInMarzban(
  subscriptionId: string
): Promise<IntegrationResult> {
  const subscription = await prisma.subscription.findUnique({
    select: {
      id: true,
      marzbanUsername: true,
      user: {
        select: {
          username: true,
        },
      },
    },
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return { error: "Subscription not found.", ok: false };
  }

  const username = resolveSubscriptionUsername({
    appUsername: subscription.user.username,
    existing: subscription.marzbanUsername,
    subscriptionId: subscription.id,
  });
  const now = new Date();
  const adapter = getMarzbanAdapter();

  try {
    const user = await adapter.syncVpnUser(username);

    if (!user) {
      const message = "Marzban user not found for sync.";

      await prisma.subscription.update({
        data: {
          lastSyncAt: now,
          lastSyncError: message,
          marzbanUsername: username,
        },
        where: { id: subscription.id },
      });

      await logIntegrationEvent({
        errorMessage: message,
        operation: "SYNC_VPN_USER",
        requestJson: toJsonSnapshot({ username }),
        status: "ERROR",
        targetId: subscription.id,
      });

      return { error: message, ok: false };
    }

    const subscriptionUrl =
      user.subscriptionUrl ?? (await adapter.getSubscriptionUrl(username));

    await prisma.subscription.update({
      data: {
        lastSyncAt: now,
        lastSyncError: null,
        marzbanDataJson: toJsonSnapshot(user.raw),
        marzbanStatus: user.status,
        marzbanUsername: user.username || username,
        subscriptionUrl: subscriptionUrl ?? null,
      },
      where: { id: subscription.id },
    });

    await logIntegrationEvent({
      operation: "SYNC_VPN_USER",
      requestJson: toJsonSnapshot({ username }),
      responseJson: toJsonSnapshot(user.raw),
      status: "SUCCESS",
      targetId: subscription.id,
    });

    return { ok: true };
  } catch (error) {
    const errorMessage = toSafeErrorMessage(error);

    await prisma.subscription.update({
      data: {
        lastSyncAt: now,
        lastSyncError: errorMessage,
        marzbanUsername: username,
      },
      where: { id: subscription.id },
    });

    await logIntegrationEvent({
      errorMessage,
      operation: "SYNC_VPN_USER",
      requestJson: toJsonSnapshot({ username }),
      status: "ERROR",
      targetId: subscription.id,
    });

    return { error: errorMessage, ok: false };
  }
}

export async function revokeSubscriptionInMarzban(
  subscriptionId: string
): Promise<IntegrationResult> {
  const subscription = await prisma.subscription.findUnique({
    select: {
      id: true,
      marzbanUsername: true,
      user: {
        select: {
          username: true,
        },
      },
    },
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return { error: "Subscription not found.", ok: false };
  }

  const username = resolveSubscriptionUsername({
    appUsername: subscription.user.username,
    existing: subscription.marzbanUsername,
    subscriptionId: subscription.id,
  });
  const now = new Date();
  const adapter = getMarzbanAdapter();

  try {
    await adapter.revokeVpnUser(username);

    await prisma.subscription.update({
      data: {
        lastSyncAt: now,
        lastSyncError: null,
        marzbanStatus: "disabled",
        marzbanUsername: username,
      },
      where: { id: subscription.id },
    });

    await logIntegrationEvent({
      operation: "REVOKE_VPN_USER",
      requestJson: toJsonSnapshot({ username }),
      status: "SUCCESS",
      targetId: subscription.id,
    });

    return { ok: true };
  } catch (error) {
    const errorMessage = toSafeErrorMessage(error);

    await prisma.subscription.update({
      data: {
        lastSyncAt: now,
        lastSyncError: errorMessage,
        marzbanUsername: username,
      },
      where: { id: subscription.id },
    });

    await logIntegrationEvent({
      errorMessage,
      operation: "REVOKE_VPN_USER",
      requestJson: toJsonSnapshot({ username }),
      status: "ERROR",
      targetId: subscription.id,
    });

    return { error: errorMessage, ok: false };
  }
}
