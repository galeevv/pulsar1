ALTER TABLE "Subscription" ADD COLUMN "migrationLinkRefreshRequired" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Subscription"
SET "migrationLinkRefreshRequired" = true
WHERE "status" = 'ACTIVE'
  AND "createdAt" < '2026-06-01T19:49:22.000Z';
