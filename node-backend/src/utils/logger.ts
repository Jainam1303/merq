import { maskSecret } from "./crypto";
import { writeLog } from "../services/logs";

const SENSITIVE_KEYS = ["password", "apiKey", "clientCode", "totp", "token"];

const redact = (value: unknown): unknown => {
  if (typeof value === "string") {
    return maskSecret(value);
  }
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEYS.includes(key)) {
        result[key] = maskSecret(String(val ?? ""));
      } else {
        result[key] = redact(val);
      }
    }
    return result;
  }
  return value;
};

export const logError = (message: string, meta?: Record<string, unknown>) => {
  const context = meta ? (redact(meta) as Record<string, unknown>) : undefined;
  if (!meta) {
    console.error(JSON.stringify({ level: "ERROR", message }));
    void writeLog("ERROR", message).catch(() => undefined);
    return;
  }
  console.error(JSON.stringify({ level: "ERROR", message, context }));
  void writeLog("ERROR", message, context).catch(() => undefined);
};

export const logEvent = (
  level: "INFO" | "WARN" | "ERROR" | "CRITICAL",
  message: string,
  meta?: Record<string, unknown>
) => {
  const context = meta ? (redact(meta) as Record<string, unknown>) : undefined;
  console.log(JSON.stringify({ level, message, context }));
  void writeLog(level, message, context).catch(() => undefined);
};
