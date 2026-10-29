/**
 * Returns a stable anonymous browser identifier.
 * @returns The local client identifier.
 */
export function getClientId(): string {
  const key = "client_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

/**
 * Reads the persisted speed preference.
 * @returns Speed value and unit.
 */
export function getSpeedSetting(): {
  value: number;
  unit: "KB/s" | "MB/s" | "GB/s";
} {
  const raw = localStorage.getItem("max_speed");
  if (!raw) return { value: 0, unit: "MB/s" };
  try {
    const setting = JSON.parse(raw) as {
      value?: number;
      unit?: "KB/s" | "MB/s" | "GB/s";
    };
    return {
      value:
        Number.isFinite(setting.value) && (setting.value ?? 0) >= 0
          ? (setting.value ?? 0)
          : 0,
      unit:
        setting.unit === "KB/s" || setting.unit === "GB/s"
          ? setting.unit
          : "MB/s",
    };
  } catch {
    const value = Number(raw);
    return {
      value: Number.isFinite(value) && value >= 0 ? value : 0,
      unit: "MB/s",
    };
  }
}

/**
 * Reads a numeric browser setting.
 * @param key Storage key.
 * @param fallback Value used when no valid setting exists.
 * @returns The stored setting.
 */
export function getNumberSetting(key: string, fallback: number): number {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}
