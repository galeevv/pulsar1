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
  provisionedAt: Date | null;
  user: {
    username: string;
  };
  deviceSlots: ManagedSlot[];
};

const ERROR_LIMIT = 400;
const JSON_LIMIT = 6000;
const SLOT_LIMIT_IP = 2;

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

function resolveSlotUsername(input: {
  appUsername?: string | null;
  existing?: string | null;
  slotIndex: number;
  subscriptionId: string;
}) {
  if (input.existing && isValidXuiUsername(input.existing)) {
    return input.existing;
  }

  return buildXuiDeviceSlotUsername({
    appUsername: input.appUsername,
    slotIndex: input.slotIndex,
    subscriptionId: input.subscriptionId,
  });
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
      provider: "MARZBAN",
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
      provisionedAt: true,
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
  operationPrefix: "ISSUE" | "SYNC"
): Promise<IntegrationResult> {
  const now = new Date();
  const adapter = getXuiAdapter();
  const states: SlotSyncState[] = [];
  const errors: string[] = [];

  for (const slot of subscription.deviceSlots) {
    if (slot.status === "ACTIVE") {
      const username = resolveSlotUsername({
        appUsername: subscription.user.username,
        existing: slot.marzbanUsername,
        slotIndex: slot.slotIndex,
        subscriptionId: subscription.id,
      });
      const requestPayload = {
        expireAt: subscription.endsAt.toISOString(),
        limitIp: SLOT_LIMIT_IP,
        slotId: slot.id,
        slotIndex: slot.slotIndex,
        status: "active",
        username,
      };

      try {
        const existing = await adapter.getVpnUser(username);
        const user = existing
          ? await adapter.updateVpnUser({
              expireAt: subscription.endsAt,
              limitIp: SLOT_LIMIT_IP,
              note: `Pulsar slot ${slot.slotIndex}`,
              status: "active",
              username,
            })
          : await adapter.createVpnUser({
              expireAt: subscription.endsAt,
              limitIp: SLOT_LIMIT_IP,
              note: `Pulsar slot ${slot.slotIndex}`,
              status: "active",
              username,
            });
        const configUrl =
          user.subscriptionUrl ?? (await adapter.getSubscriptionUrl(username));

        await prisma.deviceSlot.update({
          data: {
            configUrl: configUrl ?? null,
            lastSyncAt: now,
            lastSyncError: null,
            marzbanUsername: user.username || username,
          },
          where: { id: slot.id },
        });

        const successfulState: SlotSyncState = {
          configUrl: configUrl ?? null,
          errorMessage: null,
          marzbanUsername: user.username || username,
          raw: user.raw,
          slotId: slot.id,
          slotIndex: slot.slotIndex,
          status: slot.status,
        };
        states.push(successfulState);

        await logIntegrationEvent({
          operation: existing ? `${operationPrefix}_UPDATE_XUI_SLOT` : `${operationPrefix}_CREATE_XUI_SLOT`,
          requestJson: toJsonSnapshot(requestPayload),
          responseJson: toJsonSnapshot(user.raw),
          status: "SUCCESS",
          targetId: slot.id,
          targetType: "DEVICE_SLOT",
        });
      } catch (error) {
        const errorMessage = toSafeErrorMessage(error);

        await prisma.deviceSlot.update({
          data: {
            configUrl: null,
            lastSyncAt: now,
            lastSyncError: errorMessage,
            marzbanUsername: username,
          },
          where: { id: slot.id },
        });

        states.push({
          configUrl: null,
          errorMessage,
          marzbanUsername: username,
          slotId: slot.id,
          slotIndex: slot.slotIndex,
          status: slot.status,
        });
        errors.push(`slot ${slot.slotIndex}: ${errorMessage}`);

        await logIntegrationEvent({
          errorMessage,
          operation: `${operationPrefix}_UPSERT_XUI_SLOT`,
          requestJson: toJsonSnapshot(requestPayload),
          status: "ERROR",
          targetId: slot.id,
          targetType: "DEVICE_SLOT",
        });
      }

      continue;
    }

    const username = slot.marzbanUsername;

    if (username && isValidXuiUsername(username)) {
      try {
        await adapter.revokeVpnUser(username);

        await logIntegrationEvent({
          operation: `${operationPrefix}_REVOKE_XUI_SLOT`,
          requestJson: toJsonSnapshot({
            reason: `slot_status_${slot.status.toLowerCase()}`,
            slotId: slot.id,
            slotIndex: slot.slotIndex,
            username,
          }),
          status: "SUCCESS",
          targetId: slot.id,
          targetType: "DEVICE_SLOT",
        });
      } catch (error) {
        const errorMessage = toSafeErrorMessage(error);
        errors.push(`slot ${slot.slotIndex}: ${errorMessage}`);

        await prisma.deviceSlot.update({
          data: {
            configUrl: null,
            lastSyncAt: now,
            lastSyncError: errorMessage,
            marzbanUsername: null,
          },
          where: { id: slot.id },
        });

        states.push({
          configUrl: null,
          errorMessage,
          marzbanUsername: null,
          slotId: slot.id,
          slotIndex: slot.slotIndex,
          status: slot.status,
        });

        await logIntegrationEvent({
          errorMessage,
          operation: `${operationPrefix}_REVOKE_XUI_SLOT`,
          requestJson: toJsonSnapshot({
            reason: `slot_status_${slot.status.toLowerCase()}`,
            slotId: slot.id,
            slotIndex: slot.slotIndex,
            username,
          }),
          status: "ERROR",
          targetId: slot.id,
          targetType: "DEVICE_SLOT",
        });

        continue;
      }
    }

    await prisma.deviceSlot.update({
      data: {
        configUrl: null,
        lastSyncAt: now,
        lastSyncError: null,
        marzbanUsername: null,
      },
      where: { id: slot.id },
    });

    states.push({
      configUrl: null,
      errorMessage: null,
      marzbanUsername: null,
      slotId: slot.id,
      slotIndex: slot.slotIndex,
      status: slot.status,
    });
  }

  const activeSlotStates = states.filter(
    (state) => state.status === "ACTIVE" && state.configUrl
  );
  const primarySlot = activeSlotStates.sort((a, b) => a.slotIndex - b.slotIndex)[0];
  const subscriptionError = errors.length > 0 ? errors.join("; ").slice(0, 2000) : null;
  const hasActiveConfig = activeSlotStates.length > 0;

  await prisma.subscription.update({
    data: {
      lastSyncAt: now,
      lastSyncError: subscriptionError,
      marzbanDataJson: toJsonSnapshot({
        mode: "strict_device_slots",
        slots: summarizeSlotsForSnapshot(states),
      }),
      marzbanStatus: hasActiveConfig ? "active" : "disabled",
      marzbanUsername: primarySlot?.marzbanUsername ?? null,
      provisionedAt: hasActiveConfig ? subscription.provisionedAt ?? now : subscription.provisionedAt,
      subscriptionUrl: primarySlot?.configUrl ?? null,
    },
    where: { id: subscription.id },
  });

  await logIntegrationEvent({
    errorMessage: subscriptionError,
    operation: `${operationPrefix}_XUI_SLOTS_SYNC`,
    requestJson: toJsonSnapshot({
      activeSlotCount: subscription.deviceSlots.filter((slot) => slot.status === "ACTIVE").length,
      deviceLimit: subscription.deviceLimit,
      subscriptionId: subscription.id,
    }),
    responseJson: toJsonSnapshot({
      hasActiveConfig,
      primarySlotIndex: primarySlot?.slotIndex ?? null,
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

  await prisma.deviceSlot.updateMany({
    data: {
      status: "ACTIVE",
    },
    where: {
      status: "FREE",
      subscriptionId,
    },
  });

  const subscription = await loadManagedSubscription(subscriptionId);

  if (!subscription) {
    return { error: "Subscription not found.", ok: false };
  }

  return syncSubscriptionSlotsInXui(subscription, "ISSUE");
}

export async function syncSubscriptionInXui(
  subscriptionId: string
): Promise<IntegrationResult> {
  const subscription = await loadManagedSubscription(subscriptionId);

  if (!subscription) {
    return { error: "Subscription not found.", ok: false };
  }

  return syncSubscriptionSlotsInXui(subscription, "SYNC");
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

  for (const slot of subscription.deviceSlots) {
    const username = slot.marzbanUsername;

    if (username && isValidXuiUsername(username)) {
      try {
        await adapter.revokeVpnUser(username);

        await logIntegrationEvent({
          operation: "REVOKE_XUI_SLOT",
          requestJson: toJsonSnapshot({
            slotId: slot.id,
            slotIndex: slot.slotIndex,
            subscriptionId: subscription.id,
            username,
          }),
          status: "SUCCESS",
          targetId: slot.id,
          targetType: "DEVICE_SLOT",
        });
      } catch (error) {
        const errorMessage = toSafeErrorMessage(error);
        errors.push(`slot ${slot.slotIndex}: ${errorMessage}`);

        await logIntegrationEvent({
          errorMessage,
          operation: "REVOKE_XUI_SLOT",
          requestJson: toJsonSnapshot({
            slotId: slot.id,
            slotIndex: slot.slotIndex,
            subscriptionId: subscription.id,
            username,
          }),
          status: "ERROR",
          targetId: slot.id,
          targetType: "DEVICE_SLOT",
        });
      }
    }

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
        mode: "strict_device_slots",
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
    operation: "REVOKE_XUI_SUBSCRIPTION_SLOTS",
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
