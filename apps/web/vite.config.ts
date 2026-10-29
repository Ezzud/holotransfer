import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), "../../package.json"), "utf8"),
  ) as { version: string };
  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(
        environment.VITE_APP_VERSION ?? packageJson.version,
      ),
      "import.meta.env.LATEST_RELEASE_URL": JSON.stringify(
        environment.LATEST_RELEASE_URL ?? "",
      ),
      "import.meta.env.VITE_TAURI": JSON.stringify(
        mode === "tauri" ? "true" : environment.VITE_TAURI ?? "false",
      ),
    },
    server: { port: Number(environment.VITE_PORT ?? 51739) },
  };
});
