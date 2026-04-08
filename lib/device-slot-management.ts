import { DeviceOS, type Prisma } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"
import { provisionSubscriptionSlotsInXui } from "@/lib/xui-integration"

const SLOT_ASSIGNMENT_RACE_ATTEMPTS = 3
const SLOT_SYNC_MAX_ATTEMPTS = 3
const SLOT_SYNC_RETRY_DELAY_MS = 500
const SLOT_SYNC_ERROR_LIMIT = 2000

type AssignmentMode = "FREE" | "IDEMPOTENT"

type ManagedSlotSummary = {
  configUrl: string | null
  deviceOs: DeviceOS
  id: string
  lastSyncError: string | null
  slotIndex: number
  status: "ACTIVE" | "BLOCKED" | "FREE"
  subscriptionId: string
}

export type SlotAssignmentResult =
  | {
      mode: AssignmentMode
      slot: ManagedSlotSummary
      subscriptionId: string
      type: "ASSIGNED"
    }
  | {
      type: "NO_ACTIVE_SUBSCRIPTION" | "NO_FREE_SLOTS"
    }

type SlotSyncResult =
  | {
      attempts: number
      slot: ManagedSlotSummary | null
      type: "SYNC_FAILED"
      errorMessage: string
    }
  | {
      attempts: number
      slot: ManagedSlotSummary
      type: "SYNC_SUCCESS"
    }

function normalizeSyncError(error: string | null | undefined) {
  if (!error) {
    return "Не удалось получить ссылку подписки. Повторите синхронизацию."
  }

  return error.slice(0, SLOT_SYNC_ERROR_LIMIT)
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readSlotSummary(slotId: string) {
  return prisma.deviceSlot.findUnique({
    select: {
      configUrl: true,
      deviceOs: true,
      id: true,
      lastSyncError: true,
      slotIndex: true,
      status: true,
      subscriptionId: true,
    },
    where: { id: slotId },
  })
}

function mapSlotSummary(slot: Awaited<ReturnType<typeof readSlotSummary>>) {
  if (!slot) {
    return null
  }

  return {
    configUrl: slot.configUrl,
    deviceOs: slot.deviceOs,
    id: slot.id,
    lastSyncError: slot.lastSyncError,
    slotIndex: slot.slotIndex,
    status: slot.status,
    subscriptionId: slot.subscriptionId,
  } satisfies ManagedSlotSummary
}

async function claimFirstFreeSlot(
  tx: Prisma.TransactionClient,
  input: {
    deviceOs: DeviceOS
    slotId: string
    subscriptionId: string
  }
) {
  for (let attempt = 0; attempt < SLOT_ASSIGNMENT_RACE_ATTEMPTS; attempt += 1) {
    const claimed = await tx.deviceSlot.updateMany({
      data: {
        deviceOs: input.deviceOs,
        status: "ACTIVE",
      },
      where: {
        id: input.slotId,
        status: "FREE",
        subscriptionId: input.subscriptionId,
      },
    })

    if (claimed.count === 1) {
      return tx.deviceSlot.findUnique({
        where: { id: input.slotId },
      })
    }
  }

  return null
}

export async function assignManagedSlotForUser(input: {
  deviceOs: DeviceOS
  slotId: string
  userId: string
}) {
  const result = await prisma.$transaction(async (tx): Promise<SlotAssignmentResult> => {
    const activeSubscription = await tx.subscription.findFirst({
      orderBy: [{ startsAt: "desc" }, { startedAt: "desc" }],
      select: { id: true },
      where: {
        status: "ACTIVE",
        userId: input.userId,
      },
    })

    if (!activeSubscription) {
      return {
        type: "NO_ACTIVE_SUBSCRIPTION",
      }
    }

    const targetSlot = await tx.deviceSlot.findFirst({
      where: {
        id: input.slotId,
        subscriptionId: activeSubscription.id,
      },
    })

    if (!targetSlot) {
      return {
        type: "NO_FREE_SLOTS",
      }
    }

    if (targetSlot.status === "ACTIVE" && targetSlot.deviceOs === input.deviceOs) {
      return {
        mode: "IDEMPOTENT",
        slot: {
          configUrl: targetSlot.configUrl,
          deviceOs: targetSlot.deviceOs,
          id: targetSlot.id,
          lastSyncError: targetSlot.lastSyncError,
          slotIndex: targetSlot.slotIndex,
          status: targetSlot.status,
          subscriptionId: targetSlot.subscriptionId,
        },
        subscriptionId: activeSubscription.id,
        type: "ASSIGNED",
      }
    }

    if (targetSlot.status !== "FREE") {
      return {
        type: "NO_FREE_SLOTS",
      }
    }

    const claimedFreeSlot = await claimFirstFreeSlot(tx, {
      deviceOs: input.deviceOs,
      slotId: targetSlot.id,
      subscriptionId: activeSubscription.id,
    })

    if (claimedFreeSlot) {
      return {
        mode: "FREE",
        slot: {
          configUrl: claimedFreeSlot.configUrl,
          deviceOs: claimedFreeSlot.deviceOs,
          id: claimedFreeSlot.id,
          lastSyncError: claimedFreeSlot.lastSyncError,
          slotIndex: claimedFreeSlot.slotIndex,
          status: claimedFreeSlot.status,
          subscriptionId: claimedFreeSlot.subscriptionId,
        },
        subscriptionId: activeSubscription.id,
        type: "ASSIGNED",
      }
    }

    const maybeAlreadyClaimed = await tx.deviceSlot.findUnique({
      where: { id: targetSlot.id },
    })

    if (maybeAlreadyClaimed?.status === "ACTIVE" && maybeAlreadyClaimed.deviceOs === input.deviceOs) {
      return {
        mode: "IDEMPOTENT",
        slot: {
          configUrl: maybeAlreadyClaimed.configUrl,
          deviceOs: maybeAlreadyClaimed.deviceOs,
          id: maybeAlreadyClaimed.id,
          lastSyncError: maybeAlreadyClaimed.lastSyncError,
          slotIndex: maybeAlreadyClaimed.slotIndex,
          status: maybeAlreadyClaimed.status,
          subscriptionId: maybeAlreadyClaimed.subscriptionId,
        },
        subscriptionId: activeSubscription.id,
        type: "ASSIGNED",
      }
    }

    return {
      type: "NO_FREE_SLOTS",
    }
  })

  return result
}

export async function syncSlotConfigWithRetry(input: {
  maxAttempts?: number
  slotId: string
  subscriptionId: string
}) {
  const maxAttempts = Math.max(1, input.maxAttempts ?? SLOT_SYNC_MAX_ATTEMPTS)
  let lastError = "Не удалось получить ссылку подписки. Повторите синхронизацию."
  let lastKnownSlot: ManagedSlotSummary | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const syncResult = await provisionSubscriptionSlotsInXui(input.subscriptionId)
    const slot = mapSlotSummary(await readSlotSummary(input.slotId))

    if (!slot) {
      return {
        attempts: attempt,
        errorMessage: "Слот не найден.",
        slot: null,
        type: "SYNC_FAILED",
      } as const
    }

    lastKnownSlot = slot

    if (slot.status === "ACTIVE" && slot.configUrl) {
      if (slot.lastSyncError) {
        await prisma.deviceSlot.update({
          data: {
            lastSyncError: null,
          },
          where: { id: slot.id },
        })
      }

      const refreshedSlot = mapSlotSummary(await readSlotSummary(slot.id))
      if (!refreshedSlot) {
        return {
          attempts: attempt,
          errorMessage: "Слот не найден.",
          slot: null,
          type: "SYNC_FAILED",
        } as const
      }

      return {
        attempts: attempt,
        slot: refreshedSlot,
        type: "SYNC_SUCCESS",
      } satisfies SlotSyncResult
    }

    lastError = normalizeSyncError(slot.lastSyncError ?? syncResult.error)

    if (attempt < maxAttempts) {
      await wait(SLOT_SYNC_RETRY_DELAY_MS)
    }
  }

  if (lastKnownSlot) {
    await prisma.deviceSlot.update({
      data: {
        lastSyncError: normalizeSyncError(lastError),
      },
      where: { id: lastKnownSlot.id },
    })

    const refreshedSlot = mapSlotSummary(await readSlotSummary(lastKnownSlot.id))

    return {
      attempts: maxAttempts,
      errorMessage: normalizeSyncError(lastError),
      slot: refreshedSlot ?? lastKnownSlot,
      type: "SYNC_FAILED",
    } satisfies SlotSyncResult
  }

  return {
    attempts: maxAttempts,
    errorMessage: "Слот не найден.",
    slot: null,
    type: "SYNC_FAILED",
  } as const
}
