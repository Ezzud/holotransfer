type LogMethod = (message: string, details?: unknown) => void;

/**
 * Formats structured details as readable key-value pairs.
 * @param details Optional log details.
 * @returns Human-readable detail text.
 */
function formatDetails(details?: unknown): string {
  if (!details || typeof details !== "object")
    return details === undefined ? "" : String(details);
  return Object.entries(details as Record<string, unknown>)
    .map(
      ([key, value]) =>
        `${key}=${value instanceof Error ? value.message : String(value)}`,
    )
    .join(" ");
}

/**
 * Writes a plain browser log entry.
 * @param level Log severity.
 * @param message Human-readable message.
 * @param details Optional structured details.
 * @returns Nothing.
 */
function write(level: string, message: string, details?: unknown): void {
  const timestamp = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date());
  const output = `[${timestamp}] [HoloTransfer] ${level} ${message}${formatDetails(details)}`;
  if (level === "ERROR") console.error(output);
  else if (level === "WARN") console.warn(output);
  else console.debug(output);
}

/**
 * Application logger for browser diagnostics.
 */
export const logger: Record<
  "debug" | "info" | "success" | "warn" | "error",
  LogMethod
> = {
  debug: (message, details) => write("DEBUG", message, details),
  info: (message, details) => write("INFO", message, details),
  success: (message, details) => write("SUCCESS", message, details),
  warn: (message, details) => write("WARN", message, details),
  error: (message, details) => write("ERROR", message, details),
};
