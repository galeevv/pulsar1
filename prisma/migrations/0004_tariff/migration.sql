CREATE TABLE "Tariff" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "periodMonths" INTEGER NOT NULL,
  "priceRub" INTEGER NOT NULL,
  "deviceLimit" INTEGER NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "Tariff_isEnabled_idx" ON "Tariff"("isEnabled");
