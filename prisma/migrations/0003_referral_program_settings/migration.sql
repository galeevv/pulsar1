CREATE TABLE "ReferralProgramSettings" (
  "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "defaultDiscountPct" INTEGER NOT NULL DEFAULT 50,
  "defaultRewardCredits" INTEGER NOT NULL DEFAULT 100,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

INSERT INTO "ReferralProgramSettings" (
  "id",
  "isEnabled",
  "defaultDiscountPct",
  "defaultRewardCredits",
  "createdAt",
  "updatedAt"
)
VALUES (
  1,
  true,
  50,
  100,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
