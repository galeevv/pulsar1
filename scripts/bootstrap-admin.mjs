import path from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashSync as hashArgon2Sync } from "@node-rs/argon2";

import { PrismaClient, Role } from "../generated/prisma/index.js";

function resolveSqlitePath(databaseUrl) {
  if (databaseUrl === ":memory:") {
    return databaseUrl;
  }

  if (databaseUrl.startsWith("file:")) {
    const filePath = databaseUrl.slice("file:".length);
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  }

  return path.isAbsolute(databaseUrl) ? databaseUrl : path.resolve(process.cwd(), databaseUrl);
}

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function isValidMarzbanCompatibleUsername(username) {
  return /^[a-z0-9_]{3,32}$/.test(username);
}

function hashPassword(password) {
  return hashArgon2Sync(password, {
    algorithm: 2,
    memoryCost: 19456,
    outputLen: 32,
    parallelism: 1,
    timeCost: 2,
  });
}

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

async function main() {
  const username = normalizeUsername(readRequiredEnv("BOOTSTRAP_ADMIN_USERNAME"));
  const password = readRequiredEnv("BOOTSTRAP_ADMIN_PASSWORD");

  if (!isValidMarzbanCompatibleUsername(username)) {
    throw new Error(
      "BOOTSTRAP_ADMIN_USERNAME must match /^[a-z0-9_]{3,32}$/."
    );
  }

  if (password.length < 8) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.");
  }

  const adapter = new PrismaBetterSqlite3({
    url: resolveSqlitePath(process.env.DATABASE_URL ?? "file:./prisma/dev.db"),
  });

  const prisma = new PrismaClient({
    adapter,
    log: ["error"],
  });

  try {
    const admin = await prisma.user.upsert({
      create: {
        credits: 0,
        passwordHash: hashPassword(password),
        role: Role.ADMIN,
        username,
      },
      update: {
        passwordHash: hashPassword(password),
        role: Role.ADMIN,
      },
      where: {
        username,
      },
    });

    const adminCount = await prisma.user.count({
      where: {
        role: Role.ADMIN,
      },
    });

    console.log(`[admin:bootstrap] Admin is ready: ${admin.username}`);
    console.log(`[admin:bootstrap] Total admins in DB: ${adminCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[admin:bootstrap] Failed: ${message}`);
  process.exitCode = 1;
});
