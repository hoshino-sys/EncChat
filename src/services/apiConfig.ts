/**
 * API and WebSocket Endpoint Configuration
 * Seamlessly resolves endpoints across Web (chat.nightstar.top) and Android Capacitor native APK
 */

export const PRODUCTION_ORIGIN = 'https://chat.nightstar.top';
export const PRODUCTION_WS_URL = 'wss://chat.nightstar.top/ws';

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
    return true;
  }
  if (window.location.protocol === 'capacitor:') return true;
  // In Capacitor Android, assets are served over https://localhost
  if (window.location.hostname === 'localhost' && window.location.port !== '5173') {
    return true;
  }
  return false;
}

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If running in Android native WebView or localhost build, use production API base
  if (isCapacitorNative() || (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port !== '5173')) {
    const customApi = typeof window !== 'undefined' ? localStorage.getItem('encchat_custom_api_url') : null;
    if (customApi && customApi.trim()) {
      return `${customApi.trim().replace(/\/+$/, '')}${cleanPath}`;
    }
    const envApi = import.meta.env.VITE_API_URL;
    if (envApi && envApi.trim()) {
      return `${envApi.trim().replace(/\/+$/, '')}${cleanPath}`;
    }
    return `${PRODUCTION_ORIGIN}${cleanPath}`;
  }

  // Web environment (same-origin)
  return cleanPath;
}

export function getDefaultWsUrl(): string {
  if (typeof window === 'undefined') return PRODUCTION_WS_URL;

  let savedCustomUrl = localStorage.getItem('encchat_custom_ws_url');
  if (savedCustomUrl && savedCustomUrl.includes('.workers.dev')) {
    try {
      localStorage.removeItem('encchat_custom_ws_url');
    } catch {}
    savedCustomUrl = null;
  }
  if (savedCustomUrl && savedCustomUrl.trim()) {
    return savedCustomUrl.trim();
  }

  const envWsUrl = import.meta.env.VITE_WS_URL;
  if (envWsUrl && envWsUrl.trim()) {
    return envWsUrl.trim();
  }

  // Native Android APK environment
  if (isCapacitorNative()) {
    return PRODUCTION_WS_URL;
  }

  // Web environment
  const isHttps = window.location.protocol === 'https:';
  const wsProto = isHttps ? 'wss:' : 'ws:';
  if (window.location.port === '5173') {
    return `${wsProto}//${window.location.hostname}:8787/ws`;
  }
  return `${wsProto}//${window.location.host}/ws`;
}
