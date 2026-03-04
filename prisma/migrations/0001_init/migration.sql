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
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" DATETIME,
  "usedByUserId" TEXT,
  CONSTRAINT "InviteCode_usedByUserId_fkey"
    FOREIGN KEY ("usedByUserId")
    REFERENCES "User" ("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");
CREATE UNIQUE INDEX "InviteCode_usedByUserId_key" ON "InviteCode"("usedByUserId");

CREATE TABLE "ReferralCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "discountPct" INTEGER NOT NULL DEFAULT 50,
  "rewardCredits" INTEGER NOT NULL DEFAULT 100,
  "ownerUserId" TEXT,
  "usedAt" DATETIME,
  "usedByUserId" TEXT,
  CONSTRAINT "ReferralCode_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId")
    REFERENCES "User" ("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT "ReferralCode_usedByUserId_fkey"
    FOREIGN KEY ("usedByUserId")
    REFERENCES "User" ("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");
CREATE UNIQUE INDEX "ReferralCode_usedByUserId_key" ON "ReferralCode"("usedByUserId");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User" ("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
