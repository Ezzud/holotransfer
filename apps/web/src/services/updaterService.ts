import { logger } from "./logger";

/**
 * Checks for and installs a Tauri update when the frontend runs in the native shell.
 * @returns Promise resolving after the update check completes.
 */
export async function checkForAppUpdate(): Promise<void> {
  if (import.meta.env.VITE_TAURI !== "true") return;

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return;

    logger.info("Tauri update available", { version: update.version });
    await update.downloadAndInstall();
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch (reason: unknown) {
    logger.warn("Tauri update check failed", reason);
  }
}
