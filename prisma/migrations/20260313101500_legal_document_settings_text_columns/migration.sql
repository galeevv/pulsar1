-- Keep migration idempotent for servers where hotfix SQL was already applied.
ALTER TABLE "LegalDocumentSettings"
  ADD COLUMN IF NOT EXISTS "publicOfferText" TEXT NOT NULL DEFAULT '';

ALTER TABLE "LegalDocumentSettings"
  ADD COLUMN IF NOT EXISTS "privacyPolicyText" TEXT NOT NULL DEFAULT '';
