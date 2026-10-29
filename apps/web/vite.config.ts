import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [react()],
    server: { port: Number(environment.VITE_PORT ?? 51739) },
  };
});
