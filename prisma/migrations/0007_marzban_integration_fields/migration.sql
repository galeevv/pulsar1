ALTER TABLE "Subscription" ADD COLUMN "marzbanUsername" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "marzbanStatus" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "marzbanDataJson" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "provisionedAt" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "lastSyncAt" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "lastSyncError" TEXT;

CREATE UNIQUE INDEX "Subscription_marzbanUsername_key" ON "Subscription"("marzbanUsername");

ALTER TABLE "DeviceSlot" ADD COLUMN "marzbanUsername" TEXT;
ALTER TABLE "DeviceSlot" ADD COLUMN "configUrl" TEXT;
ALTER TABLE "DeviceSlot" ADD COLUMN "lastSyncAt" DATETIME;
ALTER TABLE "DeviceSlot" ADD COLUMN "lastSyncError" TEXT;

CREATE TABLE "IntegrationSyncLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "requestJson" TEXT,
  "responseJson" TEXT,
  "errorMessage" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "IntegrationSyncLog_provider_createdAt_idx" ON "IntegrationSyncLog"("provider", "createdAt");
CREATE INDEX "IntegrationSyncLog_targetType_targetId_idx" ON "IntegrationSyncLog"("targetType", "targetId");
CREATE INDEX "IntegrationSyncLog_status_createdAt_idx" ON "IntegrationSyncLog"("status", "createdAt");
