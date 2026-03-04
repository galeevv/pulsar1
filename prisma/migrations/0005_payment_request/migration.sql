CREATE TABLE "PaymentRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tariffId" TEXT,
  "tariffName" TEXT NOT NULL,
  "periodMonths" INTEGER NOT NULL,
  "deviceLimit" INTEGER NOT NULL,
  "amountRub" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "markedPaidAt" DATETIME,
  "approvedAt" DATETIME,
  "rejectedAt" DATETIME,
  CONSTRAINT "PaymentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PaymentRequest_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "PaymentRequest_userId_idx" ON "PaymentRequest"("userId");
CREATE INDEX "PaymentRequest_status_idx" ON "PaymentRequest"("status");
CREATE INDEX "PaymentRequest_createdAt_idx" ON "PaymentRequest"("createdAt");
