type MarzbanAuthMode = "password" | "token";

export type MarzbanConfig = {
  authMode: MarzbanAuthMode;
  baseUrl: string;
  enableMockFallback: boolean;
  password?: string;
  timeoutMs: number;
  token?: string;
  username?: string;
  usernamePrefix: string;
  verifyTls: boolean;
};

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (typeof value !== "string") {
    return defaultValue;
  }

  return value.toLowerCase() === "true";
}

function parseIntValue(value: string | undefined, defaultValue: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export function getMarzbanConfig(): MarzbanConfig {
  const baseUrl = normalizeBaseUrl(process.env.MARZBAN_BASE_URL ?? "");
  const authMode = (process.env.MARZBAN_AUTH_MODE ?? "password") as MarzbanAuthMode;

  if (!baseUrl) {
    throw new Error("MARZBAN_BASE_URL is not configured.");
  }

  if (authMode !== "password" && authMode !== "token") {
    throw new Error("MARZBAN_AUTH_MODE must be either 'password' or 'token'.");
  }

  const config: MarzbanConfig = {
    authMode,
    baseUrl,
    enableMockFallback: parseBoolean(process.env.MARZBAN_ENABLE_MOCK_FALLBACK, false),
    timeoutMs: parseIntValue(process.env.MARZBAN_TIMEOUT_MS, 15000),
    usernamePrefix: process.env.MARZBAN_USERNAME_PREFIX?.trim() || "dev_pulsar",
    verifyTls: parseBoolean(process.env.MARZBAN_VERIFY_TLS, true),
  };

  if (authMode === "password") {
    const username = process.env.MARZBAN_USERNAME?.trim();
    const password = process.env.MARZBAN_PASSWORD?.trim();

    if (!username || !password) {
      throw new Error("MARZBAN_USERNAME and MARZBAN_PASSWORD are required for password auth mode.");
    }

    config.username = username;
    config.password = password;
  }

  if (authMode === "token") {
    const token = process.env.MARZBAN_TOKEN?.trim();

    if (!token) {
      throw new Error("MARZBAN_TOKEN is required for token auth mode.");
    }

    config.token = token;
  }

  return config;
}
