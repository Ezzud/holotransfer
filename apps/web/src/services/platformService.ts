export type AppPlatform =
  | "Android"
  | "iOS"
  | "Windows"
  | "macOS"
  | "Linux"
  | "Web";

/**
 * Returns a readable platform name for the settings footer.
 * @returns Platform name.
 */
export function getPlatformLabel(): AppPlatform {
  if (import.meta.env.VITE_TAURI !== "true") return "Web";
  const userAgent = navigator.userAgent;
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/macintosh|mac os/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Web";
}
