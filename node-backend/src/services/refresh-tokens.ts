import crypto from "crypto";
import {
  insertRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  revokeAllRefreshTokensForUser
} from "../db/queries";

export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const storeRefreshToken = async (
  userId: string,
  rawToken: string,
  expiresAt: Date,
  replacedByHash?: string | null
) => {
  const tokenHash = hashToken(rawToken);
  await insertRefreshToken(userId, tokenHash, expiresAt, replacedByHash);
};

export const isRefreshTokenActive = async (rawToken: string) => {
  const tokenHash = hashToken(rawToken);
  const record = await findRefreshToken(tokenHash);
  if (!record) return { valid: false, record: null };
  if (record.revoked_at) return { valid: false, record };
  return { valid: record.expires_at > new Date(), record };
};

export const revokeRefreshTokenByValue = async (rawToken: string) => {
  const tokenHash = hashToken(rawToken);
  await revokeRefreshToken(tokenHash);
};

export const rotateRefreshTokenByValue = async (
  rawToken: string,
  newRawToken: string
) => {
  const oldHash = hashToken(rawToken);
  const newHash = hashToken(newRawToken);
  await rotateRefreshToken(oldHash, newHash);
  return newHash;
};

export const revokeAllTokensForUser = async (userId: string) =>
  revokeAllRefreshTokensForUser(userId);
