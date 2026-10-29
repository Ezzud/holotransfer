import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const rootPackagePath = resolve(root, "package.json");
const desktopPackagePath = resolve(root, "apps/desktop/package.json");
const tauriConfigPath = resolve(root, "apps/desktop/src-tauri/tauri.conf.json");
const cargoPath = resolve(root, "apps/desktop/src-tauri/Cargo.toml");

const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8"));
const version = rootPackage.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`Invalid root version: ${version}`);
}

const desktopPackage = JSON.parse(readFileSync(desktopPackagePath, "utf8"));
desktopPackage.version = version;
writeFileSync(desktopPackagePath, `${JSON.stringify(desktopPackage, null, 2)}\n`);

const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, "utf8"));
tauriConfig.version = version;
writeFileSync(tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`);

const cargo = readFileSync(cargoPath, "utf8").replace(
  /^version = ".*"$/m,
  `version = "${version}"`,
);
writeFileSync(cargoPath, cargo);
