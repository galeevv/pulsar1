-- Remove invite-code registration surface.
DROP TABLE IF EXISTS "InviteCode";

-- Store renewal history while keeping a single persistent Subscription row.
CREATE TABLE "SubscriptionRenewal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriptionId" TEXT NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "previousExpiresAt" DATETIME,
    "nextExpiresAt" DATETIME NOT NULL,
    "previousDevices" INTEGER NOT NULL,
    "nextDevices" INTEGER NOT NULL,
    "months" INTEGER NOT NULL,
    "amountRub" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "baseDeviceMonthlyPriceSnapshot" INTEGER NOT NULL DEFAULT 0,
    "extraDeviceMonthlyPriceSnapshot" INTEGER NOT NULL DEFAULT 0,
    "monthlyPriceSnapshot" INTEGER NOT NULL DEFAULT 0,
    "durationDiscountPercentSnapshot" INTEGER NOT NULL DEFAULT 0,
    "referralDiscountPercentSnapshot" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionRenewal_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubscriptionRenewal_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SubscriptionRenewal_paymentRequestId_key" ON "SubscriptionRenewal"("paymentRequestId");
CREATE INDEX "SubscriptionRenewal_subscriptionId_createdAt_idx" ON "SubscriptionRenewal"("subscriptionId", "createdAt");
