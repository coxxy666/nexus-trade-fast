const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = rawBase.replace(/\/+$/, '');

export function apiUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) return normalizedPath;
  return `${API_BASE_URL}${normalizedPath}`;
}

