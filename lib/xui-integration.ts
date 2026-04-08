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
  input: {
    includeFreeSlots: boolean;
    operationPrefix: "ISSUE" | "PROVISION" | "SYNC";
  }
): Promise<IntegrationResult> {
  const now = new Date();
  const adapter = getXuiAdapter();
  const states: SlotSyncState[] = [];
  const errors: string[] = [];

  for (const slot of subscription.deviceSlots) {
    const shouldProvisionSlot =
      slot.status === "ACTIVE" || (input.includeFreeSlots && slot.status === "FREE");

    if (shouldProvisionSlot) {
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
          operation: existing
            ? `${input.operationPrefix}_UPDATE_XUI_SLOT`
            : `${input.operationPrefix}_CREATE_XUI_SLOT`,
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
          operation: `${input.operationPrefix}_UPSERT_XUI_SLOT`,
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
          operation: `${input.operationPrefix}_REVOKE_XUI_SLOT`,
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
          operation: `${input.operationPrefix}_REVOKE_XUI_SLOT`,
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

  const activeSlotStates = states
    .filter((state) => state.status === "ACTIVE" && state.configUrl)
    .sort((a, b) => a.slotIndex - b.slotIndex);
  const freeSlotStates = states
    .filter((state) => state.status === "FREE" && state.configUrl)
    .sort((a, b) => a.slotIndex - b.slotIndex);
  const primarySlot = activeSlotStates[0] ?? freeSlotStates[0] ?? null;
  const subscriptionError = errors.length > 0 ? errors.join("; ").slice(0, 2000) : null;
  const hasConfig = Boolean(primarySlot);

  await prisma.subscription.update({
    data: {
      lastSyncAt: now,
      lastSyncError: subscriptionError,
      marzbanDataJson: toJsonSnapshot({
        mode: input.includeFreeSlots
          ? "strict_device_slots_preprovisioned"
          : "strict_device_slots",
        slots: summarizeSlotsForSnapshot(states),
      }),
      marzbanStatus: hasConfig ? "active" : "disabled",
      marzbanUsername: primarySlot?.marzbanUsername ?? null,
      provisionedAt: hasConfig ? subscription.provisionedAt ?? now : subscription.provisionedAt,
      subscriptionUrl: primarySlot?.configUrl ?? null,
    },
    where: { id: subscription.id },
  });

  await logIntegrationEvent({
    errorMessage: subscriptionError,
    operation: `${input.operationPrefix}_XUI_SLOTS_SYNC`,
    requestJson: toJsonSnapshot({
      activeSlotCount: subscription.deviceSlots.filter((slot) => slot.status === "ACTIVE").length,
      deviceLimit: subscription.deviceLimit,
      freeSlotCount: subscription.deviceSlots.filter((slot) => slot.status === "FREE").length,
      includeFreeSlots: input.includeFreeSlots,
      subscriptionId: subscription.id,
    }),
    responseJson: toJsonSnapshot({
      hasConfig,
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
      marzbanUsername: true,
      slotIndex: true,
      status: true,
      subscription: {
        select: {
          endsAt: true,
          id: true,
          user: {
            select: {
              username: true,
            },
          },
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

  const adapter = getXuiAdapter();
  const now = new Date();
  const username = resolveSlotUsername({
    appUsername: slot.subscription.user.username,
    existing: slot.marzbanUsername,
    slotIndex: slot.slotIndex,
    subscriptionId: slot.subscription.id,
  });

  try {
    if (isValidXuiUsername(username)) {
      await adapter.revokeVpnUser(username);
    }

    const user = await adapter.createVpnUser({
      expireAt: slot.subscription.endsAt,
      limitIp: SLOT_LIMIT_IP,
      note: `Pulsar slot ${slot.slotIndex}`,
      status: "active",
      username,
    });

    const configUrl =
      user.subscriptionUrl ?? (await adapter.getSubscriptionUrl(user.username || username));

    await prisma.deviceSlot.update({
      data: {
        configUrl: configUrl ?? null,
        lastSyncAt: now,
        lastSyncError: null,
        marzbanUsername: user.username || username,
      },
      where: { id: slot.id },
    });

    await logIntegrationEvent({
      operation: "REISSUE_XUI_SLOT",
      requestJson: toJsonSnapshot({
        slotId: slot.id,
        slotIndex: slot.slotIndex,
        username,
      }),
      responseJson: toJsonSnapshot(user.raw),
      status: "SUCCESS",
      targetId: slot.id,
      targetType: "DEVICE_SLOT",
    });
  } catch (error) {
    const errorMessage = toSafeErrorMessage(error);

    await prisma.deviceSlot.update({
      data: {
        lastSyncAt: now,
        lastSyncError: errorMessage,
      },
      where: { id: slot.id },
    });

    await logIntegrationEvent({
      errorMessage,
      operation: "REISSUE_XUI_SLOT",
      requestJson: toJsonSnapshot({
        slotId: slot.id,
        slotIndex: slot.slotIndex,
        username,
      }),
      status: "ERROR",
      targetId: slot.id,
      targetType: "DEVICE_SLOT",
    });

    return { error: errorMessage, ok: false };
  }

  const refreshedSubscription = await loadManagedSubscription(slot.subscription.id);
  if (refreshedSubscription) {
    const activeSlot = refreshedSubscription.deviceSlots
      .filter((item) => item.status === "ACTIVE" && item.configUrl)
      .sort((a, b) => a.slotIndex - b.slotIndex)[0];
    const freeSlot = refreshedSubscription.deviceSlots
      .filter((item) => item.status === "FREE" && item.configUrl)
      .sort((a, b) => a.slotIndex - b.slotIndex)[0];
    const primarySlot = activeSlot ?? freeSlot ?? null;

    await prisma.subscription.update({
      data: {
        lastSyncAt: now,
        marzbanStatus: primarySlot ? "active" : "disabled",
        marzbanUsername: primarySlot?.marzbanUsername ?? null,
        subscriptionUrl: primarySlot?.configUrl ?? null,
      },
      where: { id: refreshedSubscription.id },
    });
  }

  return { ok: true };
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
