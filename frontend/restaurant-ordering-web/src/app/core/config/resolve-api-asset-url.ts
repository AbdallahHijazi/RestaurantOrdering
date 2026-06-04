import { API_BASE_URL } from './api-config';

/**
 * Resolves API-backed asset URLs for img[src] usage.
 * - null/empty → null
 * - blob: → unchanged (local preview)
 * - http(s) absolute → unchanged when protocol is safe
 * - /uploads/... → prefixed with API origin
 */
export function resolveApiAssetUrl(
  url: string | null | undefined,
  apiBaseUrl: string = API_BASE_URL,
): string | null {
  if (!url?.trim()) {
    return null;
  }

  const trimmed = url.trim();

  if (trimmed.startsWith('blob:')) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return trimmed;
      }
    } catch {
      return null;
    }

    return null;
  }

  if (trimmed.startsWith('/')) {
    return `${apiBaseUrl.replace(/\/$/, '')}${trimmed}`;
  }

  return null;
}
