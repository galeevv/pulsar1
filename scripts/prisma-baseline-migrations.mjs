import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

function resolveSqlitePath(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  if (databaseUrl === ":memory:") {
    return databaseUrl;
  }

  if (databaseUrl.startsWith("file:")) {
    const filePath = databaseUrl.slice("file:".length);
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  }

  return path.isAbsolute(databaseUrl) ? databaseUrl : path.resolve(process.cwd(), databaseUrl);
}

function listMigrations(migrationsDir) {
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function readMigrationChecksum(migrationsDir, migrationName) {
  const migrationSqlPath = path.join(migrationsDir, migrationName, "migration.sql");
  if (!fs.existsSync(migrationSqlPath)) {
    throw new Error(`Missing migration.sql for ${migrationName}.`);
  }

  const sql = fs.readFileSync(migrationSqlPath);
  return createHash("sha256").update(sql).digest("hex");
}

function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `);
  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS "_prisma_migrations_migration_name_key" ON "_prisma_migrations"("migration_name");`
  );
}

async function main() {
  const migrationsDir = path.resolve(process.cwd(), "prisma", "migrations");
  const dbPath = resolveSqlitePath(process.env.DATABASE_URL ?? "file:./prisma/dev.db");

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations dir not found: ${migrationsDir}`);
  }

  if (dbPath !== ":memory:" && !fs.existsSync(dbPath)) {
    throw new Error(`Database file not found: ${dbPath}`);
  }

  const db = new Database(dbPath);
  try {
    ensureMigrationsTable(db);

    const migrations = listMigrations(migrationsDir);
    const now = new Date().toISOString();

    const findExisting = db.prepare(
      `SELECT migration_name, checksum FROM "_prisma_migrations" WHERE migration_name = ?`
    );
    const insertMigration = db.prepare(`
      INSERT INTO "_prisma_migrations"
      ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
      VALUES
      (@id, @checksum, @finishedAt, @migrationName, @logs, NULL, @startedAt, @appliedStepsCount)
    `);

    let inserted = 0;
    for (const migrationName of migrations) {
      const checksum = readMigrationChecksum(migrationsDir, migrationName);
      const existing = findExisting.get(migrationName);

      if (existing) {
        if (existing.checksum !== checksum) {
          throw new Error(
            `Checksum mismatch for ${migrationName}. Expected ${checksum}, found ${existing.checksum}.`
          );
        }

        continue;
      }

      insertMigration.run({
        appliedStepsCount: 1,
        checksum,
        finishedAt: now,
        id: randomUUID(),
        logs: "",
        migrationName,
        startedAt: now,
      });
      inserted += 1;
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM "_prisma_migrations"`).get();
    console.log(
      `[prisma-baseline] done: inserted ${inserted}, total in _prisma_migrations = ${total.count}`
    );
  } finally {
    db.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[prisma-baseline] failed: ${message}`);
  process.exitCode = 1;
});
