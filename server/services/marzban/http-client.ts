import { MarzbanConfig } from "./config";
import { MarzbanAuthProvider } from "./auth-provider";

export class MarzbanHttpError extends Error {
  readonly responseBody: string;
  readonly status: number;

  constructor(message: string, options: { status: number; responseBody: string }) {
    super(message);
    this.name = "MarzbanHttpError";
    this.status = options.status;
    this.responseBody = options.responseBody;
  }
}

type RequestOptions = {
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

export class MarzbanHttpClient {
  private readonly authProvider: MarzbanAuthProvider;
  private readonly config: MarzbanConfig;

  constructor(config: MarzbanConfig, authProvider: MarzbanAuthProvider) {
    this.config = config;
    this.authProvider = authProvider;
  }

  private buildUrl(path: string) {
    const safePath = path.startsWith("/") ? path : `/${path}`;
    return `${this.config.baseUrl}${safePath}`;
  }

  private async requestRaw(
    path: string,
    init: RequestInit,
    requestOptions: RequestOptions,
    forceRefreshToken = false
  ) {
    const headers = new Headers(init.headers ?? {});

    if (requestOptions.auth !== false) {
      const token = await this.authProvider.getAccessToken({ forceRefresh: forceRefreshToken });
      headers.set("Authorization", `Bearer ${token}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      return await fetch(this.buildUrl(path), {
        ...init,
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async requestJson<TResponse>(
    path: string,
    init: RequestInit = {},
    requestOptions: RequestOptions = {}
  ): Promise<TResponse> {
    const retryOnUnauthorized = requestOptions.retryOnUnauthorized !== false;
    let response = await this.requestRaw(path, init, requestOptions, false);

    if (
      response.status === 401 &&
      retryOnUnauthorized &&
      requestOptions.auth !== false &&
      this.config.authMode === "password"
    ) {
      response = await this.requestRaw(path, init, requestOptions, true);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new MarzbanHttpError(`Marzban request failed: ${response.status} ${path}`, {
        responseBody: text,
        status: response.status,
      });
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();
      return text as TResponse;
    }

    return (await response.json()) as TResponse;
  }
}
