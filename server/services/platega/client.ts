import "server-only";

import { timingSafeEqual } from "node:crypto";

const DEFAULT_PLATEGA_BASE_URL = "https://app.platega.io";

export class PlategaApiError extends Error {
  statusCode: number | null;
  responseBody: string | null;

  constructor(message: string, input?: { responseBody?: string | null; statusCode?: number | null }) {
    super(message);
    this.name = "PlategaApiError";
    this.statusCode = input?.statusCode ?? null;
    this.responseBody = input?.responseBody ?? null;
  }
}

type PlategaCreateTransactionInput = {
  amount: number;
  description: string;
  failedUrl: string;
  orderId: string;
  payload: string;
  returnUrl: string;
};

type PlategaCreateTransactionResponse = {
  data: {
    id?: string;
    redirect?: string;
  };
  message?: string;
  status?: string;
};

type PlategaWebhookPayload = {
  amount?: number;
  currency?: string;
  id?: string;
  method?: string;
  payload?: string;
  status?: string;
};

function getPlategaConfig() {
  const merchantId = process.env.PLATEGA_MERCHANT_ID?.trim();
  const apiKey = process.env.PLATEGA_API_KEY?.trim();
  const baseUrl = process.env.PLATEGA_BASE_URL?.trim() || DEFAULT_PLATEGA_BASE_URL;

  if (!merchantId || !apiKey) {
    throw new PlategaApiError("PLATEGA_MERCHANT_ID и PLATEGA_API_KEY должны быть заданы.");
  }

  return {
    apiKey,
    baseUrl,
    merchantId,
  };
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

async function callPlategaApi(input: { body: string; path: string }) {
  const config = getPlategaConfig();
  const url = `${config.baseUrl}${input.path}`;
  const response = await fetch(url, {
    body: input.body,
    headers: {
      "Content-Type": "application/json",
      "X-MerchantId": config.merchantId,
      "X-Secret": config.apiKey,
    },
    method: "POST",
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new PlategaApiError("Platega API вернул ошибку.", {
      responseBody: responseText,
      statusCode: response.status,
    });
  }

  let parsed: unknown;
  try {
    parsed = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new PlategaApiError("Platega API вернул невалидный JSON.", {
      responseBody: responseText,
      statusCode: response.status,
    });
  }

  return parsed;
}

export async function createPlategaTransaction(input: PlategaCreateTransactionInput) {
  const payload = {
    paymentDetails: {
      amount: input.amount,
      currency: "RUB",
      description: input.description,
      failedUrl: input.failedUrl,
      payload: input.payload,
      returnUrl: input.returnUrl,
    },
    paymentMethod: 2,
  };

  const parsed = (await callPlategaApi({
    body: JSON.stringify(payload),
    path: "/transaction/process",
  })) as PlategaCreateTransactionResponse;

  const redirectUrl = parsed.data?.redirect;
  const transactionId = parsed.data?.id;

  if (!redirectUrl || !transactionId) {
    throw new PlategaApiError("Platega API не вернул redirect или transaction id.", {
      responseBody: JSON.stringify(parsed),
      statusCode: null,
    });
  }

  return {
    redirectUrl,
    status: parsed.status ?? null,
    transactionId,
  };
}

export function validatePlategaWebhookHeaders(headers: Headers) {
  const config = getPlategaConfig();
  const merchant = headers.get("x-merchantid") ?? headers.get("X-MerchantId") ?? "";
  const secret = headers.get("x-secret") ?? headers.get("X-Secret") ?? "";

  return safeEqual(merchant, config.merchantId) && safeEqual(secret, config.apiKey);
}

export function parsePlategaWebhookPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const cast = payload as PlategaWebhookPayload;
  if (!cast.id || typeof cast.id !== "string") {
    return null;
  }

  if (!cast.status || typeof cast.status !== "string") {
    return null;
  }

  return {
    amount: typeof cast.amount === "number" ? cast.amount : null,
    currency: typeof cast.currency === "string" ? cast.currency : null,
    method: typeof cast.method === "string" ? cast.method : null,
    payload: typeof cast.payload === "string" ? cast.payload : null,
    status: cast.status,
    transactionId: cast.id,
  };
}
