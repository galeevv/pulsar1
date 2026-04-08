-- Add OS/assignment metadata for device slots
ALTER TABLE "DeviceSlot" ADD COLUMN "deviceOs" TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "DeviceSlot" ADD COLUMN "assignedAt" DATETIME;
ALTER TABLE "DeviceSlot" ADD COLUMN "assignedUserAgent" TEXT;

CREATE INDEX "DeviceSlot_assignedAt_idx" ON "DeviceSlot"("assignedAt");
CREATE INDEX "DeviceSlot_subscriptionId_status_assignedAt_idx" ON "DeviceSlot"("subscriptionId", "status", "assignedAt");
