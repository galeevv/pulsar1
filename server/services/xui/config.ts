export type XuiConfig = {
  baseUrl: string;
  basicAuthPassword?: string;
  basicAuthUsername?: string;
  clientFlow: string;
  enableMockFallback: boolean;
  backupInboundId?: number;
  inboundId: number;
  password: string;
  primaryInboundId: number;
  subscriptionBaseUrl?: string;
  timeoutMs: number;
  username: string;
  usernamePrefix: string;
  verifyTls: boolean;
  webBasePath: string;
};

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (typeof value !== "string") {
    return defaultValue;
  }

  return value.toLowerCase() === "true";
}

function parsePositiveInt(value: string | undefined, defaultValue: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function normalizePathSegment(value: string | undefined) {
  return (value ?? "").trim().replace(/^\/+|\/+$/g, "");
}

function getRequiredEnv(primary: string, fallback: string, key: string) {
  const value = primary.trim() || fallback.trim();
  if (!value) {
    throw new Error(`${key} is not configured.`);
  }
  return value;
}

export function getXuiConfig(): XuiConfig {
  const baseUrl = normalizeBaseUrl(
    process.env.XUI_BASE_URL?.trim() || process.env.MARZBAN_BASE_URL?.trim() || ""
  );
  const webBasePath = normalizePathSegment(process.env.XUI_WEB_BASE_PATH);
  const primaryInboundId = parsePositiveInt(
    process.env.XUI_PRIMARY_INBOUND_ID ?? process.env.XUI_INBOUND_ID,
    0
  );
  const backupInboundId = parsePositiveInt(process.env.XUI_BACKUP_INBOUND_ID, 0);
  const username = getRequiredEnv(
    process.env.XUI_USERNAME?.trim() || "",
    process.env.MARZBAN_USERNAME?.trim() || "",
    "XUI_USERNAME"
  );
  const password = getRequiredEnv(
    process.env.XUI_PASSWORD?.trim() || "",
    process.env.MARZBAN_PASSWORD?.trim() || "",
    "XUI_PASSWORD"
  );

  if (!baseUrl) {
    throw new Error("XUI_BASE_URL is not configured.");
  }

  if (!webBasePath) {
    throw new Error("XUI_WEB_BASE_PATH is not configured.");
  }

  if (!primaryInboundId) {
    throw new Error("XUI_PRIMARY_INBOUND_ID (or XUI_INBOUND_ID) must be a positive integer.");
  }

  if (backupInboundId && backupInboundId === primaryInboundId) {
    throw new Error("XUI_BACKUP_INBOUND_ID must differ from primary inbound id.");
  }

  return {
    baseUrl,
    backupInboundId: backupInboundId || undefined,
    basicAuthPassword: process.env.XUI_PANEL_BASIC_AUTH_PASSWORD?.trim() || undefined,
    basicAuthUsername: process.env.XUI_PANEL_BASIC_AUTH_USERNAME?.trim() || undefined,
    clientFlow: process.env.XUI_CLIENT_FLOW?.trim() || "xtls-rprx-vision",
    enableMockFallback: parseBoolean(
      process.env.XUI_ENABLE_MOCK_FALLBACK ?? process.env.MARZBAN_ENABLE_MOCK_FALLBACK,
      false
    ),
    inboundId: primaryInboundId,
    password,
    primaryInboundId,
    subscriptionBaseUrl: process.env.XUI_SUBSCRIPTION_BASE_URL?.trim() || undefined,
    timeoutMs: parsePositiveInt(process.env.XUI_TIMEOUT_MS ?? process.env.MARZBAN_TIMEOUT_MS, 15000),
    username,
    usernamePrefix: process.env.XUI_EMAIL_PREFIX?.trim() || process.env.MARZBAN_USERNAME_PREFIX?.trim() || "pulsar",
    verifyTls: parseBoolean(process.env.XUI_VERIFY_TLS ?? process.env.MARZBAN_VERIFY_TLS, true),
    webBasePath,
  };
}
