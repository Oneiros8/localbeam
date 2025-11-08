// src/server/utils/logger.ts
import chalk from "chalk";

/**
 * Simple logger utility with timestamps and color coding.
 * Used by both discovery and signaling subsystems.
 */

function timestamp(): string {
  const now = new Date();
  return chalk.gray(`[${now.toISOString().split("T")[1].split(".")[0]}]`);
}

export function logInfo(message: string, ...optional: unknown[]) {
  console.log(timestamp(), chalk.blue("INFO:"), message, ...optional);
}

export function logWarn(message: string, ...optional: unknown[]) {
  console.warn(timestamp(), chalk.yellow("WARN:"), message, ...optional);
}

export function logError(message: string, ...optional: unknown[]) {
  console.error(timestamp(), chalk.red("ERROR:"), message, ...optional);
}
