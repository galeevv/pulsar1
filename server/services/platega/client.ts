import "server-only";

import { timingSafeEqual } from "node:crypto";

const DEFAULT_PLATEGA_BASE_URL = "https://app.platega.io";

export class PlategaApiError extends Error {
  statusCode: number | null;
  responseBody: string | null;

  constructor(
    message: string,
    input?: { responseBody?: string | null; statusCode?: number | null }
  ) {
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
  paymentMethod: "CARD" | "SBP";
  returnUrl: string;
};

type PlategaCreateTransactionResponse = {
  data?: {
    id?: string;
    redirect?: string;
    status?: string;
    transactionId?: string;
  };
  id?: string;
  message?: string;
  redirect?: string;
  status?: string;
  transactionId?: string;
};

type PlategaWebhookPayload = {
  amount?: number;
  currency?: string;
  id?: string;
  method?: string;
  payload?: string;
  status?: string;
  transactionId?: string;
};

const PAYMENT_METHOD_TO_API_VALUE: Record<PlategaCreateTransactionInput["paymentMethod"], number> = {
  CARD: 11,
  SBP: 2,
};

function getPlategaConfig() {
  const merchantId = process.env.PLATEGA_MERCHANT_ID?.trim();
  const apiKey =
    process.env.PLATEGA_SECRET?.trim() || process.env.PLATEGA_API_KEY?.trim();
  const baseUrl = process.env.PLATEGA_BASE_URL?.trim() || DEFAULT_PLATEGA_BASE_URL;

  if (!merchantId || !apiKey) {
    throw new PlategaApiError(
      "PLATEGA_MERCHANT_ID и PLATEGA_SECRET (или PLATEGA_API_KEY) должны быть заданы."
    );
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
  // Docs contract:
  // paymentDetails contains only amount/currency; description/return/failedUrl/payload are top-level.
  const payload = {
    description: input.description,
    failedUrl: input.failedUrl,
    orderId: input.orderId,
    payload: input.payload,
    paymentDetails: {
      amount: input.amount,
      currency: "RUB",
    },
    paymentMethod: PAYMENT_METHOD_TO_API_VALUE[input.paymentMethod],
    return: input.returnUrl,
  };

  const parsed = (await callPlategaApi({
    body: JSON.stringify(payload),
    path: "/transaction/process",
  })) as PlategaCreateTransactionResponse;

  const redirectUrl = parsed.redirect ?? parsed.data?.redirect;
  const transactionId =
    parsed.transactionId ?? parsed.id ?? parsed.data?.transactionId ?? parsed.data?.id;
  const status = parsed.status ?? parsed.data?.status ?? null;

  if (!redirectUrl || !transactionId) {
    throw new PlategaApiError("Platega API не вернул redirect URL или transaction id.", {
      responseBody: JSON.stringify(parsed),
      statusCode: null,
    });
  }

  return {
    redirectUrl,
    status,
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
  const transactionId = cast.id ?? cast.transactionId;
  if (!transactionId || typeof transactionId !== "string") {
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
    transactionId,
  };
}
