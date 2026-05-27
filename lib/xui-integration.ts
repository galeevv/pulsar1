import { prisma } from "@/lib/prisma";
import { getXuiAdapter } from "@/server/services/xui";
import { XuiHttpError } from "@/server/services/xui/http-client";

type IntegrationResult = {
  ok: boolean;
  error?: string;
};

type ManagedSlot = {
  configUrl: string | null;
  id: string;
  marzbanUsername: string | null;
  slotIndex: number;
  status: "ACTIVE" | "BLOCKED" | "FREE";
};

type ManagedSubscription = {
  deviceLimit: number;
  endsAt: Date;
  id: string;
  marzbanUsername: string | null;
  provisionedAt: Date | null;
  subscriptionUrl: string | null;
  user: {
    username: string;
  };
  deviceSlots: ManagedSlot[];
};

const ERROR_LIMIT = 400;
const JSON_LIMIT = 6000;

function toSafeErrorMessage(error: unknown) {
  if (error instanceof XuiHttpError) {
    const responseBody = error.responseBody?.slice(0, ERROR_LIMIT) ?? "";
    return responseBody
      ? `${error.message}. response: ${responseBody}`
      : error.message.slice(0, ERROR_LIMIT);
  }

  if (error instanceof Error) {
    return error.message.slice(0, ERROR_LIMIT);
  }

  return "Unknown x-ui integration error.";
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
  const rawPrefix =
    process.env.XUI_EMAIL_PREFIX?.trim() ||
    process.env.MARZBAN_USERNAME_PREFIX?.trim() ||
    "dev_pulsar";
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

function isValidXuiUsername(username: string) {
  return /^[a-z0-9_]{3,32}$/.test(username);
}

function isLegacyDeviceSlotUsername(username: string) {
  return /_d\d+$/.test(username);
}

export function buildXuiSubscriptionUsername(
  subscriptionId: string,
  appUsername?: string | null
) {
  const userPart = normalizeUsernamePart(appUsername ?? "", 32, "");

  if (isValidXuiUsername(userPart)) {
    return userPart;
  }

  const prefix = normalizeUsernamePart(getUsernamePrefix(), 10, "pulsar");
  const shortSub = normalizeUsernamePart(subscriptionId, 12, "sub");
  return `${prefix}_s_${shortSub}`;
}

export function buildXuiDeviceSlotUsername(input: {
  appUsername?: string | null;
  slotIndex: number;
  subscriptionId: string;
}) {
  const userPrefix = normalizeUsernamePart(input.appUsername ?? "", 8, "");
  const fallbackPrefix = normalizeUsernamePart(getUsernamePrefix(), 8, "pulsar");
  const prefix = userPrefix || fallbackPrefix;
  const shortSub = normalizeUsernamePart(input.subscriptionId, 12, "sub");
  const slotPart = `d${Math.max(1, Math.floor(input.slotIndex))}`;
  const candidate = normalizeUsernamePart(
    `${prefix}_s_${shortSub}_${slotPart}`,
    32,
    "pulsar_slot"
  );

  return isValidXuiUsername(candidate) ? candidate : "pulsar_slot";
}

function resolveSubscriptionUsername(input: {
  appUsername?: string | null;
  existing?: string | null;
  subscriptionId: string;
}) {
  if (
    input.existing &&
    isValidXuiUsername(input.existing) &&
    !isLegacyDeviceSlotUsername(input.existing)
  ) {
    return input.existing;
  }

  return buildXuiSubscriptionUsername(input.subscriptionId, input.appUsername);
}

function resolveSubscriptionIpLimit(subscription: ManagedSubscription) {
  return Math.max(1, Math.floor(subscription.deviceLimit));
}

async function logIntegrationEvent(input: {
  operation: string;
  targetId: string;
  targetType?: "DEVICE_SLOT" | "SUBSCRIPTION";
  status: "SUCCESS" | "ERROR";
  requestJson?: string | null;
  responseJson?: string | null;
  errorMessage?: string | null;
}) {
  await prisma.integrationSyncLog.create({
    data: {
      errorMessage: input.errorMessage ?? null,
      operation: input.operation,
      provider: "XUI",
      requestJson: input.requestJson ?? null,
      responseJson: input.responseJson ?? null,
      status: input.status,
      targetId: input.targetId,
      targetType: input.targetType ?? "SUBSCRIPTION",
    },
  });
}

async function loadManagedSubscription(subscriptionId: string) {
  return prisma.subscription.findUnique({
    select: {
      deviceLimit: true,
      deviceSlots: {
        orderBy: { slotIndex: "asc" },
        select: {
          configUrl: true,
          id: true,
          marzbanUsername: true,
          slotIndex: true,
          status: true,
        },
      },
      endsAt: true,
      id: true,
      marzbanUsername: true,
      provisionedAt: true,
      subscriptionUrl: true,
      user: {
        select: {
          username: true,
        },
      },
    },
    where: { id: subscriptionId },
  });
}

type SlotSyncState = {
  configUrl: string | null;
  errorMessage: string | null;
  marzbanUsername: string | null;
  raw?: unknown;
  slotId: string;
  slotIndex: number;
  status: "ACTIVE" | "BLOCKED" | "FREE";
};

function summarizeSlotsForSnapshot(states: SlotSyncState[]) {
  return states.map((state) => ({
    configUrl: state.configUrl,
    errorMessage: state.errorMessage,
    slotId: state.slotId,
    slotIndex: state.slotIndex,
    status: state.status,
    username: state.marzbanUsername,
  }));
}

async function syncSubscriptionSlotsInXui(
  subscription: ManagedSubscription,
  input: {
    includeFreeSlots: boolean;
    operationPrefix: "ISSUE" | "PROVISION" | "SYNC";
  }
): Promise<IntegrationResult> {
  const now = new Date();
  const adapter = getXuiAdapter();
  const username = resolveSubscriptionUsername({
    appUsername: subscription.user.username,
    existing: subscription.marzbanUsername,
    subscriptionId: subscription.id,
  });
  const limitIp = resolveSubscriptionIpLimit(subscription);
  const requestPayload = {
    expireAt: subscription.endsAt.toISOString(),
    includeFreeSlots: input.includeFreeSlots,
    limitIp,
    status: "active",
    subscriptionId: subscription.id,
    username,
  };
  const states: SlotSyncState[] = [];
  let subscriptionError: string | null = null;
  let responseRaw: unknown = null;
  let subscriptionUrl: string | null = null;

  try {
    const existing = await adapter.getVpnUser(username);
    const user = existing
      ? await adapter.updateVpnUser({
          expireAt: subscription.endsAt,
          limitIp,
          note: `Pulsar subscription ${subscription.id}`,
          status: "active",
          username,
        })
      : await adapter.createVpnUser({
          expireAt: subscription.endsAt,
          limitIp,
          note: `Pulsar subscription ${subscription.id}`,
          status: "active",
          username,
        });

    responseRaw = user.raw;
    subscriptionUrl =
      user.subscriptionUrl ?? (await adapter.getSubscriptionUrl(user.username || username));

    if (!subscriptionUrl) {
      throw new Error("x-ui did not return a subscription URL.");
    }

    await logIntegrationEvent({
      operation: existing
        ? `${input.operationPrefix}_UPDATE_XUI_SUBSCRIPTION`
        : `${input.operationPrefix}_CREATE_XUI_SUBSCRIPTION`,
      requestJson: toJsonSnapshot(requestPayload),
      responseJson: toJsonSnapshot(user.raw),
      status: "SUCCESS",
      targetId: subscription.id,
      targetType: "SUBSCRIPTION",
    });
  } catch (error) {
    subscriptionError = toSafeErrorMessage(error);

    await logIntegrationEvent({
      errorMessage: subscriptionError,
      operation: `${input.operationPrefix}_UPSERT_XUI_SUBSCRIPTION`,
      requestJson: toJsonSnapshot(requestPayload),
      status: "ERROR",
      targetId: subscription.id,
      targetType: "SUBSCRIPTION",
    });
  }

  const legacySlotUsernames = new Set(
    subscription.deviceSlots
      .map((slot) => slot.marzbanUsername)
      .filter((value): value is string => Boolean(value && value !== username && isValidXuiUsername(value)))
  );
  if (
    subscription.marzbanUsername &&
    subscription.marzbanUsername !== username &&
    isValidXuiUsername(subscription.marzbanUsername)
  ) {
    legacySlotUsernames.add(subscription.marzbanUsername);
  }

  for (const legacyUsername of legacySlotUsernames) {
    try {
      await adapter.revokeVpnUser(legacyUsername);

      await logIntegrationEvent({
        operation: `${input.operationPrefix}_REVOKE_LEGACY_XUI_SLOT`,
        requestJson: toJsonSnapshot({
          reason: "single_subscription_link_migration",
          subscriptionId: subscription.id,
          username: legacyUsername,
        }),
        status: "SUCCESS",
        targetId: subscription.id,
        targetType: "SUBSCRIPTION",
      });
    } catch (error) {
      const errorMessage = toSafeErrorMessage(error);
      subscriptionError = [subscriptionError, errorMessage].filter(Boolean).join("; ").slice(0, 2000);

      await logIntegrationEvent({
        errorMessage,
        operation: `${input.operationPrefix}_REVOKE_LEGACY_XUI_SLOT`,
        requestJson: toJsonSnapshot({
          reason: "single_subscription_link_migration",
          subscriptionId: subscription.id,
          username: legacyUsername,
        }),
        status: "ERROR",
        targetId: subscription.id,
        targetType: "SUBSCRIPTION",
      });
    }
  }

  for (const slot of subscription.deviceSlots) {
    const slotCanUseSubscription = slot.status !== "BLOCKED" && Boolean(subscriptionUrl);
    const slotError = slot.status === "BLOCKED" ? null : subscriptionError;

    await prisma.deviceSlot.update({
      data: {
        configUrl: slotCanUseSubscription ? subscriptionUrl : null,
        lastSyncAt: now,
        lastSyncError: slotError,
        marzbanUsername: null,
      },
      where: { id: slot.id },
    });

    states.push({
      configUrl: slotCanUseSubscription ? subscriptionUrl : null,
      errorMessage: slotError,
      marzbanUsername: null,
      raw: responseRaw,
      slotId: slot.id,
      slotIndex: slot.slotIndex,
      status: slot.status,
    });
  }

  const hasConfig = Boolean(subscriptionUrl);

  await prisma.subscription.update({
    data: {
      lastSyncAt: now,
      lastSyncError: subscriptionError,
      marzbanDataJson: toJsonSnapshot({
        limitIp,
        mode: "single_subscription_link_ip_limit",
        slots: summarizeSlotsForSnapshot(states),
      }),
      marzbanStatus: hasConfig ? "active" : "disabled",
      marzbanUsername: hasConfig ? username : subscription.marzbanUsername,
      provisionedAt: hasConfig ? subscription.provisionedAt ?? now : subscription.provisionedAt,
      subscriptionUrl,
    },
    where: { id: subscription.id },
  });

  await logIntegrationEvent({
    errorMessage: subscriptionError,
    operation: `${input.operationPrefix}_XUI_SUBSCRIPTION_SYNC`,
    requestJson: toJsonSnapshot({
      activeSlotCount: subscription.deviceSlots.filter((slot) => slot.status === "ACTIVE").length,
      deviceLimit: subscription.deviceLimit,
      freeSlotCount: subscription.deviceSlots.filter((slot) => slot.status === "FREE").length,
      includeFreeSlots: input.includeFreeSlots,
      limitIp,
      subscriptionId: subscription.id,
    }),
    responseJson: toJsonSnapshot({
      hasConfig,
      subscriptionUrl,
      username,
      slots: summarizeSlotsForSnapshot(states),
    }),
    status: subscriptionError ? "ERROR" : "SUCCESS",
    targetId: subscription.id,
    targetType: "SUBSCRIPTION",
  });

  if (subscriptionError) {
    return { error: subscriptionError, ok: false };
  }

  return { ok: true };
}

export async function issueSubscriptionInXui(
  subscriptionId: string
): Promise<IntegrationResult> {
  const exists = await prisma.subscription.findUnique({
    select: { id: true },
    where: { id: subscriptionId },
  });

  if (!exists) {
    return { error: "Subscription not found.", ok: false };
  }

  const subscription = await loadManagedSubscription(subscriptionId);

  if (!subscription) {
    return { error: "Subscription not found.", ok: false };
  }

  return syncSubscriptionSlotsInXui(subscription, {
    includeFreeSlots: false,
    operationPrefix: "ISSUE",
  });
}

export async function syncSubscriptionInXui(
  subscriptionId: string
): Promise<IntegrationResult> {
  const subscription = await loadManagedSubscription(subscriptionId);

  if (!subscription) {
    return { error: "Subscription not found.", ok: false };
  }

  return syncSubscriptionSlotsInXui(subscription, {
    includeFreeSlots: false,
    operationPrefix: "SYNC",
  });
}

export async function provisionSubscriptionSlotsInXui(
  subscriptionId: string
): Promise<IntegrationResult> {
  const subscription = await loadManagedSubscription(subscriptionId);

  if (!subscription) {
    return { error: "Subscription not found.", ok: false };
  }

  return syncSubscriptionSlotsInXui(subscription, {
    includeFreeSlots: true,
    operationPrefix: "PROVISION",
  });
}

export async function reissueDeviceSlotCredentialInXui(input: {
  slotId: string;
}): Promise<IntegrationResult> {
  const slot = await prisma.deviceSlot.findUnique({
    select: {
      id: true,
      slotIndex: true,
      status: true,
      subscription: {
        select: {
          id: true,
        },
      },
    },
    where: { id: input.slotId },
  });

  if (!slot) {
    return { error: "Slot not found.", ok: false };
  }

  if (slot.status === "BLOCKED") {
    return { error: "Blocked slot cannot be reissued.", ok: false };
  }

  const result = await syncSubscriptionInXui(slot.subscription.id);

  await logIntegrationEvent({
    errorMessage: result.error ?? null,
    operation: "REISSUE_XUI_SUBSCRIPTION_LINK",
    requestJson: toJsonSnapshot({
      slotId: slot.id,
      slotIndex: slot.slotIndex,
      subscriptionId: slot.subscription.id,
    }),
    status: result.ok ? "SUCCESS" : "ERROR",
    targetId: slot.id,
    targetType: "DEVICE_SLOT",
  });

  return result;
}

export async function revokeSubscriptionInXui(
  subscriptionId: string
): Promise<IntegrationResult> {
  const subscription = await loadManagedSubscription(subscriptionId);

  if (!subscription) {
    return { error: "Subscription not found.", ok: false };
  }

  const now = new Date();
  const adapter = getXuiAdapter();
  const errors: string[] = [];
  const usernamesToRevoke = new Set<string>();

  if (subscription.marzbanUsername && isValidXuiUsername(subscription.marzbanUsername)) {
    usernamesToRevoke.add(subscription.marzbanUsername);
  }

  for (const slot of subscription.deviceSlots) {
    const username = slot.marzbanUsername;
    if (username && isValidXuiUsername(username)) {
      usernamesToRevoke.add(username);
    }
  }

  for (const username of usernamesToRevoke) {
    try {
      await adapter.revokeVpnUser(username);

      await logIntegrationEvent({
        operation: "REVOKE_XUI_SUBSCRIPTION",
        requestJson: toJsonSnapshot({
          subscriptionId: subscription.id,
          username,
        }),
        status: "SUCCESS",
        targetId: subscription.id,
        targetType: "SUBSCRIPTION",
      });
    } catch (error) {
      const errorMessage = toSafeErrorMessage(error);
      errors.push(`${username}: ${errorMessage}`);

      await logIntegrationEvent({
        errorMessage,
        operation: "REVOKE_XUI_SUBSCRIPTION",
        requestJson: toJsonSnapshot({
          subscriptionId: subscription.id,
          username,
        }),
        status: "ERROR",
        targetId: subscription.id,
        targetType: "SUBSCRIPTION",
      });
    }
  }

  for (const slot of subscription.deviceSlots) {
    await prisma.deviceSlot.update({
      data: {
        configUrl: null,
        lastSyncAt: now,
        lastSyncError: null,
        marzbanUsername: null,
        status: "BLOCKED",
      },
      where: { id: slot.id },
    });
  }

  const errorMessage = errors.length > 0 ? errors.join("; ").slice(0, 2000) : null;

  await prisma.subscription.update({
    data: {
      lastSyncAt: now,
      lastSyncError: errorMessage,
      marzbanDataJson: toJsonSnapshot({
        mode: "single_subscription_link_ip_limit",
        revokedAt: now.toISOString(),
      }),
      marzbanStatus: "disabled",
      marzbanUsername: null,
      subscriptionUrl: null,
    },
    where: { id: subscription.id },
  });

  await logIntegrationEvent({
    errorMessage,
    operation: "REVOKE_XUI_SUBSCRIPTION",
    requestJson: toJsonSnapshot({
      subscriptionId: subscription.id,
    }),
    status: errorMessage ? "ERROR" : "SUCCESS",
    targetId: subscription.id,
    targetType: "SUBSCRIPTION",
  });

  if (errorMessage) {
    return { error: errorMessage, ok: false };
  }

  return { ok: true };
}
