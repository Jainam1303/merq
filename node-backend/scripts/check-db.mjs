import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "merqprime_user",
  password: "StrongPassword123!",
  database: "merqprime"
});

try {
  const result = await pool.query(
    "SELECT to_regclass('public.users') AS users, to_regclass('public.logs') AS logs, to_regclass('public.refresh_tokens') AS refresh_tokens"
  );
  console.log(JSON.stringify(result.rows[0]));
} catch (error) {
  console.error(error);
} finally {
  await pool.end();
}
