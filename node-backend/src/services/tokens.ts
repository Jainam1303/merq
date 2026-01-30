import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type JwtPayload = {
  sub: string;
  username: string;
  is_admin: boolean;
};

export const signAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessTtl });

export const signRefreshToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshTtl });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.jwt.accessSecret) as JwtPayload;

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
