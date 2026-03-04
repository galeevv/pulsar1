import path from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma";

declare global {
  var __pulsarPrisma: PrismaClient | undefined;
}

function resolveSqlitePath(databaseUrl: string) {
  if (databaseUrl === ":memory:") {
    return databaseUrl;
  }

  if (databaseUrl.startsWith("file:")) {
    const filePath = databaseUrl.slice("file:".length);
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  }

  return path.isAbsolute(databaseUrl) ? databaseUrl : path.resolve(process.cwd(), databaseUrl);
}

const adapter = new PrismaBetterSqlite3({
  url: resolveSqlitePath(process.env.DATABASE_URL ?? "file:./prisma/dev.db"),
});

export const prisma =
  globalThis.__pulsarPrisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__pulsarPrisma = prisma;
}
