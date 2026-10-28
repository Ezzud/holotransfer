const colors = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
} as const;

type LogDetails = Record<string, unknown>;

/**
 * Formats structured details as readable key-value pairs.
 * @param details Optional log details.
 * @returns Human-readable detail text.
 */
function formatDetails(details?: unknown): string {
  if (!details || typeof details !== 'object') return details === undefined ? '' : ` ${String(details)}`;
  const values = Object.entries(details as LogDetails).map(([key, value]) => {
    const formatted = value instanceof Error ? value.message : String(value);
    return `${key}=${formatted.includes(' ') ? `"${formatted}"` : formatted}`;
  });
  return values.length ? ` ${values.join(' ')}` : '';
}

/**
 * Writes a colored API log entry.
 * @param level Log severity.
 * @param message Human-readable message.
 * @param details Optional structured details.
 * @returns Nothing.
 */
function write(level: 'DEBUG' | 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR', color: keyof typeof colors, message: string, details?: unknown): void {
  const timestamp = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date());
  process.stdout.write(`${colors.gray}${timestamp}${colors.reset} [${level}] ${colors[color]}${message}${colors.reset}${formatDetails(details)}\n`);
}

/**
 * Application logger for server-side diagnostics.
 */
export const logger = {
  debug: (message: string, details?: unknown) => write('DEBUG', 'cyan', message, details),
  info: (message: string, details?: unknown) => write('INFO', 'green', message, details),
  success: (message: string, details?: unknown) => write('SUCCESS', 'green', message, details),
  warn: (message: string, details?: unknown) => write('WARN', 'yellow', message, details),
  error: (message: string, details?: unknown) => write('ERROR', 'red', message, details)
};
