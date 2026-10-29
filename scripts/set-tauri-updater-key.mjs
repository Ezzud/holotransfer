import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const configPath = resolve(
  import.meta.dirname,
  "..",
  "apps/desktop/src-tauri/tauri.conf.json",
);
const publicKey = process.env.TAURI_UPDATER_PUBLIC_KEY;

if (!publicKey) {
  throw new Error("TAURI_UPDATER_PUBLIC_KEY is required for a release build.");
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
config.plugins.updater.pubkey = publicKey;
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
