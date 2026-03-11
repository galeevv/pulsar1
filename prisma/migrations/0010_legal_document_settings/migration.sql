PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS "LegalDocumentSettings" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "userAgreementText" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

INSERT INTO "LegalDocumentSettings" ("id", "userAgreementText", "createdAt", "updatedAt")
VALUES (1, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT("id") DO NOTHING;

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
