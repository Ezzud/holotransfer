import { logger } from "./logger";

let wakeLock: WakeLockSentinel | null = null;

/**
 * Requests a screen wake lock while a transfer is active.
 * @returns Promise resolving when the request has been handled.
 */
export async function requestScreenWakeLock(): Promise<void> {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock?.release();
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener(
      "release",
      () => {
        wakeLock = null;
      },
      { once: true },
    );
  } catch (reason: unknown) {
    logger.warn("Screen wake lock is unavailable", reason);
  }
}

/**
 * Releases the active screen wake lock.
 * @returns Nothing.
 */
export function releaseScreenWakeLock(): void {
  if (!wakeLock) return;
  void wakeLock.release();
  wakeLock = null;
}
