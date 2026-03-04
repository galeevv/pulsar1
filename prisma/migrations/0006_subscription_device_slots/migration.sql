CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "paymentRequestId" TEXT,
  "tariffName" TEXT NOT NULL,
  "periodMonths" INTEGER NOT NULL,
  "deviceLimit" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startedAt" DATETIME NOT NULL,
  "endsAt" DATETIME NOT NULL,
  "revokedAt" DATETIME,
  "subscriptionUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Subscription_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Subscription_paymentRequestId_key" ON "Subscription"("paymentRequestId");
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_endsAt_idx" ON "Subscription"("endsAt");

CREATE TABLE "DeviceSlot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "subscriptionId" TEXT NOT NULL,
  "slotIndex" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'FREE',
  "label" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "DeviceSlot_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DeviceSlot_subscriptionId_slotIndex_key" ON "DeviceSlot"("subscriptionId", "slotIndex");
CREATE INDEX "DeviceSlot_status_idx" ON "DeviceSlot"("status");
