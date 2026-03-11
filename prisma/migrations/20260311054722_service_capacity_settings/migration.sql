-- CreateTable
CREATE TABLE "ServiceCapacitySettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "maxActiveSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LegalDocumentSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "userAgreementText" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LegalDocumentSettings" ("createdAt", "id", "updatedAt", "userAgreementText") SELECT "createdAt", "id", "updatedAt", "userAgreementText" FROM "LegalDocumentSettings";
DROP TABLE "LegalDocumentSettings";
ALTER TABLE "new_LegalDocumentSettings" RENAME TO "LegalDocumentSettings";
CREATE TABLE "new_SubscriptionPricingSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "minDevices" INTEGER NOT NULL DEFAULT 1,
    "maxDevices" INTEGER NOT NULL DEFAULT 5,
    "baseDeviceMonthlyPrice" INTEGER NOT NULL DEFAULT 299,
    "extraDeviceMonthlyPrice" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SubscriptionPricingSettings" ("baseDeviceMonthlyPrice", "createdAt", "extraDeviceMonthlyPrice", "id", "maxDevices", "minDevices", "updatedAt") SELECT "baseDeviceMonthlyPrice", "createdAt", "extraDeviceMonthlyPrice", "id", "maxDevices", "minDevices", "updatedAt" FROM "SubscriptionPricingSettings";
DROP TABLE "SubscriptionPricingSettings";
ALTER TABLE "new_SubscriptionPricingSettings" RENAME TO "SubscriptionPricingSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
