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
  if (!isTauriRuntime()) return "Web";
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const userAgentPlatform = navigator.userAgentData?.platform ?? "";
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/windows/i.test(`${userAgent} ${platform} ${userAgentPlatform}`)) {
    return "Windows";
  }
  if (/macintosh|mac os|mac/i.test(`${userAgent} ${platform} ${userAgentPlatform}`)) {
    return "macOS";
  }
  if (/linux/i.test(`${userAgent} ${platform} ${userAgentPlatform}`)) {
    return "Linux";
  }
  return "Web";
}
import { isTauriRuntime } from "./tauriService";
