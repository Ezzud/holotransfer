import { getPlatformLabel } from "./platformService";
import { logger } from "./logger";
import { isTauriRuntime } from "./tauriService";

const latestReleaseUrl = import.meta.env.LATEST_RELEASE_URL;

export type AvailableRelease = {
  version: string;
  downloadUrl: string;
};

type GitHubRelease = {
  tag_name?: unknown;
  assets?: unknown;
};

type GitHubAsset = {
  name?: unknown;
  browser_download_url?: unknown;
};

type ValidGitHubAsset = {
  name: string;
  browser_download_url: string;
};

/**
 * Finds the latest release asset for the current native platform.
 * @returns Available release details, or null when no newer asset is available.
 */
export async function checkForLatestRelease(): Promise<AvailableRelease | null> {
  if (!isTauriRuntime() || !latestReleaseUrl) return null;

  try {
    const response = await fetch(latestReleaseUrl, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) {
      throw new Error(`GitHub release request failed with status ${response.status}`);
    }

    const release = (await response.json()) as GitHubRelease;
    const version = getVersion(release.tag_name);
    const currentVersion = getVersion(import.meta.env.VITE_APP_VERSION);
    if (!version || !currentVersion || compareVersions(version, currentVersion) <= 0) {
      return null;
    }

    const downloadUrl = findDownloadUrl(release.assets);
    if (!downloadUrl) {
      logger.warn("Latest release has no compatible download asset", {
        platform: getPlatformLabel(),
        version,
      });
      return null;
    }

    return { version, downloadUrl };
  } catch (reason: unknown) {
    logger.warn("Latest GitHub release check failed", reason);
    return null;
  }
}

/**
 * Selects the preferred installer asset for the current platform.
 * @param assets Untrusted assets returned by GitHub.
 * @returns Direct download URL, or null when no compatible asset exists.
 */
function findDownloadUrl(assets: unknown): string | null {
  if (!Array.isArray(assets)) return null;

  const validAssets = assets.filter(isGitHubAsset);
  const platform = getPlatformLabel();
  const asset = validAssets.find(({ name }) => {
    if (platform === "Android") return /\.apk$/i.test(name);
    if (platform === "Windows") return /\.exe$/i.test(name);
    if (platform === "macOS") return /\.dmg$/i.test(name);
    if (platform === "Linux") {
      return /\.AppImage$/i.test(name) || /\.rpm$/i.test(name);
    }
    return false;
  });

  return asset?.browser_download_url ?? null;
}

/**
 * Validates a GitHub release asset.
 * @param asset Unknown GitHub response value.
 * @returns Whether the value contains a usable asset name and URL.
 */
function isGitHubAsset(asset: unknown): asset is ValidGitHubAsset {
  if (!asset || typeof asset !== "object") return false;
  const candidate = asset as GitHubAsset;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.browser_download_url === "string" &&
    candidate.browser_download_url.startsWith("https://github.com/")
  );
}

/**
 * Normalizes a release version tag.
 * @param value Release tag or version.
 * @returns Normalized semantic version, or null.
 */
function getVersion(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : null;
}

/**
 * Compares normalized semantic versions.
 * @param left First version.
 * @param right Second version.
 * @returns Positive when left is newer, negative when older, otherwise zero.
 */
function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}
