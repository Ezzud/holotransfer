import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, resolve } from "node:path";

const assetsRoot = resolve(
  process.env.RELEASE_ASSETS_DIR ?? "release-assets",
);
const version = process.env.RELEASE_VERSION?.replace(/^v/, "");
const repository = process.env.GITHUB_REPOSITORY ?? "Ezzud/holotransfer";
const outputPath = resolve(process.env.RELEASE_MANIFEST ?? "latest.json");

if (!version) throw new Error("RELEASE_VERSION is required.");

const platformFiles = {
  "windows-x86_64": [".exe"],
  "linux-x86_64": [".AppImage", ".rpm"],
  "darwin-x86_64": [".app.tar.gz", ".dmg"],
};

function findFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? findFiles(path) : [path];
  });
}

const platforms = {};
for (const [platform, extensions] of Object.entries(platformFiles)) {
  const directory = resolve(assetsRoot, platform);
  const files = findFiles(directory);
  const bundle = extensions
    .map((extension) => files.find((path) => path.endsWith(extension)))
    .find(Boolean);
  if (!bundle) {
    console.warn(`No updater bundle found for ${platform}; skipping.`);
    continue;
  }

  const signaturePath = `${bundle}.sig`;
  const filename = basename(bundle);
  const platformEntry = {
    url: `https://github.com/${repository}/releases/latest/download/${filename}`,
  };
  if (existsSync(signaturePath)) {
    platformEntry.signature = readFileSync(signaturePath, "utf8").trim();
  }
  platforms[platform] = {
    ...platformEntry,
  };
}

const manifest = {
  version,
  notes: `HoloTransfer ${version}`,
  pub_date: new Date().toISOString(),
  platforms,
};
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
