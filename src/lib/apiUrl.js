const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = rawBase.replace(/\/+$/, '');
const RAILWAY_FALLBACK_BASE = 'https://nexus-trade-fast-production.up.railway.app';

export function apiUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL) return `${API_BASE_URL}${normalizedPath}`;

  const host = typeof window !== 'undefined' ? String(window.location.hostname || '').toLowerCase() : '';
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  if (!isLocalHost) {
    return `${RAILWAY_FALLBACK_BASE}${normalizedPath}`;
  }
  return normalizedPath;
}
