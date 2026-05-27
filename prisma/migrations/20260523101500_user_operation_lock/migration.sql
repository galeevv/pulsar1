CREATE TABLE "UserOperationLock" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "operation" TEXT NOT NULL,
  "lockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserOperationLock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "UserOperationLock_lockedAt_idx" ON "UserOperationLock"("lockedAt");
