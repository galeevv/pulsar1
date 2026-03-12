-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PaymentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tariffName" TEXT NOT NULL,
    "periodMonths" INTEGER NOT NULL,
    "deviceLimit" INTEGER NOT NULL,
    "amountRub" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "method" TEXT NOT NULL DEFAULT 'PLATEGA',
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
    "plategaTransactionId" TEXT,
    "plategaRedirectUrl" TEXT,
    "plategaStatus" TEXT,
    "plategaPayloadJson" TEXT,
    "plategaConfirmedAt" DATETIME,
    CONSTRAINT "PaymentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PaymentRequest" ("amountRub", "approvedAt", "baseDeviceMonthlyPriceSnapshot", "createdAt", "currency", "deviceLimit", "devices", "durationDiscountPercentSnapshot", "extraDeviceMonthlyPriceSnapshot", "id", "markedPaidAt", "method", "monthlyPriceSnapshot", "months", "periodMonths", "referralDiscountPercentSnapshot", "rejectedAt", "status", "tariffName", "totalPriceBeforeDiscountRubSnapshot", "updatedAt", "userId") SELECT "amountRub", "approvedAt", "baseDeviceMonthlyPriceSnapshot", "createdAt", "currency", "deviceLimit", "devices", "durationDiscountPercentSnapshot", "extraDeviceMonthlyPriceSnapshot", "id", "markedPaidAt", "method", "monthlyPriceSnapshot", "months", "periodMonths", "referralDiscountPercentSnapshot", "rejectedAt", "status", "tariffName", "totalPriceBeforeDiscountRubSnapshot", "updatedAt", "userId" FROM "PaymentRequest";
DROP TABLE "PaymentRequest";
ALTER TABLE "new_PaymentRequest" RENAME TO "PaymentRequest";
CREATE UNIQUE INDEX "PaymentRequest_plategaTransactionId_key" ON "PaymentRequest"("plategaTransactionId");
CREATE INDEX "PaymentRequest_userId_idx" ON "PaymentRequest"("userId");
CREATE INDEX "PaymentRequest_status_idx" ON "PaymentRequest"("status");
CREATE INDEX "PaymentRequest_method_idx" ON "PaymentRequest"("method");
CREATE INDEX "PaymentRequest_createdAt_idx" ON "PaymentRequest"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
