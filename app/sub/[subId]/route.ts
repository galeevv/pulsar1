import { prisma } from "@/lib/prisma";
import { getXuiConfig } from "@/server/services/xui/config";
import { XuiHttpClient } from "@/server/services/xui/http-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUBSCRIPTION_PROFILE_NAME = "🪐PulsarVPN";
const RESPONSE_FORMATS = new Set(["base64", "html", "plain"]);

function getProfileHost(key: string, fallback: string) {
  return process.env[key]?.trim() || fallback;
}

function getProfilePort(key: string, fallback: number) {
  const value = Number.parseInt(process.env[key] ?? String(fallback), 10);
  return Number.isFinite(value) && value > 0 ? value : 443;
}

function getPublicProfile(line: string) {
  const parsed = new URL(line);
  const sni = parsed.searchParams.get("sni") ?? "";
  const port = Number.parseInt(parsed.port || "443", 10);
  const hash = decodeURIComponent(parsed.hash.replace(/^#/, ""));

  if (/nexus/i.test(hash) || sni === "www.microsoft.com") {
    return {
      host: getProfileHost("XUI_SUBSCRIPTION_NEXUS_HOST", "ge.pulsarr.space"),
      port: getProfilePort("XUI_SUBSCRIPTION_NEXUS_PORT", 443),
      remark: process.env.XUI_SUBSCRIPTION_NEXUS_REMARK?.trim() || "🇪🇺 Nexus",
    };
  }

  if (/nova/i.test(hash) || port === 2443) {
    return {
      host: getProfileHost("XUI_SUBSCRIPTION_NOVA_HOST", "ru1.pulsarnet.online"),
      port: getProfilePort("XUI_SUBSCRIPTION_NOVA_PORT", 2443),
      remark: process.env.XUI_SUBSCRIPTION_NOVA_REMARK?.trim() || "🇪🇺 Nova",
    };
  }

  return {
    host: getProfileHost("XUI_SUBSCRIPTION_LUNAR_HOST", "ru1.pulsarnet.online"),
    port: getProfilePort("XUI_SUBSCRIPTION_LUNAR_PORT", 443),
    remark: process.env.XUI_SUBSCRIPTION_LUNAR_REMARK?.trim() || "🇪🇺 Lunar",
  };
}

async function fetchSubscriptionLinks(subId: string) {
  const client = new XuiHttpClient(getXuiConfig());
  const links = await client.apiGet<string[]>(
    `clients/subLinks/${encodeURIComponent(subId)}`
  );

  const vlessLinks = (Array.isArray(links) ? links : [])
    .filter((line) => typeof line === "string" && line.startsWith("vless://"))
  if (vlessLinks.length === 0) {
    throw new Error("x-ui did not return subscription links.");
  }

  return vlessLinks.join("\n");
}

function decodeSubscription(raw: string) {
  const trimmed = raw.trim();

  if (trimmed.startsWith("vless://")) {
    return {
      encoded: false,
      text: trimmed,
    };
  }

  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    if (!decoded.includes("vless://")) {
      return {
        encoded: false,
        text: raw,
      };
    }

    return {
      encoded: true,
      text: decoded,
    };
  } catch {
    return {
      encoded: false,
      text: raw,
    };
  }
}

function rewriteVlessLine(line: string) {
  if (!line.startsWith("vless://")) {
    return line;
  }

  const parsed = new URL(line);
  const profile = getPublicProfile(line);

  parsed.hostname = profile.host;
  parsed.port = String(profile.port);
  parsed.hash = profile.remark;
  return parsed.toString();
}

function rewriteSubscription(raw: string) {
  const decoded = decodeSubscription(raw);
  return (
    decoded.text
    .split(/\r?\n/)
    .map((line) => rewriteVlessLine(line.trim()))
    .filter(Boolean)
    .join("\n") + "\n"
  );
}

function encodeSubscription(raw: string) {
  return Buffer.from(raw, "utf8").toString("base64");
}

function isSubscriptionClient(userAgent: string) {
  return /clash|happ|hiddify|nekobox|quantumult|sager|shadowrocket|sing-?box|streisand|surge|v2box|v2ray|v2rayng|xray/i.test(
    userAgent
  );
}

function resolveResponseFormat(request: Request) {
  const requestUrl = new URL(request.url);
  const requestedFormat = requestUrl.searchParams.get("format")?.toLowerCase() ?? "";

  if (RESPONSE_FORMATS.has(requestedFormat)) {
    return requestedFormat as "base64" | "html" | "plain";
  }

  const userAgent = request.headers.get("User-Agent") ?? "";
  const accept = request.headers.get("Accept") ?? "";

  if (accept.toLowerCase().includes("text/html") && !isSubscriptionClient(userAgent)) {
    return "html";
  }

  if (/happ/i.test(userAgent)) {
    return "plain";
  }

  return "base64";
}

function getHeader(headers: Record<string, string | string[] | undefined>, name: string) {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

async function getSubscriptionUserinfo(subId: string) {
  try {
    const subscription = await prisma.subscription.findFirst({
      orderBy: [{ expiresAt: "desc" }, { endsAt: "desc" }],
      select: {
        endsAt: true,
        expiresAt: true,
      },
      where: {
        status: "ACTIVE",
        subscriptionUrl: {
          endsWith: `/${subId}`,
        },
      },
    });

    const expiresAt = subscription?.expiresAt ?? subscription?.endsAt;
    if (!expiresAt) {
      return null;
    }

    return `upload=0; download=0; total=0; expire=${Math.floor(expiresAt.getTime() / 1000)}`;
  } catch {
    return null;
  }
}

function buildResponseHeaders(
  upstreamHeaders: Record<string, string | string[] | undefined>,
  subscriptionUserinfo: string | null
) {
  const headers = new Headers({
    "Cache-Control": "private, no-store, no-cache, max-age=0",
    "Content-Type": "text/plain; charset=utf-8",
    "Profile-Title": `base64:${Buffer.from(SUBSCRIPTION_PROFILE_NAME).toString("base64")}`,
  });

  const userinfo = subscriptionUserinfo ?? getHeader(upstreamHeaders, "subscription-userinfo");
  if (userinfo) {
    headers.set("Subscription-Userinfo", userinfo);
  }

  const updateInterval = getHeader(upstreamHeaders, "profile-update-interval");
  if (updateInterval) {
    headers.set("Profile-Update-Interval", updateInterval);
  }

  return headers;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseSubscriptionUserinfo(value: string | null) {
  if (!value) {
    return null;
  }

  const pairs = new Map<string, string>();
  for (const item of value.split(";")) {
    const [rawKey, rawValue] = item.split("=");
    const key = rawKey?.trim();
    const pairValue = rawValue?.trim();
    if (key && pairValue) {
      pairs.set(key, pairValue);
    }
  }

  return {
    download: Number.parseInt(pairs.get("download") ?? "0", 10) || 0,
    expire: Number.parseInt(pairs.get("expire") ?? "0", 10) || 0,
    total: Number.parseInt(pairs.get("total") ?? "0", 10) || 0,
    upload: Number.parseInt(pairs.get("upload") ?? "0", 10) || 0,
  };
}

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) {
    return "Без лимита";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatExpireDate(expireSeconds: number) {
  if (!expireSeconds) {
    return "Не указано";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(expireSeconds * 1000));
}

function getFirstVlessHost(subscriptionText: string) {
  const line = subscriptionText
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith("vless://"));

  if (!line) {
    return "Не указано";
  }

  try {
    const parsed = new URL(line);
    return `${parsed.hostname}:${parsed.port || "443"}`;
  } catch {
    return "Не указано";
  }
}

function buildPublicSubscriptionUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const pathSegments = requestUrl.pathname.split("/").filter(Boolean);
  const subId = pathSegments[pathSegments.length - 1];
  const configuredBaseUrl = process.env.XUI_SUBSCRIPTION_BASE_URL?.trim().replace(/\/+$/, "");

  if (configuredBaseUrl && subId) {
    return `${configuredBaseUrl}/${subId}`;
  }

  const forwardedHost = request.headers.get("X-Forwarded-Host") ?? request.headers.get("Host");
  const forwardedProto = request.headers.get("X-Forwarded-Proto") ?? requestUrl.protocol.replace(/:$/, "");

  if (forwardedHost) {
    requestUrl.host = forwardedHost
      .split(",")[0]!
      .trim()
      .replace(/:3000$/, "");
  } else {
    requestUrl.host = requestUrl.host.replace(/:3000$/, "");
  }

  if (forwardedProto) {
    requestUrl.protocol = `${forwardedProto.split(",")[0]!.trim()}:`;
  }

  requestUrl.search = "";
  requestUrl.hash = "";
  return requestUrl.toString();
}

function buildHtmlPage(input: {
  publicSubscriptionUrl: string;
  subId: string;
  subscriptionText: string;
  subscriptionUserinfo: string | null;
}) {
  const userinfo = parseSubscriptionUserinfo(input.subscriptionUserinfo);
  const usedTraffic =
    userinfo && userinfo.upload + userinfo.download > 0
      ? formatBytes(userinfo.upload + userinfo.download)
      : "0 B";
  const totalTraffic = userinfo ? formatBytes(userinfo.total) : "Без лимита";
  const expiresAt = userinfo ? formatExpireDate(userinfo.expire) : "Не указано";
  const server = getFirstVlessHost(input.subscriptionText);
  const plainUrl = `${input.publicSubscriptionUrl}?format=plain`;
  const base64Url = `${input.publicSubscriptionUrl}?format=base64`;
  const happUrl = `happ://add/${input.publicSubscriptionUrl}`;

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(SUBSCRIPTION_PROFILE_NAME)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #080a0f;
      --panel: #121722;
      --panel-soft: #171d2a;
      --text: #f5f7fb;
      --muted: #9aa4b2;
      --border: #283141;
      --accent: #68d8c0;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: radial-gradient(circle at 50% -20%, #1d2b3f 0, transparent 42%), var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      width: min(720px, calc(100% - 32px));
      margin: 0 auto;
      padding: 48px 0;
    }
    .panel {
      border: 1px solid var(--border);
      border-radius: 8px;
      background: color-mix(in srgb, var(--panel) 92%, transparent);
      box-shadow: 0 24px 80px rgba(0, 0, 0, .35);
      overflow: hidden;
    }
    header, section { padding: 24px; }
    header {
      border-bottom: 1px solid var(--border);
      background: var(--panel-soft);
    }
    .eyebrow {
      margin: 0 0 8px;
      color: var(--accent);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font-size: clamp(26px, 4vw, 40px);
      line-height: 1.1;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .metric {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: rgba(255, 255, 255, .03);
      padding: 14px;
    }
    .label {
      margin: 0 0 6px;
      color: var(--muted);
      font-size: 13px;
    }
    .value {
      margin: 0;
      overflow-wrap: anywhere;
      font-size: 16px;
      font-weight: 700;
    }
    .linkbox {
      display: grid;
      gap: 10px;
      margin-top: 18px;
    }
    input {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #090c12;
      color: var(--text);
      font: inherit;
      padding: 13px 14px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    a, button {
      min-height: 42px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #1c2432;
      color: var(--text);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font: inherit;
      font-weight: 700;
      padding: 0 14px;
      text-decoration: none;
    }
    button.primary, a.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #07100e;
    }
    .hint {
      margin: 14px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }
    @media (max-width: 560px) {
      main { width: min(100% - 20px, 720px); padding: 20px 0; }
      header, section { padding: 18px; }
      .grid { grid-template-columns: 1fr; }
      a, button { width: 100%; }
    }
  </style>
</head>
<body>
  <main>
    <article class="panel">
      <header>
        <p class="eyebrow">PulsarVPN</p>
        <h1>Подписка активна</h1>
      </header>
      <section>
        <div class="grid">
          <div class="metric">
            <p class="label">Профиль</p>
            <p class="value">${escapeHtml(SUBSCRIPTION_PROFILE_NAME)}</p>
          </div>
          <div class="metric">
            <p class="label">Сервер</p>
            <p class="value">${escapeHtml(server)}</p>
          </div>
          <div class="metric">
            <p class="label">Действует до</p>
            <p class="value">${escapeHtml(expiresAt)}</p>
          </div>
          <div class="metric">
            <p class="label">Трафик</p>
            <p class="value">${escapeHtml(usedTraffic)} / ${escapeHtml(totalTraffic)}</p>
          </div>
        </div>
        <div class="linkbox">
          <input id="subscription-url" readonly value="${escapeHtml(input.publicSubscriptionUrl)}" />
          <div class="actions">
            <a class="primary" href="${escapeHtml(happUrl)}">Подключить в Happ</a>
            <button class="primary" id="copy-button" type="button">Скопировать ссылку</button>
            <a href="${escapeHtml(plainUrl)}">Plain</a>
            <a href="${escapeHtml(base64Url)}">Base64</a>
          </div>
        </div>
        <p class="hint">ID: ${escapeHtml(input.subId)}</p>
      </section>
    </article>
  </main>
  <script>
    const button = document.getElementById("copy-button");
    const input = document.getElementById("subscription-url");
    button?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(input.value);
        button.textContent = "Ссылка скопирована";
      } catch {
        input.select();
        document.execCommand("copy");
        button.textContent = "Ссылка скопирована";
      }
      window.setTimeout(() => {
        button.textContent = "Скопировать ссылку";
      }, 1800);
    });
  </script>
</body>
</html>`;
}

export async function GET(request: Request, context: { params: Promise<{ subId: string }> }) {
  const { subId } = await context.params;
  const safeSubId = subId.trim();

  if (!/^[A-Za-z0-9_-]{6,128}$/.test(safeSubId)) {
    return new Response("Invalid subscription id.", { status: 400 });
  }

  let subscriptionText: string;

  try {
    subscriptionText = rewriteSubscription(await fetchSubscriptionLinks(safeSubId));
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Unable to load subscription links.",
      { status: 502 }
    );
  }

  const subscriptionUserinfo = await getSubscriptionUserinfo(safeSubId);
  const responseHeaders = buildResponseHeaders({}, subscriptionUserinfo);
  const responseFormat = resolveResponseFormat(request);

  if (responseFormat === "html") {
    responseHeaders.set("Content-Type", "text/html; charset=utf-8");
    return new Response(
      buildHtmlPage({
        publicSubscriptionUrl: buildPublicSubscriptionUrl(request),
        subId: safeSubId,
        subscriptionText,
        subscriptionUserinfo,
      }),
      {
        headers: responseHeaders,
      }
    );
  }

  if (responseFormat === "base64") {
    return new Response(encodeSubscription(subscriptionText), {
      headers: responseHeaders,
    });
  }

  return new Response(subscriptionText, {
    headers: responseHeaders,
  });
}
