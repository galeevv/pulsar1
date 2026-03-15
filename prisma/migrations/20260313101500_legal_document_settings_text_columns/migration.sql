ALTER TABLE "LegalDocumentSettings"
  ADD COLUMN "publicOfferText" TEXT NOT NULL DEFAULT '';

ALTER TABLE "LegalDocumentSettings"
  ADD COLUMN "privacyPolicyText" TEXT NOT NULL DEFAULT '';
