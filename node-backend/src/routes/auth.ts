import { Router, Response } from "express";
import { createUser, findUserByUsername, findUserById } from "../db/queries";
import { hashPassword, verifyPassword } from "../utils/password";
import { loginSchema, registerSchema, refreshSchema, logoutSchema } from "../utils/validation";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../services/tokens";
import {
  storeRefreshToken,
  isRefreshTokenActive,
  revokeRefreshTokenByValue,
  rotateRefreshTokenByValue,
  revokeAllTokensForUser
} from "../services/refresh-tokens";
import { env } from "../config/env";
import { validateBody } from "../middleware/validate";

const router = Router();

const setRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: env.cookies.secure,
    sameSite: env.cookies.sameSite,
    domain: env.cookies.domain,
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
};

router.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    const existing = await findUserByUsername(req.body.username);
    if (existing) {
      return res.status(409).json({ message: "Username already exists" });
    }
    const passwordHash = await hashPassword(req.body.password);
    const user = await createUser(req.body.username, passwordHash);
    const accessToken = signAccessToken({
      sub: user.id,
      username: user.username,
      is_admin: user.is_admin
    });
    const refreshToken = signRefreshToken({
      sub: user.id,
      username: user.username,
      is_admin: user.is_admin
    });
    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await storeRefreshToken(user.id, refreshToken, refreshExpiry);
    setRefreshCookie(res, refreshToken);
    return res.json({ access_token: accessToken, user });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const user = await findUserByUsername(req.body.username);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.is_active === false) {
      return res.status(403).json({ message: "Account disabled" });
    }
    const valid = await verifyPassword(req.body.password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const accessToken = signAccessToken({
      sub: user.id,
      username: user.username,
      is_admin: user.is_admin
    });
    const refreshToken = signRefreshToken({
      sub: user.id,
      username: user.username,
      is_admin: user.is_admin
    });
    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await storeRefreshToken(user.id, refreshToken, refreshExpiry);
    setRefreshCookie(res, refreshToken);
    return res.json({
      access_token: accessToken,
      user: { id: user.id, username: user.username, is_admin: user.is_admin }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/refresh", validateBody(refreshSchema), async (req, res, next) => {
  try {
    const refreshToken =
      req.body.refreshToken || req.cookies?.refresh_token || req.headers["x-refresh-token"];
    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(401).json({ message: "Refresh token required" });
    }
    const { valid, record } = await isRefreshTokenActive(refreshToken);
    if (!record) {
      return res.status(401).json({ message: "Refresh token invalid" });
    }
    if (record.revoked_at) {
      await revokeAllTokensForUser(record.user_id);
      return res.status(401).json({ message: "Refresh token reused" });
    }
    if (!valid) {
      return res.status(401).json({ message: "Refresh token expired" });
    }
    const decoded = verifyRefreshToken(refreshToken);
    const user = await findUserById(decoded.sub);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const accessToken = signAccessToken({
      sub: user.id,
      username: user.username,
      is_admin: user.is_admin
    });
    const newRefreshToken = signRefreshToken({
      sub: user.id,
      username: user.username,
      is_admin: user.is_admin
    });
    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await rotateRefreshTokenByValue(refreshToken, newRefreshToken);
    await storeRefreshToken(user.id, newRefreshToken, refreshExpiry);
    setRefreshCookie(res, newRefreshToken);
    return res.json({ access_token: accessToken });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", validateBody(logoutSchema), async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
    if (refreshToken) {
      await revokeRefreshTokenByValue(refreshToken);
    }
    res.clearCookie("refresh_token");
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
