import crypto from "crypto";
import { env } from "../config/env";

const KEY_LENGTH = 32;

const getKey = () => {
  const key = Buffer.from(env.brokerKeyMaster, "hex");
  if (key.length !== KEY_LENGTH) {
    throw new Error("BROKER_KEY_MASTER_KEY must be 64 hex chars");
  }
  return key;
};

export const encryptSecret = (value: string) => {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
};

export const decryptSecret = (payload: string) => {
  const data = Buffer.from(payload, "base64");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
};

export const maskSecret = (value: string, visible = 4) => {
  if (!value) return "";
  const keep = Math.min(visible, value.length);
  return `${"*".repeat(Math.max(value.length - keep, 0))}${value.slice(-keep)}`;
};
