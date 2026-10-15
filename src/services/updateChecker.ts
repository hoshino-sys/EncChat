import { getApiUrl, isCapacitorNative } from './apiConfig';

export interface VersionInfo {
  latestVersion: string;
  versionCode: number;
  downloadUrl: string;
  githubDownloadUrl?: string;
  releaseNotes: string;
  pubDate: string;
  forceUpdate?: boolean;
}

export const CURRENT_VERSION = '1.5.2';
export const CURRENT_VERSION_CODE = 7;

/**
 * Checks for updates from the Cloudflare Worker version endpoint
 */
export async function checkForUpdate(force = false): Promise<VersionInfo | null> {
  try {
    const res = await fetch(getApiUrl('/api/version'));
    if (!res.ok) return null;
    const info: VersionInfo = await res.json();
    if (!info) return null;

    if (force) {
      return info;
    }

    let currentCode = CURRENT_VERSION_CODE;
    if (isCapacitorNative()) {
      try {
        const capacitor = (window as any).Capacitor;
        if (capacitor?.Plugins?.AppUpdate) {
          const appVer = await capacitor.Plugins.AppUpdate.getAppVersion();
          if (appVer && typeof appVer.versionCode === 'number') {
            currentCode = appVer.versionCode;
          }
        }
      } catch (e) {
        console.warn('Failed to query native app version:', e);
      }
    }

    if (info.versionCode > currentCode) {
      return info;
    }
  } catch (err) {
    console.warn('Update check failed:', err);
  }
  return null;
}

/**
 * Starts downloading the APK and triggers Android system package installer
 */
export async function startDownloadAndInstall(url: string): Promise<void> {
  if (isCapacitorNative()) {
    try {
      const capacitor = (window as any).Capacitor;
      if (capacitor?.Plugins?.AppUpdate) {
        await capacitor.Plugins.AppUpdate.downloadAndInstall({ url });
        return;
      }
    } catch (err) {
      console.warn('Native AppUpdate plugin call failed, falling back to browser download:', err);
    }
  }

  // Fallback for Web browser or if plugin is unavailable
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.download = 'moyin-encchat-update.apk';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
