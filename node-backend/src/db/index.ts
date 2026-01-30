import { Pool } from "pg";
import { env } from "../config/env";

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password
});

export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);
