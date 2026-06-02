import { createHash, randomBytes, randomUUID } from "node:crypto";

import { XuiConfig, getXuiConfig } from "./config";
import { XuiHttpClient, XuiHttpError } from "./http-client";
import { XuiAdapter, XuiUserSummary, XuiUserStatus } from "./types";

type XuiDefaultSettingsResponse = {
  subURI?: string;
};

type XuiManagedRole = "primary" | "secondary" | "backup";

type XuiManagedInboundDefinition = {
  altEmails: string[];
  email: string;
  inboundId: number;
  role: XuiManagedRole;
};

type XuiManagedInboundState = XuiManagedInboundDefinition & {
  client: XuiInboundClient | null;
  inbound: XuiInboundResponse;
  inboundIds: number[];
  index: number;
  settings: XuiInboundSettings;
};

type XuiUnifiedManagedState = {
  client: XuiInboundClient | null;
  email: string;
  inboundIds: number[];
  inbounds: XuiInboundResponse[];
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
  tgId?: number | string;
  totalGB?: number;
  updated_at?: number;
  uuid?: string;
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
  settings?: string | XuiInboundSettings;
  sniffing?: string | Record<string, unknown>;
  streamSettings?: string | Record<string, unknown>;
  tag?: string;
  total?: number;
  trafficReset?: string;
  up?: number;
};

type XuiClientRecord = {
  auth?: string;
  comment?: string | null;
  createdAt?: number;
  email: string;
  enable?: boolean;
  expiryTime?: number;
  flow?: string;
  groupName?: string;
  id?: number;
  inboundIds?: number[];
  limitIp?: number;
  password?: string;
  reset?: number;
  reverse?: unknown;
  security?: string;
  subId?: string;
  tgId?: number | string | null;
  totalGB?: number;
  updatedAt?: number;
  uuid?: string;
};

type XuiClientGetResponse = {
  client?: XuiClientRecord | null;
  inboundIds?: number[];
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

function bytesToTotalBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) {
    return 0;
  }

  return Math.ceil(bytes);
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

function parseInboundSettings(raw: string | XuiInboundSettings | undefined) {
  if (!raw) {
    return { clients: [] } satisfies XuiInboundSettings;
  }

  if (typeof raw !== "string") {
    return {
      ...raw,
      clients: Array.isArray(raw.clients) ? raw.clients : [],
    };
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

function isXuiRecordNotFoundError(error: unknown) {
  return (
    error instanceof XuiHttpError &&
    error.status === 200 &&
    /record not found/i.test(error.responseBody)
  );
}

function toInboundClient(record: XuiClientRecord, fallback?: XuiInboundClient | null): XuiInboundClient {
  return {
    comment: record.comment ?? fallback?.comment ?? "",
    email: record.email,
    enable: record.enable ?? fallback?.enable,
    expiryTime: record.expiryTime ?? fallback?.expiryTime,
    flow: record.flow || fallback?.flow,
    id: record.uuid || fallback?.uuid || fallback?.id || record.password || fallback?.password || record.email,
    limitIp: record.limitIp ?? fallback?.limitIp,
    password: record.password ?? fallback?.password,
    reset: record.reset ?? fallback?.reset,
    subId: record.subId || fallback?.subId,
    tgId: record.tgId ?? fallback?.tgId ?? 0,
    totalGB: record.totalGB ?? fallback?.totalGB,
    uuid: record.uuid || fallback?.uuid,
  };
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

  private get hasUnifiedManagedInbounds() {
    return this.config.managedInboundIds.length > 0;
  }

  private get allUnifiedManagedInboundIds() {
    return this.config.managedInboundIds;
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

  private async getClientRecord(email: string) {
    try {
      const response = await this.client.apiGet<XuiClientGetResponse>(
        `clients/get/${encodeURIComponent(email)}`
      );
      const client = response?.client;

      if (!client?.email) {
        return null;
      }

      return {
        client,
        inboundIds: Array.isArray(response.inboundIds) ? response.inboundIds : [],
      };
    } catch (error) {
      if (isXuiRecordNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  private async findClientRecord(definition: XuiManagedInboundDefinition) {
    for (const email of [definition.email, ...definition.altEmails]) {
      const record = await this.getClientRecord(email);

      if (!record) {
        continue;
      }

      if (!record.inboundIds.includes(definition.inboundId)) {
        continue;
      }

      return record;
    }

    return null;
  }

  private async getUnifiedManagedState(username: string): Promise<XuiUnifiedManagedState> {
    const email = normalizeEmail(username);
    const inbounds = await Promise.all(
      this.allUnifiedManagedInboundIds.map((inboundId) => this.getInbound(inboundId))
    );
    const clientRecord = await this.getClientRecord(email);
    let client = clientRecord?.client ? toInboundClient(clientRecord.client) : null;
    let inboundIds = clientRecord?.inboundIds ?? [];

    if (!client) {
      for (const inbound of inbounds) {
        const settings = parseInboundSettings(inbound.settings);
        const settingsClient = settings.clients?.find((item) => item.email === email) ?? null;

        if (settingsClient) {
          client = settingsClient;
          inboundIds = [inbound.id];
          break;
        }
      }
    }

    return {
      client,
      email,
      inboundIds,
      inbounds,
    };
  }

  private async findManagedInboundStates(username: string): Promise<XuiManagedInboundState[]> {
    const definitions = this.getManagedInboundDefinitions(username);

    return Promise.all(
      definitions.map(async (definition) => {
        const inbound = await this.getInbound(definition.inboundId);
        const settings = parseInboundSettings(inbound.settings);
        const clients = settings.clients ?? [];
        const clientRecord = await this.findClientRecord(definition);

        let index = clients.findIndex((client) => client?.email === definition.email);
        if (index < 0 && definition.altEmails.length > 0) {
          index = clients.findIndex((client) =>
            definition.altEmails.includes(client?.email ?? "")
          );
        }

        const settingsClient = index >= 0 ? clients[index] : null;

        return {
          ...definition,
          client: clientRecord?.client
            ? toInboundClient(clientRecord.client, settingsClient)
            : settingsClient,
          inbound,
          inboundIds: clientRecord?.inboundIds ?? (index >= 0 ? [definition.inboundId] : []),
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
      tgId: 0,
      totalGB: bytesToTotalBytes(input.mutation.dataLimitBytes),
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
      next.totalGB = bytesToTotalBytes(input.mutation.dataLimitBytes);
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
    next.tgId = next.tgId ?? 0;
    next.created_at = typeof next.created_at === "number" ? next.created_at : Date.now();
    next.updated_at = Date.now();

    return next;
  }

  private buildClientPayload(client: XuiInboundClient) {
    const uuid = client.uuid || client.id || randomUUID();
    return {
      comment: client.comment ?? "",
      email: client.email ?? "",
      enable: client.enable ?? true,
      expiryTime: client.expiryTime ?? 0,
      flow: client.flow || this.config.clientFlow,
      id: uuid,
      limitIp: typeof client.limitIp === "number" ? client.limitIp : 0,
      reset: typeof client.reset === "number" ? client.reset : 0,
      subId: client.subId ?? buildSubId(),
      tgId: typeof client.tgId === "number" ? client.tgId : 0,
      totalGB: typeof client.totalGB === "number" ? client.totalGB : 0,
      uuid,
    };
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

  private async buildUnifiedSummary(username: string, state: XuiUnifiedManagedState) {
    if (!state.client) {
      return null;
    }

    return {
      raw: {
        client: state.client,
        email: state.client.email ?? state.email,
        inboundIds: state.inboundIds,
        inbounds: state.inbounds.map((inbound) => ({
          id: inbound.id,
          port: inbound.port,
          remark: inbound.remark,
          tag: inbound.tag,
        })),
        mode: "unified-managed-inbounds",
      },
      status: state.client.enable === false ? "disabled" : "active",
      subscriptionUrl: buildSubscriptionUrl(await this.getSubscriptionBaseUrl(), state.client.subId),
      username,
    } satisfies XuiUserSummary;
  }

  private async upsertUnifiedManagedClient(
    mutation: XuiUserMutationInput,
    options: { requireExisting: boolean }
  ) {
    const state = await this.getUnifiedManagedState(mutation.username);

    if (options.requireExisting && !state.client) {
      throw new Error(`x-ui client "${mutation.username}" was not found.`);
    }

    const sharedSubId = state.client?.subId ?? buildSubId();
    const inboundIds = this.allUnifiedManagedInboundIds;

    if (state.client) {
      const currentEmail = state.client.email || state.email;
      const nextClient = this.patchExistingClient({
        client: state.client,
        email: state.email,
        mutation,
        sharedSubId,
      });

      await this.client.apiPostJson<null>(
        `clients/update/${encodeURIComponent(currentEmail)}`,
        this.buildClientPayload(nextClient)
      );

      const attached = new Set(state.inboundIds);
      const missingInboundIds = inboundIds.filter((inboundId) => !attached.has(inboundId));

      if (missingInboundIds.length > 0) {
        await this.client.apiPostJson<null>(
          `clients/${encodeURIComponent(nextClient.email ?? state.email)}/attach`,
          { inboundIds: missingInboundIds }
        );
      }
    } else {
      const client = this.buildNewClient({
        email: state.email,
        mutation,
        sharedSubId,
      });

      await this.client.apiPostJson<null>("clients/add", {
        client: this.buildClientPayload(client),
        inboundIds,
      });
    }

    const summary = await this.getVpnUser(mutation.username);
    if (!summary) {
      throw new Error(`x-ui client "${mutation.username}" disappeared after update.`);
    }

    return summary;
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
      if (state.client) {
        const currentEmail = state.client.email || state.email;
        const nextClient = this.patchExistingClient({
          client: state.client,
          email: state.email,
          mutation,
          sharedSubId,
        });

        await this.client.apiPostJson<null>(
          `clients/update/${encodeURIComponent(currentEmail)}`,
          this.buildClientPayload(nextClient)
        );
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

      await this.client.apiPostJson<null>("clients/add", {
        client: this.buildClientPayload(client),
        inboundIds: [state.inbound.id],
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
    if (this.hasUnifiedManagedInbounds) {
      await Promise.all(this.allUnifiedManagedInboundIds.map((inboundId) => this.getInbound(inboundId)));
      return;
    }

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
    if (this.hasUnifiedManagedInbounds) {
      return this.upsertUnifiedManagedClient(
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
    if (this.hasUnifiedManagedInbounds) {
      return this.buildUnifiedSummary(username, await this.getUnifiedManagedState(username));
    }

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
    if (this.hasUnifiedManagedInbounds) {
      return this.upsertUnifiedManagedClient(
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
    if (this.hasUnifiedManagedInbounds) {
      const state = await this.getUnifiedManagedState(username);
      const email = state.client?.email || state.email;

      if (state.client && email) {
        await this.client.apiPost<null>(`clients/del/${encodeURIComponent(email)}`);
      }

      return;
    }

    const states = await this.findManagedInboundStates(username);

    for (const state of states) {
      if (!state.client) {
        continue;
      }

      const email = state.client.email || state.email;
      if (!email) {
        continue;
      }

      await this.client.apiPost<null>(
        `clients/del/${encodeURIComponent(email)}`
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
