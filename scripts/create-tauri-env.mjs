import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredVariables = [
  "VITE_API_URL",
  "VITE_API_PREFIX",
  "VITE_WS_URL",
  "VITE_WS_PATH",
];

for (const name of requiredVariables) {
  if (!process.env[name]) {
    throw new Error(`${name} is required to create the Tauri environment.`);
  }
}

const environment = [
  ...requiredVariables.map((name) => `${name}=${process.env[name]}`),
  "VITE_PORT=51739",
  "VITE_TAURI=true",
  "",
].join("\n");

writeFileSync(
  resolve("apps", "web", ".env.tauri"),
  environment,
  "utf8",
);

console.log("Created apps/web/.env.tauri from GitHub Actions variables.");
