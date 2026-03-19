import { createHmac, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

import { hashSync as hashArgon2Sync, verifySync as verifyArgon2Sync } from "@node-rs/argon2";
import { cookies } from "next/headers";

import { Prisma, Role } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

type SessionPayload = {
  exp: number;
  role: Role;
  sessionId: string;
  username: string;
};

type SessionSnapshot = {
  role: Role;
  sessionId: string;
  username: string;
};

const COOKIE_NAME = "pulsar_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SESSION_SECRET = process.env.SESSION_SECRET;
const INVALID_REGISTRATION_CODE_ERROR = "INVALID_REGISTRATION_CODE";
const INVITE_CODE_ALREADY_USED_ERROR = "INVITE_CODE_ALREADY_USED";
const LEGACY_SCRYPT_SALT = "pulsar-dev-salt";
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19456,
  outputLen: 32,
  parallelism: 1,
  timeCost: 2,
};

if (process.env.NODE_ENV === "production" && !SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required in production.");
}

const SESSION_SECRET_VALUE = SESSION_SECRET ?? "pulsar-dev-session-secret";

function hashPassword(password: string) {
  return hashArgon2Sync(password, ARGON2_OPTIONS);
}

function hashLegacyScryptPassword(password: string) {
  return scryptSync(password, LEGACY_SCRYPT_SALT, 64).toString("hex");
}

function isArgon2Hash(passwordHash: string) {
  return passwordHash.startsWith("$argon2");
}

function verifyLegacyScryptPassword(password: string, passwordHash: string) {
  const incoming = Buffer.from(hashLegacyScryptPassword(password), "hex");
  const stored = Buffer.from(passwordHash, "hex");

  if (incoming.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(incoming, stored);
}

function verifyPassword(password: string, passwordHash: string) {
  try {
    if (isArgon2Hash(passwordHash)) {
      return verifyArgon2Sync(passwordHash, password, ARGON2_OPTIONS);
    }

    return verifyLegacyScryptPassword(password, passwordHash);
  } catch {
    return false;
  }
}

function signPayload(payload: string) {
  return createHmac("sha256", SESSION_SECRET_VALUE).update(payload).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(body);
  return `${body}.${signature}`;
}

function decodeSession(value: string | undefined): SessionPayload | null {
  if (!value) {
    return null;
  }

  const [body, signature] = value.split(".");

  if (!body || !signature) {
    return null;
  }

  const expected = signPayload(body);
  const incoming = Buffer.from(signature);
  const actual = Buffer.from(expected);

  if (incoming.length !== actual.length || !timingSafeEqual(incoming, actual)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;

    if (
      typeof parsed.exp !== "number" ||
      parsed.exp <= Date.now() ||
      typeof parsed.sessionId !== "string" ||
      !parsed.sessionId ||
      typeof parsed.username !== "string" ||
      !parsed.username ||
      (parsed.role !== Role.ADMIN && parsed.role !== Role.USER)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function normalizeCode(code: string) {
  return code
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidMarzbanCompatibleUsername(username: string) {
  return /^[a-z0-9_]{3,32}$/.test(username);
}

export function hashPasswordForStorage(password: string) {
  return hashPassword(password);
}

export function verifyPasswordAgainstHash(password: string, passwordHash: string) {
  return verifyPassword(password, passwordHash);
}

function isExpired(expiresAt: Date | null) {
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

export async function ensureBootstrapData() {
  // Admin bootstrap is explicit-only via `npm run admin:bootstrap`.
  return;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const payload = decodeSession(cookieStore.get(COOKIE_NAME)?.value);

  if (!payload) {
    return null;
  }

  const session = await prisma.session.findUnique({
    include: {
      user: {
        select: {
          role: true,
          username: true,
        },
      },
    },
    where: { id: payload.sessionId },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({
      where: { id: payload.sessionId },
    });
    return null;
  }

  return {
    role: session.user.role,
    sessionId: session.id,
    username: session.user.username,
  };
}

export async function setSession(username: string, role: Role) {
  const cookieStore = await cookies();
  const user = await prisma.user.findUnique({
    select: { id: true, username: true },
    where: { username },
  });

  if (!user) {
    throw new Error("User for session not found.");
  }

  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      expiresAt,
      id: sessionId,
      userId: user.id,
    },
  });

  const value = encodeSession({
    exp: expiresAt.getTime(),
    role,
    sessionId,
    username: user.username,
  });

  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const payload = decodeSession(cookieStore.get(COOKIE_NAME)?.value);

  if (payload) {
    await prisma.session.deleteMany({
      where: { id: payload.sessionId },
    });
  }

  cookieStore.delete(COOKIE_NAME);
}

export async function attemptLogin(rawUsername: string, password: string) {
  await ensureBootstrapData();

  const username = rawUsername.trim();

  if (!username || !password) {
    return { message: "Заполните username и password.", ok: false as const };
  }

  const user = await prisma.user.findUnique({
    where: { username: normalizeUsername(username) },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { message: "Неверный username или password.", ok: false as const };
  }

  if (!isArgon2Hash(user.passwordHash)) {
    await prisma.user.update({
      data: {
        passwordHash: hashPassword(password),
      },
      where: {
        id: user.id,
      },
    });
  }

  return {
    ok: true as const,
    user: {
      role: user.role,
      username: user.username,
    },
  };
}

export async function attemptRegistration(input: {
  code: string;
  password: string;
  passwordConfirmation: string;
  username: string;
}) {
  await ensureBootstrapData();

  const username = input.username.trim();
  const normalizedUsername = normalizeUsername(username);
  const password = input.password;
  const passwordConfirmation = input.passwordConfirmation;
  const code = input.code.trim();
  const normalizedCode = normalizeCode(code);

  if (!username || !password || !passwordConfirmation || !code) {
    return {
      message: "Заполните все поля регистрации.",
      ok: false as const,
    };
  }

  if (!isValidMarzbanCompatibleUsername(normalizedUsername)) {
    return {
      message:
        "Username должен быть от 3 до 32 символов и содержать только a-z, 0-9 и _.",
      ok: false as const,
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { username: normalizedUsername },
  });

  if (existingUser) {
    return {
      message: "Такой username уже существует.",
      ok: false as const,
    };
  }

  if (password !== passwordConfirmation) {
    return {
      message: "Пароль и подтверждение не совпадают.",
      ok: false as const,
    };
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const [inviteCode, referralCode] = await Promise.all([
        tx.inviteCode.findUnique({
          where: { code: normalizedCode },
        }),
        tx.referralCode.findUnique({
          where: { code: normalizedCode },
        }),
      ]);

      const validInviteCode =
        inviteCode &&
        inviteCode.isEnabled &&
        !inviteCode.usedByUserId &&
        !isExpired(inviteCode.expiresAt);

      const validReferralCode =
        referralCode && referralCode.isEnabled && !isExpired(referralCode.expiresAt);

      if (!validInviteCode && !validReferralCode) {
        throw new Error(INVALID_REGISTRATION_CODE_ERROR);
      }

      const createdUser = await tx.user.create({
        data: {
          credits: 0,
          passwordHash: hashPassword(password),
          role: Role.USER,
          username: normalizedUsername,
        },
      });

      if (validInviteCode) {
        const inviteClaim = await tx.inviteCode.updateMany({
          data: {
            isEnabled: false,
            usedAt: now,
            usedByUserId: createdUser.id,
          },
          where: {
            id: inviteCode.id,
            isEnabled: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            usedByUserId: null,
          },
        });

        if (inviteClaim.count !== 1) {
          throw new Error(INVITE_CODE_ALREADY_USED_ERROR);
        }
      }

      if (validReferralCode) {
        await tx.referralCodeUse.create({
          data: {
            discountPctSnapshot: referralCode.discountPct,
            referralCodeId: referralCode.id,
            referredUserId: createdUser.id,
            rewardCreditsSnapshot: referralCode.rewardCredits,
          },
        });
      }

      return createdUser;
    });

    return {
      ok: true as const,
      user: {
        role: user.role,
        username: user.username,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === INVALID_REGISTRATION_CODE_ERROR) {
      return {
        message: "Код недействителен, выключен, истек или уже использован.",
        ok: false as const,
      };
    }

    if (error instanceof Error && error.message === INVITE_CODE_ALREADY_USED_ERROR) {
      return {
        message: "Invite-код уже использован другим пользователем. Запросите новый код.",
        ok: false as const,
      };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        message: "Такой username уже существует.",
        ok: false as const,
      };
    }

    throw error;
  }
}

export async function getDevCodes() {
  await ensureBootstrapData();

  const now = new Date();

  const [inviteCodes, referralCodes] = await Promise.all([
    prisma.inviteCode.findMany({
      orderBy: { createdAt: "asc" },
      where: {
        isEnabled: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        usedByUserId: null,
      },
    }),
    prisma.referralCode.findMany({
      orderBy: { createdAt: "asc" },
      where: {
        isEnabled: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
  ]);

  return [
    ...inviteCodes.map((item) => item.code),
    ...referralCodes.map((item) => item.code),
  ];
}

export function getSessionDestination(role: Role) {
  return role === Role.ADMIN ? "/admin" : "/app";
}

export function decodeSessionSnapshot(value: string | undefined): SessionSnapshot | null {
  const payload = decodeSession(value);

  if (!payload) {
    return null;
  }

  return {
    role: payload.role,
    sessionId: payload.sessionId,
    username: payload.username,
  };
}

export { normalizeCode };

