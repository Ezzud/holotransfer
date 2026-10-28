/**
 * Reads a comma-separated environment variable.
 * @param value Raw environment value.
 * @returns Trimmed non-empty values.
 */
function readList(value: string | undefined): string[] {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
}

/**
 * Normalizes a URL path to have one leading slash and no trailing slash.
 * @param value Raw path.
 * @returns Normalized path.
 */
function normalizePath(value: string): string {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, '') : withLeadingSlash;
}

/**
 * API runtime configuration.
 */
export const config = {
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 43827),
  apiPrefix: normalizePath(process.env.API_PREFIX ?? '/api'),
  websocketPath: normalizePath(process.env.WS_PATH ?? '/transfer'),
  allowedOrigins: readList(process.env.CLIENT_ORIGINS ?? 'https://transfer.ezzud.fr'),
  databaseStorage: process.env.DATABASE_STORAGE ?? 'data/transfermaster.sqlite',
  maxTransferSizeBytes: Number(process.env.MAX_TRANSFER_SIZE_BYTES ?? 100 * 1024 ** 3)
} as const;
