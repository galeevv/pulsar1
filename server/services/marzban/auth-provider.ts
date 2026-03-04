import { MarzbanConfig } from "./config";

type CachedToken = {
  accessToken: string;
  expiresAt: number | null;
};

function decodeJwtExp(token: string) {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      exp?: number;
    };

    if (typeof payload.exp !== "number") {
      return null;
    }

    return payload.exp * 1000;
  } catch {
    return null;
  }
}

export class MarzbanAuthProvider {
  private readonly config: MarzbanConfig;

  private inFlightAuth: Promise<string> | null = null;

  private cachedToken: CachedToken | null = null;

  constructor(config: MarzbanConfig) {
    this.config = config;
  }

  private isTokenFresh(cachedToken: CachedToken | null) {
    if (!cachedToken) {
      return false;
    }

    if (cachedToken.expiresAt === null) {
      return true;
    }

    return Date.now() < cachedToken.expiresAt - 30_000;
  }

  private async loginWithPassword() {
    const body = new URLSearchParams({
      grant_type: "password",
      password: this.config.password!,
      username: this.config.username!,
    });

    const response = await fetch(`${this.config.baseUrl}/api/admin/token`, {
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Marzban auth failed with status ${response.status}: ${text.slice(0, 300)}`);
    }

    const json = (await response.json()) as {
      access_token?: string;
    };

    if (!json.access_token) {
      throw new Error("Marzban auth response does not contain access_token.");
    }

    const expiresAt = decodeJwtExp(json.access_token);
    this.cachedToken = {
      accessToken: json.access_token,
      expiresAt,
    };

    return json.access_token;
  }

  async getAccessToken(options?: { forceRefresh?: boolean }) {
    if (this.config.authMode === "token") {
      return this.config.token!;
    }

    const forceRefresh = Boolean(options?.forceRefresh);

    if (!forceRefresh && this.isTokenFresh(this.cachedToken)) {
      return this.cachedToken!.accessToken;
    }

    if (!this.inFlightAuth) {
      this.inFlightAuth = this.loginWithPassword().finally(() => {
        this.inFlightAuth = null;
      });
    }

    return this.inFlightAuth;
  }
}
