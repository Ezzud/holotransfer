import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { basename, resolve } from "node:path";

const inputDirectory = resolve(
  process.env.RELEASE_ASSETS_DIR ?? "release-assets",
);
const outputDirectory = resolve(
  process.env.RELEASE_OUTPUT_DIR ?? "release-upload",
);
const version = process.env.RELEASE_VERSION?.replace(/^v/, "");
const allowedExtensions = [
  ".rpm",
  ".AppImage",
  ".dmg",
  ".app.tar.gz",
  ".exe",
  ".apk",
];

/**
 * Recursively finds files in a directory.
 * @param {string} directory Directory to inspect.
 * @returns {string[]} Files found beneath the directory.
 */
function findFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? findFiles(path) : [path];
  });
}

/**
 * Returns whether a filename is a supported release artifact.
 * @param {string} filename Filename to inspect.
 * @returns {boolean} Whether the filename is publishable.
 */
function isArtifact(filename) {
  return allowedExtensions.some((extension) => filename.endsWith(extension));
}

/**
 * Returns the release filename for a staged artifact.
 * @param {string} filename Source artifact filename.
 * @returns {string} Release artifact filename.
 */
function getReleaseFilename(filename) {
  if (filename.endsWith(".apk") && version) {
    return `HoloTransfer-v${version}.apk`;
  }
  return filename;
}

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });
const files = findFiles(inputDirectory);
const artifacts = files.filter((file) => isArtifact(basename(file)));
const artifactNames = new Set(artifacts.map((file) => basename(file)));
const signatures = files.filter((file) => {
  const filename = basename(file);
  return (
    filename.endsWith(".sig") &&
    artifactNames.has(filename.slice(0, -".sig".length))
  );
});

for (const artifact of artifacts) {
  const signature = `${artifact}.sig`;
  if (!existsSync(signature)) {
    console.log(
      `[release-assets] No signature for ${basename(artifact)}; continuing without one.`,
    );
  }
}

for (const file of artifacts) {
  const destination = resolve(
    outputDirectory,
    getReleaseFilename(basename(file)),
  );
  copyFileSync(file, destination);
  console.log(`[release-assets] Staged ${basename(file)} as ${basename(destination)}`);
}

for (const file of signatures) {
  const sourceArtifact = basename(file).slice(0, -".sig".length);
  const destination = resolve(
    outputDirectory,
    `${getReleaseFilename(sourceArtifact)}.sig`,
  );
  copyFileSync(file, destination);
  console.log(`[release-assets] Staged ${basename(file)} as ${basename(destination)}`);
}

console.log(
  `[release-assets] Staged ${artifacts.length} artifacts and ${signatures.length} signatures.`,
);
