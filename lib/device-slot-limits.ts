import type { Prisma } from "@/generated/prisma";

function normalizeDeviceLimit(deviceLimit: number) {
  const normalized = Math.floor(deviceLimit);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 1;
}

export function isSlotWithinDeviceLimit(input: {
  deviceLimit: number;
  slotIndex: number;
}) {
  return input.slotIndex <= normalizeDeviceLimit(input.deviceLimit);
}

export async function reconcileSubscriptionDeviceSlots(
  tx: Prisma.TransactionClient,
  input: {
    deviceLimit: number;
    subscriptionId: string;
  }
) {
  const deviceLimit = normalizeDeviceLimit(input.deviceLimit);
  const existingSlots = await tx.deviceSlot.findMany({
    select: {
      slotIndex: true,
    },
    where: {
      subscriptionId: input.subscriptionId,
    },
  });
  const existingSlotIndexes = new Set(existingSlots.map((slot) => slot.slotIndex));
  const missingSlots = Array.from({ length: deviceLimit }, (_, index) => index + 1).filter(
    (slotIndex) => !existingSlotIndexes.has(slotIndex)
  );

  if (missingSlots.length > 0) {
    await tx.deviceSlot.createMany({
      data: missingSlots.map((slotIndex) => ({
        label: `Device ${slotIndex}`,
        slotIndex,
        status: "FREE",
        subscriptionId: input.subscriptionId,
      })),
    });
  }

  await tx.deviceSlot.updateMany({
    data: {
      assignedAt: null,
      assignedUserAgent: null,
      configUrl: null,
      deviceOs: "UNKNOWN",
      lastSyncError: null,
      marzbanUsername: null,
      status: "FREE",
    },
    where: {
      slotIndex: {
        gt: deviceLimit,
      },
      status: {
        not: "BLOCKED",
      },
      subscriptionId: input.subscriptionId,
    },
  });
}
