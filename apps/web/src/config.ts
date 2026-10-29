/**
 * Normalizes a URL path to have one leading slash and no trailing slash.
 * @param value Raw path.
 * @returns Normalized path.
 */
function normalizePath(value: string): string {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/, "")
    : withLeadingSlash;
}

/**
 * Frontend runtime/build configuration.
 */
export const config = {
  apiUrl: (import.meta.env.VITE_API_URL ?? "http://localhost:43827").replace(
    /\/+$/,
    "",
  ),
  apiPrefix: normalizePath(import.meta.env.VITE_API_PREFIX ?? "/api"),
  websocketUrl: (
    import.meta.env.VITE_WS_URL ??
    import.meta.env.VITE_API_URL ??
    "http://localhost:43827"
  )
    .replace(/^http/, "ws")
    .replace(/\/+$/, ""),
  websocketPath: normalizePath(import.meta.env.VITE_WS_PATH ?? "/transfer"),
} as const;
