PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

ALTER TABLE "InviteCode" RENAME TO "InviteCode_old";
ALTER TABLE "ReferralCode" RENAME TO "ReferralCode_old";
ALTER TABLE "User" RENAME TO "User_old";
ALTER TABLE "Session" RENAME TO "Session_old";

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "credits" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "InviteCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" DATETIME,
  "usedByUserId" TEXT,
  CONSTRAINT "InviteCode_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");
CREATE UNIQUE INDEX "InviteCode_usedByUserId_key" ON "InviteCode"("usedByUserId");
CREATE INDEX "InviteCode_isEnabled_idx" ON "InviteCode"("isEnabled");
CREATE INDEX "InviteCode_expiresAt_idx" ON "InviteCode"("expiresAt");

CREATE TABLE "ReferralCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "discountPct" INTEGER NOT NULL DEFAULT 50,
  "rewardCredits" INTEGER NOT NULL DEFAULT 100,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "ownerUserId" TEXT,
  CONSTRAINT "ReferralCode_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");
CREATE INDEX "ReferralCode_isEnabled_idx" ON "ReferralCode"("isEnabled");
CREATE INDEX "ReferralCode_expiresAt_idx" ON "ReferralCode"("expiresAt");

CREATE TABLE "ReferralCodeUse" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "referralCodeId" TEXT NOT NULL,
  "referredUserId" TEXT NOT NULL,
  "discountPctSnapshot" INTEGER NOT NULL,
  "rewardCreditsSnapshot" INTEGER NOT NULL,
  "rewardGrantedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralCodeUse_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReferralCodeUse_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReferralCodeUse_referredUserId_key" ON "ReferralCodeUse"("referredUserId");
CREATE INDEX "ReferralCodeUse_referralCodeId_idx" ON "ReferralCodeUse"("referralCodeId");
CREATE INDEX "ReferralCodeUse_rewardGrantedAt_idx" ON "ReferralCodeUse"("rewardGrantedAt");

CREATE TABLE "PromoCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "creditAmount" INTEGER NOT NULL,
  "maxRedemptions" INTEGER NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
CREATE INDEX "PromoCode_isEnabled_idx" ON "PromoCode"("isEnabled");
CREATE INDEX "PromoCode_expiresAt_idx" ON "PromoCode"("expiresAt");

CREATE TABLE "PromoCodeRedemption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "promoCodeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromoCodeRedemption_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PromoCodeRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PromoCodeRedemption_promoCodeId_userId_key" ON "PromoCodeRedemption"("promoCodeId", "userId");
CREATE INDEX "PromoCodeRedemption_promoCodeId_idx" ON "PromoCodeRedemption"("promoCodeId");
CREATE INDEX "PromoCodeRedemption_userId_idx" ON "PromoCodeRedemption"("userId");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

INSERT INTO "User" ("id", "username", "passwordHash", "role", "credits", "createdAt", "updatedAt")
SELECT "id", "username", "passwordHash", "role", "credits", "createdAt", "updatedAt"
FROM "User_old";

INSERT INTO "InviteCode" ("id", "code", "isEnabled", "expiresAt", "createdAt", "usedAt", "usedByUserId")
SELECT "id", "code", true, NULL, "createdAt", "usedAt", "usedByUserId"
FROM "InviteCode_old";

INSERT INTO "ReferralCode" ("id", "code", "discountPct", "rewardCredits", "isEnabled", "expiresAt", "createdAt", "updatedAt", "ownerUserId")
SELECT "id", "code", "discountPct", "rewardCredits", true, NULL, "createdAt", "createdAt", "ownerUserId"
FROM "ReferralCode_old";

INSERT INTO "ReferralCodeUse" (
  "id",
  "referralCodeId",
  "referredUserId",
  "discountPctSnapshot",
  "rewardCreditsSnapshot",
  "rewardGrantedAt",
  "createdAt"
)
SELECT
  lower(hex(randomblob(4)) || hex(randomblob(2)) || '4' || substr(hex(randomblob(2)), 2) || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || hex(randomblob(6))),
  "id",
  "usedByUserId",
  "discountPct",
  "rewardCredits",
  NULL,
  COALESCE("usedAt", "createdAt")
FROM "ReferralCode_old"
WHERE "usedByUserId" IS NOT NULL;

INSERT INTO "Session" ("id", "userId", "expiresAt", "createdAt", "updatedAt")
SELECT "id", "userId", "expiresAt", "createdAt", "updatedAt"
FROM "Session_old";

DROP TABLE "InviteCode_old";
DROP TABLE "ReferralCode_old";
DROP TABLE "User_old";
DROP TABLE "Session_old";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
