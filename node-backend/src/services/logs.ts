import { insertLog, listLogs, pruneLogs, LogLevel } from "../db/queries";
import { env } from "../config/env";

export const writeLog = async (
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  service = "node"
) => {
  await insertLog({
    level,
    message,
    context,
    service
  });
};

export const readErrorLogs = async () =>
  listLogs(["ERROR", "CRITICAL"], 200);

export const pruneOldLogs = async () => {
  const cutoff = new Date(Date.now() - env.logRetentionDays * 24 * 60 * 60 * 1000);
  return pruneLogs(cutoff);
};
