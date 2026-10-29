import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import { basename, resolve } from "node:path";

const inputDirectory = resolve(
  process.env.RELEASE_ASSETS_DIR ?? "release-assets",
);
const outputDirectory = resolve(
  process.env.RELEASE_OUTPUT_DIR ?? "release-upload",
);
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

for (const file of [...artifacts, ...signatures]) {
  const destination = resolve(outputDirectory, basename(file));
  copyFileSync(file, destination);
  console.log(`[release-assets] Staged ${basename(file)}`);
}

console.log(
  `[release-assets] Staged ${artifacts.length} artifacts and ${signatures.length} signatures.`,
);
