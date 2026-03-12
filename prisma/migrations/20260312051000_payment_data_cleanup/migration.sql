UPDATE "PaymentRequest"
SET "method" = 'PLATEGA'
WHERE "method" = 'BANK_TRANSFER';

UPDATE "PaymentRequest"
SET
  "status" = 'APPROVED',
  "approvedAt" = COALESCE("approvedAt", "markedPaidAt", "createdAt"),
  "plategaStatus" = COALESCE("plategaStatus", 'MIGRATED_FROM_LEGACY')
WHERE "status" = 'MARKED_PAID';
