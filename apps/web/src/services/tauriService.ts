import { isTauri } from "@tauri-apps/api/core";

/**
 * Detects whether the frontend is running inside a Tauri WebView.
 * @returns True when the Tauri runtime or Tauri build mode is available.
 */
export function isTauriRuntime(): boolean {
  return isTauri() || import.meta.env.VITE_TAURI === "true";
}
