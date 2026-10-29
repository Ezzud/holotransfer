import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredVariables = [
  "VITE_API_URL",
  "VITE_API_PREFIX",
  "VITE_WS_URL",
  "VITE_WS_PATH",
];
const latestReleaseUrl = process.env.LATEST_RELEASE_URL;
const packageJson = JSON.parse(
  readFileSync(resolve("package.json"), "utf8"),
);

for (const name of requiredVariables) {
  if (!process.env[name]) {
    throw new Error(`${name} is required to create the Tauri environment.`);
  }
}
if (!latestReleaseUrl) {
  throw new Error("LATEST_RELEASE_URL is required to create the Tauri environment.");
}

const environment = [
  ...requiredVariables.map((name) => `${name}=${process.env[name]}`),
  `VITE_LATEST_RELEASE_URL=${latestReleaseUrl}`,
  `VITE_APP_VERSION=${packageJson.version}`,
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
