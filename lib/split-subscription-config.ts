import http from "node:http";
import https from "node:https";

type VlessProfile = {
  flow: string;
  host: string;
  name: string;
  port: number;
  publicKey: string;
  shortId: string;
  spiderX: string;
  sni: string;
  uuid: string;
  fingerprint: string;
};

const RU_DOMAIN_RULES = ["geosite:ru", "domain:vk.com", "domain:yandex.ru", "domain:gosuslugi.ru"];
const RU_IP_RULES = ["geoip:ru", "geoip:private"];
const SING_BOX_RU_DOMAINS = ["vk.com", "yandex.ru", "gosuslugi.ru"];
const SING_BOX_RU_DOMAIN_SUFFIXES = ["ru", "su", "рф", "vk.com", "yandex.ru", "gosuslugi.ru"];

function getUpstreamBaseUrl() {
  return (
    process.env.XUI_SUBSCRIPTION_UPSTREAM_BASE_URL?.trim().replace(/\/+$/, "") ||
    "http://127.0.0.1:8080/sub"
  );
}

function getUpstreamHost() {
  return process.env.XUI_SUBSCRIPTION_UPSTREAM_HOST?.trim() || "sub.1pulsar.space";
}

function getFirstSubscriptionLine(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("vless://")) {
    return trimmed.split(/\r?\n/).find((line) => line.startsWith("vless://")) ?? "";
  }

  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    return decoded.split(/\r?\n/).find((line) => line.startsWith("vless://")) ?? "";
  } catch {
    return "";
  }
}

function fetchText(url: string, headers: Record<string, string>) {
  return new Promise<{ body: string; status: number }>((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;
    const request = client.request(
      parsed,
      {
        headers,
        method: "GET",
        timeout: 15_000,
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            status: response.statusCode ?? 0,
          });
        });
      }
    );

    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy(new Error("Upstream subscription request timed out."));
    });
    request.end();
  });
}

function parseVlessProfile(uri: string): VlessProfile {
  const parsed = new URL(uri);
  const port = Number.parseInt(parsed.port || "443", 10);

  if (parsed.protocol !== "vless:" || !parsed.username || !parsed.hostname || !Number.isFinite(port)) {
    throw new Error("Unsupported subscription payload.");
  }

  const params = parsed.searchParams;

  return {
    fingerprint: params.get("fp") || "chrome",
    flow: params.get("flow") || "xtls-rprx-vision",
    host: parsed.hostname,
    name: decodeURIComponent(parsed.hash.replace(/^#/, "")) || "PulsarVPN REALITY",
    port,
    publicKey: params.get("pbk") || "",
    shortId: params.get("sid") || "",
    spiderX: params.get("spx") || "/",
    sni: params.get("sni") || parsed.hostname,
    uuid: parsed.username,
  };
}

export async function loadVlessProfile(subId: string) {
  const safeSubId = subId.trim();
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(safeSubId)) {
    throw new Error("Invalid subscription id.");
  }

  const response = await fetchText(`${getUpstreamBaseUrl()}/${safeSubId}`, {
      Host: getUpstreamHost(),
      "User-Agent": "PulsarVPN split-subscription/1.0",
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Upstream subscription returned ${response.status}.`);
  }

  const line = getFirstSubscriptionLine(response.body);
  if (!line) {
    throw new Error("Upstream subscription does not contain a VLESS profile.");
  }

  return parseVlessProfile(line);
}

export function buildXraySplitConfig(profile: VlessProfile) {
  return {
    dns: {
      queryStrategy: "UseIPv4",
      servers: ["1.1.1.1", "8.8.8.8"],
    },
    inbounds: [
      {
        listen: "127.0.0.1",
        port: 10808,
        protocol: "socks",
        settings: { udp: true },
        tag: "socks-in",
      },
      {
        listen: "127.0.0.1",
        port: 10809,
        protocol: "http",
        tag: "http-in",
      },
    ],
    log: { loglevel: "warning" },
    outbounds: [
      {
        protocol: "vless",
        settings: {
          vnext: [
            {
              address: profile.host,
              port: profile.port,
              users: [
                {
                  encryption: "none",
                  flow: profile.flow,
                  id: profile.uuid,
                },
              ],
            },
          ],
        },
        streamSettings: {
          network: "tcp",
          realitySettings: {
            fingerprint: profile.fingerprint,
            publicKey: profile.publicKey,
            serverName: profile.sni,
            shortId: profile.shortId,
            spiderX: profile.spiderX,
          },
          security: "reality",
          tcpSettings: { header: { type: "none" } },
        },
        tag: "proxy",
      },
      { protocol: "freedom", tag: "direct" },
      { protocol: "blackhole", tag: "block" },
    ],
    routing: {
      domainStrategy: "IPIfNonMatch",
      rules: [
        { domain: RU_DOMAIN_RULES, outboundTag: "direct", type: "field" },
        { ip: RU_IP_RULES, outboundTag: "direct", type: "field" },
      ],
    },
  };
}

export function buildSingBoxSplitConfig(profile: VlessProfile) {
  return {
    dns: {
      final: "cloudflare",
      servers: [
        { address: "https://1.1.1.1/dns-query", detour: "proxy", tag: "cloudflare" },
        { address: "local", detour: "direct", tag: "local" },
      ],
    },
    inbounds: [
      {
        listen: "127.0.0.1",
        listen_port: 2080,
        sniff: true,
        tag: "mixed-in",
        type: "mixed",
      },
    ],
    log: { level: "warn" },
    outbounds: [
      {
        flow: profile.flow,
        packet_encoding: "xudp",
        server: profile.host,
        server_port: profile.port,
        tag: "proxy",
        tls: {
          enabled: true,
          reality: {
            enabled: true,
            public_key: profile.publicKey,
            short_id: profile.shortId,
          },
          server_name: profile.sni,
          utls: {
            enabled: true,
            fingerprint: profile.fingerprint,
          },
        },
        type: "vless",
        uuid: profile.uuid,
      },
      { tag: "direct", type: "direct" },
      { tag: "block", type: "block" },
    ],
    route: {
      auto_detect_interface: true,
      final: "proxy",
      rule_set: [
        {
          download_detour: "proxy",
          format: "binary",
          tag: "geosite-ru",
          type: "remote",
          url: "https://github.com/SagerNet/sing-geosite/raw/rule-set/geosite-ru.srs",
        },
        {
          download_detour: "proxy",
          format: "binary",
          tag: "geoip-ru",
          type: "remote",
          url: "https://github.com/SagerNet/sing-geoip/raw/rule-set/geoip-ru.srs",
        },
      ],
      rules: [
        {
          domain: SING_BOX_RU_DOMAINS,
          domain_suffix: SING_BOX_RU_DOMAIN_SUFFIXES,
          outbound: "direct",
        },
        {
          outbound: "direct",
          rule_set: ["geosite-ru", "geoip-ru"],
        },
      ],
    },
  };
}
