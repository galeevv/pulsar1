export type XuiConfig = {
  apiToken?: string;
  baseUrl: string;
  basicAuthPassword?: string;
  basicAuthUsername?: string;
  clientFlow: string;
  enableMockFallback: boolean;
  backupInboundId?: number;
  inboundId: number;
  managedInboundIds: number[];
  password?: string;
  primaryInboundId: number;
  subscriptionBaseUrl?: string;
  timeoutMs: number;
  username?: string;
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

function parsePositiveIntList(value: string | undefined) {
  if (!value?.trim()) {
    return [];
  }

  const ids: number[] = [];
  const seen = new Set<number>();

  for (const item of value.split(/[,\s]+/)) {
    const parsed = parsePositiveInt(item, 0);

    if (!parsed || seen.has(parsed)) {
      continue;
    }

    seen.add(parsed);
    ids.push(parsed);
  }

  return ids;
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

function resolveXuiEndpoint(rawBaseUrl: string, rawWebBasePath: string | undefined) {
  const normalizedBaseUrl = normalizeBaseUrl(rawBaseUrl.trim());
  const explicitWebBasePath = normalizePathSegment(rawWebBasePath);

  try {
    const parsed = new URL(normalizedBaseUrl);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const pathBase = pathSegments.join("/");
    const webBasePath = explicitWebBasePath || pathBase;

    if (pathBase && webBasePath && pathBase.endsWith(webBasePath)) {
      const prefixSegments = pathSegments.slice(0, pathSegments.length - webBasePath.split("/").filter(Boolean).length);
      parsed.pathname = prefixSegments.length > 0 ? `/${prefixSegments.join("/")}` : "/";
      parsed.search = "";
      parsed.hash = "";

      return {
        baseUrl: normalizeBaseUrl(parsed.toString()),
        webBasePath,
      };
    }

    return {
      baseUrl: normalizedBaseUrl,
      webBasePath,
    };
  } catch {
    return {
      baseUrl: normalizedBaseUrl,
      webBasePath: explicitWebBasePath,
    };
  }
}

export function getXuiConfig(): XuiConfig {
  const endpoint = resolveXuiEndpoint(
    process.env.XUI_BASE_URL?.trim() ||
      process.env.XUI_RU_BASE_URL?.trim() ||
      process.env.MARZBAN_BASE_URL?.trim() ||
      "",
    process.env.XUI_WEB_BASE_PATH ?? process.env.XUI_RU_WEB_BASE_PATH
  );
  const primaryInboundId = parsePositiveInt(
    process.env.XUI_PRIMARY_INBOUND_ID ??
      process.env.XUI_RU_PRIMARY_INBOUND_ID ??
      process.env.XUI_INBOUND_ID,
    0
  );
  const backupInboundId = parsePositiveInt(
    process.env.XUI_BACKUP_INBOUND_ID ?? process.env.XUI_RU_BACKUP_INBOUND_ID,
    0
  );
  const managedInboundIds = parsePositiveIntList(
    process.env.XUI_MANAGED_INBOUND_IDS ?? process.env.XUI_INBOUND_IDS
  );
  const apiToken =
    process.env.XUI_API_TOKEN?.trim() || process.env.XUI_RU_API_TOKEN?.trim() || undefined;
  const username =
    process.env.XUI_USERNAME?.trim() ||
    process.env.XUI_RU_USERNAME?.trim() ||
    process.env.MARZBAN_USERNAME?.trim() ||
    "";
  const password =
    process.env.XUI_PASSWORD?.trim() ||
    process.env.XUI_RU_PASSWORD?.trim() ||
    process.env.MARZBAN_PASSWORD?.trim() ||
    "";

  if (!endpoint.baseUrl) {
    throw new Error("XUI_BASE_URL is not configured.");
  }

  if (!endpoint.webBasePath) {
    throw new Error("XUI_WEB_BASE_PATH is not configured.");
  }

  if (!apiToken) {
    getRequiredEnv(username, "", "XUI_USERNAME");
    getRequiredEnv(password, "", "XUI_PASSWORD");
  }

  if (!primaryInboundId) {
    throw new Error("XUI_PRIMARY_INBOUND_ID (or XUI_INBOUND_ID) must be a positive integer.");
  }

  if (backupInboundId && backupInboundId === primaryInboundId) {
    throw new Error("XUI_BACKUP_INBOUND_ID must differ from primary inbound id.");
  }

  return {
    apiToken,
    baseUrl: endpoint.baseUrl,
    backupInboundId: backupInboundId || undefined,
    basicAuthPassword: process.env.XUI_PANEL_BASIC_AUTH_PASSWORD?.trim() || undefined,
    basicAuthUsername: process.env.XUI_PANEL_BASIC_AUTH_USERNAME?.trim() || undefined,
    clientFlow: process.env.XUI_CLIENT_FLOW?.trim() || "xtls-rprx-vision",
    enableMockFallback: parseBoolean(
      process.env.XUI_ENABLE_MOCK_FALLBACK ?? process.env.MARZBAN_ENABLE_MOCK_FALLBACK,
      false
    ),
    inboundId: primaryInboundId,
    managedInboundIds,
    password: password || undefined,
    primaryInboundId,
    subscriptionBaseUrl: process.env.XUI_SUBSCRIPTION_BASE_URL?.trim() || undefined,
    timeoutMs: parsePositiveInt(process.env.XUI_TIMEOUT_MS ?? process.env.MARZBAN_TIMEOUT_MS, 15000),
    username: username || undefined,
    usernamePrefix: process.env.XUI_EMAIL_PREFIX?.trim() || process.env.MARZBAN_USERNAME_PREFIX?.trim() || "pulsar",
    verifyTls: parseBoolean(process.env.XUI_VERIFY_TLS ?? process.env.MARZBAN_VERIFY_TLS, true),
    webBasePath: endpoint.webBasePath,
  };
}
