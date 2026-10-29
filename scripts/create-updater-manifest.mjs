import {
  basename,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const assetsRoot = resolve(
  process.env.RELEASE_ASSETS_DIR ?? "release-assets",
);
const version = process.env.RELEASE_VERSION?.replace(/^v/, "");
const repository = process.env.GITHUB_REPOSITORY ?? "Ezzud/holotransfer";
const outputPath = resolve(process.env.RELEASE_MANIFEST ?? "latest.json");

if (!version) throw new Error("RELEASE_VERSION is required.");

const platformFiles = {
  "windows-x86_64": [".msi", ".exe"],
  "linux-x86_64": [".AppImage"],
  "darwin-x86_64": [".dmg"],
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
  const bundle = files.find((path) =>
    extensions.some((extension) => path.endsWith(extension)),
  );
  if (!bundle) throw new Error(`No updater bundle found for ${platform}.`);

  const signaturePath = `${bundle}.sig`;
  const signature = readFileSync(signaturePath, "utf8").trim();
  const filename = basename(bundle);
  platforms[platform] = {
    signature,
    url: `https://github.com/${repository}/releases/latest/download/${filename}`,
  };
}

const manifest = {
  version,
  notes: `HoloTransfer ${version}`,
  pub_date: new Date().toISOString(),
  platforms,
};
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
