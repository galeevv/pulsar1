import { createHash, randomBytes, randomUUID } from "node:crypto";

import { XuiConfig, getXuiConfig } from "./config";
import { XuiHttpClient } from "./http-client";
import { XuiAdapter, XuiUserSummary, XuiUserStatus } from "./types";

type XuiDefaultSettingsResponse = {
  subURI?: string;
};

type XuiManagedRole = "primary" | "backup";

type XuiManagedInboundDefinition = {
  altEmails: string[];
  email: string;
  inboundId: number;
  role: XuiManagedRole;
};

type XuiManagedInboundState = XuiManagedInboundDefinition & {
  client: XuiInboundClient | null;
  inbound: XuiInboundResponse;
  index: number;
  settings: XuiInboundSettings;
};

type XuiInboundClient = {
  comment?: string;
  created_at?: number;
  email?: string;
  enable?: boolean;
  expiryTime?: number;
  flow?: string;
  id?: string;
  limitIp?: number;
  password?: string;
  reset?: number;
  subId?: string;
  tgId?: string;
  totalGB?: number;
  updated_at?: number;
};

type XuiInboundSettings = {
  clients?: XuiInboundClient[];
  [key: string]: unknown;
};

type XuiInboundResponse = {
  allTime?: number;
  down?: number;
  enable?: boolean;
  expiryTime?: number;
  id: number;
  lastTrafficResetTime?: number;
  listen?: string;
  port?: number;
  protocol?: string;
  remark?: string;
  settings?: string;
  sniffing?: string;
  streamSettings?: string;
  tag?: string;
  total?: number;
  trafficReset?: string;
  up?: number;
};

type XuiUserMutationInput = {
  dataLimitBytes?: number | null;
  expireAt?: Date | null;
  limitIp?: number | null;
  note?: string | null;
  status?: XuiUserStatus;
  username: string;
};

function dateToExpiryMs(date: Date | null | undefined) {
  if (!date) {
    return 0;
  }

  return Math.max(0, date.getTime());
}

function bytesToTotalGb(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) {
    return 0;
  }

  return Math.ceil(bytes / (1024 * 1024 * 1024));
}

function normalizeLimitIp(limitIp: number | null | undefined) {
  if (typeof limitIp === "undefined") {
    return undefined;
  }

  if (limitIp === null) {
    return 0;
  }

  const normalized = Math.floor(limitIp);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function enabledFromStatus(status: XuiUserStatus | undefined) {
  if (!status) {
    return undefined;
  }

  return status === "active";
}

function normalizeSubscriptionBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function buildSubscriptionUrl(baseUrl: string | null, subId?: string) {
  if (!baseUrl || !subId) {
    return null;
  }

  return `${normalizeSubscriptionBaseUrl(baseUrl)}/${subId}`;
}

function parseInboundSettings(raw: string | undefined) {
  if (!raw) {
    return { clients: [] } satisfies XuiInboundSettings;
  }

  try {
    const parsed = JSON.parse(raw) as XuiInboundSettings;
    return {
      ...parsed,
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
    };
  } catch {
    return { clients: [] } satisfies XuiInboundSettings;
  }
}

function getClientIdentifier(protocol: string | undefined, client: XuiInboundClient) {
  const normalizedProtocol = (protocol ?? "").toLowerCase();

  if (normalizedProtocol === "trojan" || normalizedProtocol === "shadowsocks") {
    return client.password || client.email || "";
  }

  return client.id || client.email || "";
}

function buildSubId() {
  const base = randomBytes(12).toString("base64url").toLowerCase();
  const normalized = base.replace(/[^a-z0-9]/g, "");
  return normalized.slice(0, 16).padEnd(16, "0");
}

function normalizeEmail(email: string) {
  const normalized = email
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const candidate = normalized || "pulsar";
  return candidate.slice(0, 32);
}

function buildSuffixedEmail(baseEmail: string, suffix: string) {
  const base = normalizeEmail(baseEmail);

  if (base.length + suffix.length <= 32) {
    return `${base}${suffix}`;
  }

  const hash = createHash("sha1")
    .update(`${base}:${suffix}`)
    .digest("hex")
    .slice(0, 4);
  const compositeSuffix = `${suffix}${hash}`;
  const maxBaseLength = Math.max(3, 32 - compositeSuffix.length);

  return `${base.slice(0, maxBaseLength)}${compositeSuffix}`;
}

function deriveManagedEmails(input: { hasBackup: boolean; username: string }) {
  const baseEmail = normalizeEmail(input.username);

  if (!input.hasBackup) {
    return {
      backupEmail: null,
      primaryAltEmails: [] as string[],
      primaryEmail: baseEmail,
    };
  }

  return {
    backupEmail: baseEmail,
    primaryAltEmails: [baseEmail],
    primaryEmail: buildSuffixedEmail(baseEmail, "_r"),
  };
}

export class HttpXuiAdapter implements XuiAdapter {
  private readonly client: XuiHttpClient;
  private readonly config: XuiConfig;
  private subscriptionBaseUrlCache: {
    fetchedAt: number;
    value: string | null;
  } | null = null;

  constructor(config: XuiConfig) {
    this.config = config;
    this.client = new XuiHttpClient(config);
  }

  private get hasBackupInbound() {
    return Boolean(this.config.backupInboundId);
  }

  private getManagedInboundDefinitions(username: string): XuiManagedInboundDefinition[] {
    const emails = deriveManagedEmails({
      hasBackup: this.hasBackupInbound,
      username,
    });

    const primary: XuiManagedInboundDefinition = {
      altEmails: emails.primaryAltEmails,
      email: emails.primaryEmail,
      inboundId: this.config.primaryInboundId,
      role: "primary",
    };

    if (!this.config.backupInboundId || !emails.backupEmail) {
      return [primary];
    }

    return [
      primary,
      {
        altEmails: [buildSuffixedEmail(emails.backupEmail, "_b")],
        email: emails.backupEmail,
        inboundId: this.config.backupInboundId,
        role: "backup",
      },
    ];
  }

  private async getInbound(inboundId: number) {
    const inbound = await this.client.apiGet<XuiInboundResponse>(`inbounds/get/${inboundId}`);

    if (!inbound?.id) {
      throw new Error(`x-ui inbound #${inboundId} was not found.`);
    }

    return inbound;
  }

  private async findManagedInboundStates(username: string): Promise<XuiManagedInboundState[]> {
    const definitions = this.getManagedInboundDefinitions(username);

    return Promise.all(
      definitions.map(async (definition) => {
        const inbound = await this.getInbound(definition.inboundId);
        const settings = parseInboundSettings(inbound.settings);
        const clients = settings.clients ?? [];

        let index = clients.findIndex((client) => client?.email === definition.email);
        if (index < 0 && definition.altEmails.length > 0) {
          index = clients.findIndex((client) =>
            definition.altEmails.includes(client?.email ?? "")
          );
        }

        return {
          ...definition,
          client: index >= 0 ? clients[index] : null,
          inbound,
          index,
          settings,
        };
      })
    );
  }

  private async getSubscriptionBaseUrl() {
    if (this.config.subscriptionBaseUrl) {
      return normalizeSubscriptionBaseUrl(this.config.subscriptionBaseUrl);
    }

    const now = Date.now();
    if (this.subscriptionBaseUrlCache && now - this.subscriptionBaseUrlCache.fetchedAt < 60_000) {
      return this.subscriptionBaseUrlCache.value;
    }

    const defaults = await this.client.panelPost<XuiDefaultSettingsResponse>("setting/defaultSettings");
    const fromPanel = defaults?.subURI?.trim() ? normalizeSubscriptionBaseUrl(defaults.subURI.trim()) : null;

    this.subscriptionBaseUrlCache = {
      fetchedAt: now,
      value: fromPanel,
    };

    return fromPanel;
  }

  private async updateInbound(input: { inbound: XuiInboundResponse; settings: XuiInboundSettings }) {
    const inbound = input.inbound;
    const payload = {
      allTime: inbound.allTime ?? 0,
      down: inbound.down ?? 0,
      enable: inbound.enable ?? true,
      expiryTime: inbound.expiryTime ?? 0,
      lastTrafficResetTime: inbound.lastTrafficResetTime ?? 0,
      listen: inbound.listen ?? "",
      port: inbound.port ?? 0,
      protocol: inbound.protocol ?? "",
      remark: inbound.remark ?? "",
      settings: JSON.stringify(input.settings),
      sniffing: inbound.sniffing ?? "{}",
      streamSettings: inbound.streamSettings ?? "{}",
      tag: inbound.tag ?? "",
      total: inbound.total ?? 0,
      trafficReset: inbound.trafficReset ?? "never",
      up: inbound.up ?? 0,
    };

    await this.client.apiPost<XuiInboundResponse>(`inbounds/update/${inbound.id}`, payload);
  }

  private buildNewClient(input: {
    email: string;
    sharedSubId: string;
    mutation: XuiUserMutationInput;
  }) {
    const enabled = enabledFromStatus(input.mutation.status) ?? true;

    return {
      comment: input.mutation.note ?? "",
      created_at: Date.now(),
      email: input.email,
      enable: enabled,
      expiryTime: dateToExpiryMs(input.mutation.expireAt),
      flow: this.config.clientFlow,
      id: randomUUID(),
      limitIp: normalizeLimitIp(input.mutation.limitIp) ?? 0,
      reset: 0,
      subId: input.sharedSubId,
      tgId: "",
      totalGB: bytesToTotalGb(input.mutation.dataLimitBytes),
      updated_at: Date.now(),
    } satisfies XuiInboundClient;
  }

  private patchExistingClient(input: {
    client: XuiInboundClient;
    email: string;
    mutation: XuiUserMutationInput;
    sharedSubId: string;
  }) {
    const next = { ...input.client };
    const nextEnabled = enabledFromStatus(input.mutation.status);

    if (typeof nextEnabled === "boolean") {
      next.enable = nextEnabled;
    }

    if (typeof input.mutation.expireAt !== "undefined") {
      next.expiryTime = dateToExpiryMs(input.mutation.expireAt);
    }

    if (typeof input.mutation.dataLimitBytes !== "undefined") {
      next.totalGB = bytesToTotalGb(input.mutation.dataLimitBytes);
    }

    if (typeof input.mutation.note !== "undefined") {
      next.comment = input.mutation.note ?? "";
    }

    if (typeof input.mutation.limitIp !== "undefined") {
      next.limitIp = normalizeLimitIp(input.mutation.limitIp) ?? 0;
    }

    next.email = next.email || input.email;
    next.flow = next.flow || this.config.clientFlow;
    next.id = next.id || randomUUID();
    next.limitIp = typeof next.limitIp === "number" ? next.limitIp : 0;
    next.reset = typeof next.reset === "number" ? next.reset : 0;
    next.subId = input.sharedSubId;
    next.tgId = next.tgId ?? "";
    next.created_at = typeof next.created_at === "number" ? next.created_at : Date.now();
    next.updated_at = Date.now();

    return next;
  }

  private async buildSummary(username: string, states: XuiManagedInboundState[]) {
    const existingStates = states.filter((state) => state.client);
    if (existingStates.length === 0) {
      return null;
    }

    const sharedSubId = existingStates.find((state) => state.client?.subId)?.client?.subId;
    const hasEnabledClient = existingStates.some((state) => state.client?.enable !== false);

    return {
      raw: {
        inbounds: states.map((state) => ({
          client: state.client,
          email: state.client?.email ?? state.email,
          inboundId: state.inbound.id,
          role: state.role,
        })),
      },
      status: hasEnabledClient ? "active" : "disabled",
      subscriptionUrl: buildSubscriptionUrl(await this.getSubscriptionBaseUrl(), sharedSubId),
      username,
    } satisfies XuiUserSummary;
  }

  private async upsertManagedClients(
    mutation: XuiUserMutationInput,
    options: { requireExisting: boolean }
  ) {
    const states = await this.findManagedInboundStates(mutation.username);
    const existingStates = states.filter((state) => state.client);

    if (options.requireExisting && existingStates.length === 0) {
      throw new Error(`x-ui client "${mutation.username}" was not found.`);
    }

    const sharedSubId =
      existingStates.find((state) => state.client?.subId)?.client?.subId ?? buildSubId();

    for (const state of states) {
      if (state.client && state.index >= 0) {
        const clients = state.settings.clients ?? [];
        const nextClient = this.patchExistingClient({
          client: state.client,
          email: state.email,
          mutation,
          sharedSubId,
        });

        clients[state.index] = nextClient;
        state.settings.clients = clients;
        await this.updateInbound({
          inbound: state.inbound,
          settings: state.settings,
        });
        state.client = nextClient;
        continue;
      }

      if (!options.requireExisting && state.role !== "primary") {
        // For new users, secondary nodes are created immediately after primary.
        // Keep this branch explicit to avoid silent skips during future refactors.
      }

      const client = this.buildNewClient({
        email: state.email,
        mutation,
        sharedSubId,
      });

      await this.client.apiPost<null>("inbounds/addClient", {
        id: state.inbound.id,
        settings: JSON.stringify({ clients: [client] }),
      });
      state.client = client;
    }

    const summary = await this.getVpnUser(mutation.username);
    if (!summary) {
      throw new Error(`x-ui client "${mutation.username}" disappeared after update.`);
    }

    return summary;
  }

  async healthCheck() {
    await this.getInbound(this.config.primaryInboundId);
    if (this.config.backupInboundId) {
      await this.getInbound(this.config.backupInboundId);
    }
  }

  async createVpnUser(input: {
    username: string;
    expireAt?: Date | null;
    dataLimitBytes?: number | null;
    limitIp?: number | null;
    note?: string | null;
    status?: XuiUserStatus;
  }) {
    return this.upsertManagedClients(
      {
        dataLimitBytes: input.dataLimitBytes,
        expireAt: input.expireAt,
        limitIp: input.limitIp,
        note: input.note,
        status: input.status,
        username: input.username,
      },
      { requireExisting: false }
    );
  }

  async getVpnUser(username: string) {
    const states = await this.findManagedInboundStates(username);
    return this.buildSummary(username, states);
  }

  async updateVpnUser(input: {
    username: string;
    expireAt?: Date | null;
    dataLimitBytes?: number | null;
    limitIp?: number | null;
    status?: XuiUserStatus;
    note?: string | null;
  }) {
    return this.upsertManagedClients(
      {
        dataLimitBytes: input.dataLimitBytes,
        expireAt: input.expireAt,
        limitIp: input.limitIp,
        note: input.note,
        status: input.status,
        username: input.username,
      },
      { requireExisting: true }
    );
  }

  async revokeVpnUser(username: string) {
    const states = await this.findManagedInboundStates(username);

    for (const state of states) {
      if (!state.client) {
        continue;
      }

      const clientId = getClientIdentifier(state.inbound.protocol, state.client);
      if (!clientId) {
        continue;
      }

      await this.client.apiPost<null>(
        `inbounds/${state.inbound.id}/delClient/${encodeURIComponent(clientId)}`
      );
    }
  }

  async getSubscriptionUrl(username: string) {
    const user = await this.getVpnUser(username);
    return user?.subscriptionUrl ?? null;
  }

  async syncVpnUser(username: string) {
    return this.getVpnUser(username);
  }
}

class MockXuiAdapter implements XuiAdapter {
  async healthCheck() {}

  async createVpnUser(input: {
    username: string;
    expireAt?: Date | null;
    dataLimitBytes?: number | null;
    limitIp?: number | null;
    note?: string | null;
    status?: XuiUserStatus;
  }) {
    return {
      raw: { mode: "mock", ...input },
      status: input.status ?? "active",
      subscriptionUrl: `https://mock.local/sub/${input.username}`,
      username: input.username,
    };
  }

  async getVpnUser(username: string) {
    return {
      raw: { mode: "mock", username },
      status: "active",
      subscriptionUrl: `https://mock.local/sub/${username}`,
      username,
    };
  }

  async updateVpnUser(input: {
    username: string;
    expireAt?: Date | null;
    dataLimitBytes?: number | null;
    limitIp?: number | null;
    status?: XuiUserStatus;
    note?: string | null;
  }) {
    return {
      raw: { mode: "mock", ...input },
      status: input.status ?? "active",
      subscriptionUrl: `https://mock.local/sub/${input.username}`,
      username: input.username,
    };
  }

  async revokeVpnUser(username: string) {
    void username;
  }

  async getSubscriptionUrl(username: string) {
    return `https://mock.local/sub/${username}`;
  }

  async syncVpnUser(username: string) {
    return this.getVpnUser(username);
  }
}

let cachedAdapter: XuiAdapter | null = null;

export function getXuiAdapter(): XuiAdapter {
  if (cachedAdapter) {
    return cachedAdapter;
  }

  try {
    const config = getXuiConfig();
    cachedAdapter = new HttpXuiAdapter(config);
    return cachedAdapter;
  } catch (error) {
    const fallbackEnabled =
      process.env.XUI_ENABLE_MOCK_FALLBACK?.toLowerCase() === "true" ||
      process.env.MARZBAN_ENABLE_MOCK_FALLBACK?.toLowerCase() === "true";

    if (!fallbackEnabled) {
      throw error;
    }

    cachedAdapter = new MockXuiAdapter();
    return cachedAdapter;
  }
}
