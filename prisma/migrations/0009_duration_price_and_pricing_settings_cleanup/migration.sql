PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

ALTER TABLE "SubscriptionDurationRule" ADD COLUMN "monthlyPrice" INTEGER NOT NULL DEFAULT 299;

UPDATE "SubscriptionDurationRule"
SET "monthlyPrice" = COALESCE(
  (SELECT "baseDeviceMonthlyPrice" FROM "SubscriptionPricingSettings" WHERE "id" = 1),
  "monthlyPrice"
);

CREATE TABLE "new_SubscriptionPricingSettings" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "minDevices" INTEGER NOT NULL DEFAULT 1,
  "maxDevices" INTEGER NOT NULL DEFAULT 5,
  "baseDeviceMonthlyPrice" INTEGER NOT NULL DEFAULT 299,
  "extraDeviceMonthlyPrice" INTEGER NOT NULL DEFAULT 100,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_SubscriptionPricingSettings" (
  "id",
  "minDevices",
  "maxDevices",
  "baseDeviceMonthlyPrice",
  "extraDeviceMonthlyPrice",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "minDevices",
  "maxDevices",
  "baseDeviceMonthlyPrice",
  "extraDeviceMonthlyPrice",
  "createdAt",
  "updatedAt"
FROM "SubscriptionPricingSettings";

DROP TABLE "SubscriptionPricingSettings";
ALTER TABLE "new_SubscriptionPricingSettings" RENAME TO "SubscriptionPricingSettings";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
