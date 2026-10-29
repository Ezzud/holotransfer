/**
 * Opens a URL in the user's system browser when running inside Tauri.
 * @param url URL to open.
 * @returns Promise resolving when the browser request completes.
 */
export async function openExternalLink(url: string): Promise<void> {
  if (!isTauriRuntime()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}
import { isTauriRuntime } from "./tauriService";
