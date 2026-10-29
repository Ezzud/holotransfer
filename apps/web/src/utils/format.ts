/**
 * Formats byte counts for readable transfer metadata.
 * @param bytes Number of bytes.
 * @returns Formatted size.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1024;
    unit++;
  } while (value >= 1024 && unit < units.length - 1);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

/**
 * Groups a transfer code into pairs for quick reading.
 * @param code Raw code.
 * @returns Spaced code.
 */
export function readableCode(code: string): string {
  return code.match(/.{1,2}/g)?.join("-") ?? code;
}
