-- CreateTable
CREATE TABLE "PlategaWebhookLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dedupKey" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "paymentRequestId" TEXT,
    "statusRaw" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "headersJson" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlategaWebhookLog_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PlategaWebhookLog_dedupKey_key" ON "PlategaWebhookLog"("dedupKey");

-- CreateIndex
CREATE INDEX "PlategaWebhookLog_transactionId_createdAt_idx" ON "PlategaWebhookLog"("transactionId", "createdAt");

-- CreateIndex
CREATE INDEX "PlategaWebhookLog_paymentRequestId_idx" ON "PlategaWebhookLog"("paymentRequestId");

-- CreateIndex
CREATE INDEX "PlategaWebhookLog_processingStatus_createdAt_idx" ON "PlategaWebhookLog"("processingStatus", "createdAt");
