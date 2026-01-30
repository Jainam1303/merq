import crypto from "crypto";
import { env } from "../config/env";

type AlgoRequest = {
  path: string;
  method?: string;
  body?: unknown;
  allowUnsigned?: boolean;
};

export const callAlgoBackend = async <T>({
  path,
  method = "GET",
  body,
  allowUnsigned = false
}: AlgoRequest): Promise<T> => {
  const payload = body ? JSON.stringify(body) : "";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const signature = crypto
    .createHmac("sha256", env.algo.key)
    .update(`${timestamp}.${nonce}.${method}.${path}.${payload}`)
    .digest("hex");

  const response = await fetch(`${env.algo.url}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(allowUnsigned
        ? {}
        : {
          "x-internal-timestamp": timestamp,
          "x-internal-nonce": nonce,
          "x-internal-signature": signature
        })
    },
    body: payload || undefined
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(text || "Algo backend error");
    const status = response.status >= 500 ? 502 : response.status;
    (error as Error & { status?: number }).status = status;
    throw error;
  }

  return (await response.json()) as T;
};
