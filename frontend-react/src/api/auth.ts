import { apiRequest } from "./client";

export type AuthUser = {
  id: string;
  username: string;
  is_admin: boolean;
};

export type AuthResponse = {
  access_token: string;
  user: AuthUser;
};

export const login = (username: string, password: string) =>
  apiRequest<AuthResponse>("POST", "/auth/login", { username, password });

export const register = (username: string, password: string) =>
  apiRequest<AuthResponse>("POST", "/auth/register", { username, password });

export const fetchMe = (token: string) =>
  apiRequest<{ user: AuthUser }>("GET", "/me", undefined, token);

export const logout = () =>
  apiRequest<{ status?: string }>("POST", "/auth/logout");
