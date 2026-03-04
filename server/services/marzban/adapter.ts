import { MarzbanConfig, getMarzbanConfig } from "./config";
import { MarzbanAuthProvider } from "./auth-provider";
import { MarzbanHttpClient, MarzbanHttpError } from "./http-client";
import { MarzbanAdapter } from "./types";

type MarzbanUserResponse = {
  status?: string;
  subscription_url?: string;
  username?: string;
};

type MarzbanInboundsResponse = Record<
  string,
  Array<{
    tag?: string;
  }>
>;

function toEpochSeconds(date: Date | null | undefined) {
  if (!date) {
    return null;
  }

  return Math.floor(date.getTime() / 1000);
}

function mapStatusForCreate(status?: "active" | "disabled") {
  if (status === "disabled") {
    return "on_hold";
  }

  return "active";
}

function mapStatusForModify(status?: "active" | "disabled") {
  if (!status) {
    return undefined;
  }

  return status;
}

function mapUserResponse(raw: unknown) {
  const user = (raw ?? {}) as MarzbanUserResponse;
  return {
    raw,
    status: user.status ?? "unknown",
    subscriptionUrl: user.subscription_url ?? null,
    username: user.username ?? "",
  };
}

export class HttpMarzbanAdapter implements MarzbanAdapter {
  private readonly client: MarzbanHttpClient;
  private inboundCache: {
    fetchedAt: number;
    inbounds: Record<string, string[]>;
    proxies: Record<string, Record<string, string>>;
  } | null = null;

  constructor(private readonly config: MarzbanConfig) {
    this.client = new MarzbanHttpClient(config, new MarzbanAuthProvider(config));
  }

  private async getDefaultInboundsAndProxies() {
    const now = Date.now();

    if (this.inboundCache && now - this.inboundCache.fetchedAt < 60_000) {
      return {
        inbounds: this.inboundCache.inbounds,
        proxies: this.inboundCache.proxies,
      };
    }

    const raw = await this.client.requestJson<MarzbanInboundsResponse>("/api/inbounds");
    const inbounds: Record<string, string[]> = {};
    const proxies: Record<string, Record<string, string>> = {};

    for (const [proxyType, inboundList] of Object.entries(raw ?? {})) {
      const tags = Array.from(
        new Set(
          (inboundList ?? [])
            .map((item) => item.tag?.trim())
            .filter((tag): tag is string => Boolean(tag))
        )
      );

      if (tags.length > 0) {
        inbounds[proxyType] = tags;
        proxies[proxyType] =
          proxyType === "vless" ? { flow: "xtls-rprx-vision" } : {};
      }
    }

    this.inboundCache = {
      fetchedAt: now,
      inbounds,
      proxies,
    };

    return { inbounds, proxies };
  }

  async healthCheck() {
    await this.client.requestJson("/api/users?limit=1");
  }

  async createVpnUser(input: {
    username: string;
    expireAt?: Date | null;
    dataLimitBytes?: number | null;
    note?: string | null;
    status?: "active" | "disabled";
  }) {
    const { inbounds, proxies } = await this.getDefaultInboundsAndProxies();

    const payload = {
      data_limit: input.dataLimitBytes ?? null,
      data_limit_reset_strategy: "no_reset",
      expire: toEpochSeconds(input.expireAt),
      inbounds,
      note: input.note ?? null,
      proxies,
      status: mapStatusForCreate(input.status),
      username: input.username,
    };

    try {
      const raw = await this.client.requestJson<unknown>("/api/user", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const mapped = mapUserResponse(raw);

      if (input.status === "disabled") {
        await this.updateVpnUser({ status: "disabled", username: input.username });
        return (await this.getVpnUser(input.username))!;
      }

      return mapped;
    } catch (error) {
      if (error instanceof MarzbanHttpError && error.status === 409) {
        const existing = await this.getVpnUser(input.username);

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  async getVpnUser(username: string) {
    try {
      const raw = await this.client.requestJson<unknown>(`/api/user/${encodeURIComponent(username)}`);
      return mapUserResponse(raw);
    } catch (error) {
      if (error instanceof MarzbanHttpError && error.status === 404) {
        return null;
      }

      throw error;
    }
  }

  async updateVpnUser(input: {
    username: string;
    expireAt?: Date | null;
    dataLimitBytes?: number | null;
    status?: "active" | "disabled";
    note?: string | null;
  }) {
    const payload: Record<string, unknown> = {};

    if (typeof input.expireAt !== "undefined") {
      payload.expire = toEpochSeconds(input.expireAt);
    }

    if (typeof input.dataLimitBytes !== "undefined") {
      payload.data_limit = input.dataLimitBytes;
    }

    if (typeof input.note !== "undefined") {
      payload.note = input.note;
    }

    const mappedStatus = mapStatusForModify(input.status);
    if (mappedStatus) {
      payload.status = mappedStatus;
    }

    const raw = await this.client.requestJson<unknown>(`/api/user/${encodeURIComponent(input.username)}`, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
    });

    return mapUserResponse(raw);
  }

  async revokeVpnUser(username: string) {
    const user = await this.getVpnUser(username);

    if (!user) {
      return;
    }

    await this.updateVpnUser({
      status: "disabled",
      username,
    });

    await this.client.requestJson(`/api/user/${encodeURIComponent(username)}/revoke_sub`, {
      method: "POST",
    });
  }

  async getSubscriptionUrl(username: string) {
    const user = await this.getVpnUser(username);
    return user?.subscriptionUrl ?? null;
  }

  async syncVpnUser(username: string) {
    return this.getVpnUser(username);
  }
}

class MockMarzbanAdapter implements MarzbanAdapter {
  async healthCheck() {}

  async createVpnUser(input: {
    username: string;
    expireAt?: Date | null;
    dataLimitBytes?: number | null;
    note?: string | null;
    status?: "active" | "disabled";
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
    status?: "active" | "disabled";
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

let cachedAdapter: MarzbanAdapter | null = null;

export function getMarzbanAdapter(): MarzbanAdapter {
  if (cachedAdapter) {
    return cachedAdapter;
  }

  try {
    const config = getMarzbanConfig();
    cachedAdapter = new HttpMarzbanAdapter(config);
    return cachedAdapter;
  } catch (error) {
    const fallbackEnabled =
      process.env.MARZBAN_ENABLE_MOCK_FALLBACK?.toLowerCase() === "true";

    if (!fallbackEnabled) {
      throw error;
    }

    cachedAdapter = new MockMarzbanAdapter();
    return cachedAdapter;
  }
}
