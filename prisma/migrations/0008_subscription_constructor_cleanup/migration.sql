PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS "SubscriptionDurationRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "months" INTEGER NOT NULL,
  "discountPercent" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionDurationRule_months_key" ON "SubscriptionDurationRule"("months");
CREATE INDEX IF NOT EXISTS "SubscriptionDurationRule_isActive_idx" ON "SubscriptionDurationRule"("isActive");

INSERT INTO "SubscriptionDurationRule" ("id", "months", "discountPercent", "isActive", "createdAt", "updatedAt")
VALUES
  ('constructor_1m', 1, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('constructor_3m', 3, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('constructor_6m', 6, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('constructor_12m', 12, 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT("months") DO NOTHING;

CREATE TABLE IF NOT EXISTS "SubscriptionPricingSettings" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "minDevices" INTEGER NOT NULL DEFAULT 1,
  "maxDevices" INTEGER NOT NULL DEFAULT 5,
  "baseDeviceMonthlyPrice" INTEGER NOT NULL DEFAULT 299,
  "extraDeviceMonthlyPrice" INTEGER NOT NULL DEFAULT 100,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

INSERT INTO "SubscriptionPricingSettings" (
  "id",
  "minDevices",
  "maxDevices",
  "baseDeviceMonthlyPrice",
  "extraDeviceMonthlyPrice",
  "currency",
  "createdAt",
  "updatedAt"
)
VALUES (1, 1, 5, 299, 100, 'RUB', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT("id") DO NOTHING;

DROP TABLE IF EXISTS "new_PaymentRequest";
CREATE TABLE "new_PaymentRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tariffName" TEXT NOT NULL,
  "periodMonths" INTEGER NOT NULL,
  "deviceLimit" INTEGER NOT NULL,
  "amountRub" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "method" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
  "months" INTEGER NOT NULL DEFAULT 1,
  "devices" INTEGER NOT NULL DEFAULT 1,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "baseDeviceMonthlyPriceSnapshot" INTEGER NOT NULL DEFAULT 0,
  "extraDeviceMonthlyPriceSnapshot" INTEGER NOT NULL DEFAULT 0,
  "monthlyPriceSnapshot" INTEGER NOT NULL DEFAULT 0,
  "durationDiscountPercentSnapshot" INTEGER NOT NULL DEFAULT 0,
  "referralDiscountPercentSnapshot" INTEGER NOT NULL DEFAULT 0,
  "totalPriceBeforeDiscountRubSnapshot" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "markedPaidAt" DATETIME,
  "approvedAt" DATETIME,
  "rejectedAt" DATETIME,
  CONSTRAINT "PaymentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_PaymentRequest" (
  "id",
  "userId",
  "tariffName",
  "periodMonths",
  "deviceLimit",
  "amountRub",
  "status",
  "method",
  "months",
  "devices",
  "currency",
  "baseDeviceMonthlyPriceSnapshot",
  "extraDeviceMonthlyPriceSnapshot",
  "monthlyPriceSnapshot",
  "durationDiscountPercentSnapshot",
  "referralDiscountPercentSnapshot",
  "totalPriceBeforeDiscountRubSnapshot",
  "createdAt",
  "updatedAt",
  "markedPaidAt",
  "approvedAt",
  "rejectedAt"
)
SELECT
  "id",
  "userId",
  CASE
    WHEN "tariffName" IS NULL OR TRIM("tariffName") = ''
      THEN 'Constructor: ' ||
           CAST(CASE WHEN "periodMonths" > 0 THEN "periodMonths" ELSE 1 END AS TEXT) ||
           'm / ' ||
           CAST(CASE WHEN "deviceLimit" > 0 THEN "deviceLimit" ELSE 1 END AS TEXT) ||
           ' devices'
    ELSE "tariffName"
  END,
  CASE WHEN "periodMonths" > 0 THEN "periodMonths" ELSE 1 END,
  CASE WHEN "deviceLimit" > 0 THEN "deviceLimit" ELSE 1 END,
  "amountRub",
  "status",
  'BANK_TRANSFER',
  CASE WHEN "periodMonths" > 0 THEN "periodMonths" ELSE 1 END,
  CASE WHEN "deviceLimit" > 0 THEN "deviceLimit" ELSE 1 END,
  'RUB',
  CASE
    WHEN "periodMonths" > 0 THEN CAST(ROUND("amountRub" * 1.0 / "periodMonths") AS INTEGER)
    ELSE "amountRub"
  END,
  0,
  CASE
    WHEN "periodMonths" > 0 THEN CAST(ROUND("amountRub" * 1.0 / "periodMonths") AS INTEGER)
    ELSE "amountRub"
  END,
  0,
  0,
  "amountRub",
  "createdAt",
  "updatedAt",
  "markedPaidAt",
  "approvedAt",
  "rejectedAt"
FROM "PaymentRequest";

DROP TABLE IF EXISTS "new_Subscription";
CREATE TABLE "new_Subscription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "paymentRequestId" TEXT,
  "tariffName" TEXT NOT NULL,
  "periodMonths" INTEGER NOT NULL,
  "deviceLimit" INTEGER NOT NULL,
  "devices" INTEGER NOT NULL DEFAULT 1,
  "pendingDevices" INTEGER,
  "startsAt" DATETIME,
  "expiresAt" DATETIME,
  "monthsPurchased" INTEGER NOT NULL DEFAULT 1,
  "totalPaid" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "baseDeviceMonthlyPriceSnapshot" INTEGER NOT NULL DEFAULT 0,
  "extraDeviceMonthlyPriceSnapshot" INTEGER NOT NULL DEFAULT 0,
  "monthlyPriceSnapshot" INTEGER NOT NULL DEFAULT 0,
  "durationDiscountPercentSnapshot" INTEGER NOT NULL DEFAULT 0,
  "referralDiscountPercentSnapshot" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startedAt" DATETIME NOT NULL,
  "endsAt" DATETIME NOT NULL,
  "revokedAt" DATETIME,
  "marzbanUsername" TEXT,
  "marzbanStatus" TEXT,
  "marzbanDataJson" TEXT,
  "provisionedAt" DATETIME,
  "lastSyncAt" DATETIME,
  "lastSyncError" TEXT,
  "subscriptionUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Subscription_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Subscription" (
  "id",
  "userId",
  "paymentRequestId",
  "tariffName",
  "periodMonths",
  "deviceLimit",
  "devices",
  "pendingDevices",
  "startsAt",
  "expiresAt",
  "monthsPurchased",
  "totalPaid",
  "currency",
  "baseDeviceMonthlyPriceSnapshot",
  "extraDeviceMonthlyPriceSnapshot",
  "monthlyPriceSnapshot",
  "durationDiscountPercentSnapshot",
  "referralDiscountPercentSnapshot",
  "status",
  "startedAt",
  "endsAt",
  "revokedAt",
  "marzbanUsername",
  "marzbanStatus",
  "marzbanDataJson",
  "provisionedAt",
  "lastSyncAt",
  "lastSyncError",
  "subscriptionUrl",
  "createdAt",
  "updatedAt"
)
SELECT
  s."id",
  s."userId",
  s."paymentRequestId",
  CASE
    WHEN s."tariffName" IS NULL OR TRIM(s."tariffName") = ''
      THEN 'Constructor'
    ELSE s."tariffName"
  END,
  CASE WHEN s."periodMonths" > 0 THEN s."periodMonths" ELSE 1 END,
  CASE WHEN s."deviceLimit" > 0 THEN s."deviceLimit" ELSE 1 END,
  CASE WHEN s."deviceLimit" > 0 THEN s."deviceLimit" ELSE 1 END,
  NULL,
  s."startedAt",
  s."endsAt",
  CASE WHEN s."periodMonths" > 0 THEN s."periodMonths" ELSE 1 END,
  COALESCE(p."amountRub", 0),
  'RUB',
  CASE
    WHEN s."periodMonths" > 0 THEN CAST(ROUND(COALESCE(p."amountRub", 0) * 1.0 / s."periodMonths") AS INTEGER)
    ELSE COALESCE(p."amountRub", 0)
  END,
  0,
  CASE
    WHEN s."periodMonths" > 0 THEN CAST(ROUND(COALESCE(p."amountRub", 0) * 1.0 / s."periodMonths") AS INTEGER)
    ELSE COALESCE(p."amountRub", 0)
  END,
  0,
  0,
  s."status",
  s."startedAt",
  s."endsAt",
  s."revokedAt",
  s."marzbanUsername",
  s."marzbanStatus",
  s."marzbanDataJson",
  s."provisionedAt",
  s."lastSyncAt",
  s."lastSyncError",
  s."subscriptionUrl",
  s."createdAt",
  s."updatedAt"
FROM "Subscription" s
LEFT JOIN "PaymentRequest" p ON p."id" = s."paymentRequestId";

DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";

CREATE UNIQUE INDEX "Subscription_paymentRequestId_key" ON "Subscription"("paymentRequestId");
CREATE UNIQUE INDEX "Subscription_marzbanUsername_key" ON "Subscription"("marzbanUsername");
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_endsAt_idx" ON "Subscription"("endsAt");
CREATE INDEX "Subscription_expiresAt_idx" ON "Subscription"("expiresAt");

DROP TABLE "PaymentRequest";
ALTER TABLE "new_PaymentRequest" RENAME TO "PaymentRequest";

CREATE INDEX "PaymentRequest_userId_idx" ON "PaymentRequest"("userId");
CREATE INDEX "PaymentRequest_status_idx" ON "PaymentRequest"("status");
CREATE INDEX "PaymentRequest_method_idx" ON "PaymentRequest"("method");
CREATE INDEX "PaymentRequest_createdAt_idx" ON "PaymentRequest"("createdAt");

DROP TABLE IF EXISTS "Tariff";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
