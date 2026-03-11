import { XuiConfig } from "./config";

type Envelope<T> = {
  msg?: string;
  obj?: T;
  success?: boolean;
};

type FormPayload = Record<string, boolean | number | string | undefined | null>;

function toSafePath(path: string) {
  if (!path) {
    return "";
  }

  return path.replace(/^\/+/, "");
}

function toFormBody(payload?: FormPayload) {
  if (!payload) {
    return undefined;
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(payload)) {
    if (value === null || typeof value === "undefined") {
      continue;
    }

    params.set(key, String(value));
  }

  return params;
}

function getCookieFromHeaders(headers: Headers) {
  const maybeSetCookie = (
    headers as Headers & {
      getSetCookie?: () => string[];
    }
  ).getSetCookie?.();

  const headerValues = maybeSetCookie && maybeSetCookie.length > 0
    ? maybeSetCookie
    : [headers.get("set-cookie") ?? ""];

  for (const value of headerValues) {
    const markerIndex = value.indexOf("3x-ui=");

    if (markerIndex < 0) {
      continue;
    }

    return value.slice(markerIndex).split(";")[0];
  }

  return null;
}

function isUnauthorizedStatus(status: number) {
  return status === 302 || status === 401 || status === 403;
}

export class XuiHttpError extends Error {
  readonly responseBody: string;
  readonly status: number;

  constructor(message: string, options: { status: number; responseBody: string }) {
    super(message);
    this.name = "XuiHttpError";
    this.status = options.status;
    this.responseBody = options.responseBody;
  }
}

export class XuiHttpClient {
  private readonly config: XuiConfig;
  private loginInFlight: Promise<void> | null = null;
  private sessionCookie: string | null = null;

  constructor(config: XuiConfig) {
    this.config = config;
  }

  private buildUrl(path: string) {
    const safePath = path.startsWith("/") ? path : `/${path}`;
    return `${this.config.baseUrl}${safePath}`;
  }

  private buildBasicAuthorizationHeader() {
    const username = this.config.basicAuthUsername;
    const password = this.config.basicAuthPassword;

    if (!username || !password) {
      return null;
    }

    const encoded = Buffer.from(`${username}:${password}`).toString("base64");
    return `Basic ${encoded}`;
  }

  private async requestRaw(path: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const headers = new Headers(init.headers ?? {});
    const basicAuthorization = this.buildBasicAuthorizationHeader();

    headers.set("X-Requested-With", "XMLHttpRequest");

    if (basicAuthorization) {
      headers.set("Authorization", basicAuthorization);
    }

    if (this.sessionCookie) {
      headers.set("Cookie", this.sessionCookie);
    }

    try {
      return await fetch(this.buildUrl(path), {
        ...init,
        headers,
        redirect: "manual",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async login(force = false) {
    if (this.sessionCookie && !force) {
      return;
    }

    if (this.loginInFlight) {
      return this.loginInFlight;
    }

    this.loginInFlight = (async () => {
      const body = new URLSearchParams({
        password: this.config.password,
        username: this.config.username,
      });

      const response = await this.requestRaw(`/${this.config.webBasePath}/login`, {
        body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        method: "POST",
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new XuiHttpError(`x-ui login failed: ${response.status}`, {
          responseBody: responseText,
          status: response.status,
        });
      }

      const nextCookie = getCookieFromHeaders(response.headers);
      if (nextCookie) {
        this.sessionCookie = nextCookie;
      }

      let payload: Envelope<null> | null = null;
      try {
        payload = JSON.parse(responseText) as Envelope<null>;
      } catch {
        throw new XuiHttpError("x-ui login returned non-JSON response.", {
          responseBody: responseText,
          status: response.status,
        });
      }

      if (!payload.success) {
        throw new XuiHttpError(`x-ui login rejected request: ${payload.msg ?? "unknown error"}`, {
          responseBody: responseText,
          status: response.status,
        });
      }
    })().finally(() => {
      this.loginInFlight = null;
    });

    return this.loginInFlight;
  }

  private async requestEnvelope<T>(
    path: string,
    init: RequestInit,
    allowAuthRetry = true
  ): Promise<Envelope<T>> {
    await this.login(false);
    let response = await this.requestRaw(path, init);

    if (allowAuthRetry && isUnauthorizedStatus(response.status)) {
      await this.login(true);
      response = await this.requestRaw(path, init);
    }

    const responseText = await response.text();

    if (!response.ok) {
      throw new XuiHttpError(`x-ui request failed: ${response.status} ${path}`, {
        responseBody: responseText,
        status: response.status,
      });
    }

    let envelope: Envelope<T>;

    try {
      envelope = JSON.parse(responseText) as Envelope<T>;
    } catch {
      throw new XuiHttpError(`x-ui request returned non-JSON payload for ${path}`, {
        responseBody: responseText,
        status: response.status,
      });
    }

    if (envelope.success === false) {
      throw new XuiHttpError(`x-ui request returned error: ${envelope.msg ?? "unknown error"}`, {
        responseBody: responseText,
        status: response.status,
      });
    }

    return envelope;
  }

  async apiGet<T>(path: string) {
    const response = await this.requestEnvelope<T>(
      `/${this.config.webBasePath}/panel/api/${toSafePath(path)}`,
      {
        method: "GET",
      }
    );

    return response.obj as T;
  }

  async apiPost<T>(path: string, payload?: FormPayload) {
    const response = await this.requestEnvelope<T>(
      `/${this.config.webBasePath}/panel/api/${toSafePath(path)}`,
      {
        body: toFormBody(payload),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        method: "POST",
      }
    );

    return response.obj as T;
  }

  async panelPost<T>(path: string, payload?: FormPayload) {
    const response = await this.requestEnvelope<T>(
      `/${this.config.webBasePath}/panel/${toSafePath(path)}`,
      {
        body: toFormBody(payload),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        method: "POST",
      }
    );

    return response.obj as T;
  }
}
