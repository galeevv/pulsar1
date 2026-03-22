ALTER TABLE "User"
  ADD COLUMN "reservedCredits" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ReferralProgramSettings"
  ADD COLUMN "minimumPayoutCredits" INTEGER NOT NULL DEFAULT 100;

CREATE TABLE "PayoutRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "amountCredits" INTEGER NOT NULL,
  "amountRub" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "payoutMethod" TEXT NOT NULL DEFAULT 'bank_card',
  "payoutDetailsSnapshot" TEXT NOT NULL,
  "rejectionReason" TEXT,
  "adminNote" TEXT,
  "reviewedByAdminId" TEXT,
  "reviewedAt" DATETIME,
  "paidAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PayoutRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PayoutRequest_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "PayoutRequest_userId_status_createdAt_idx" ON "PayoutRequest"("userId", "status", "createdAt");
CREATE INDEX "PayoutRequest_status_createdAt_idx" ON "PayoutRequest"("status", "createdAt");
CREATE INDEX "PayoutRequest_createdAt_idx" ON "PayoutRequest"("createdAt");
CREATE UNIQUE INDEX "PayoutRequest_userId_active_unique" ON "PayoutRequest"("userId")
WHERE "status" IN ('PENDING', 'APPROVED');

