/**
 * Centralized API configuration.
 *
 * Resolution order (highest priority first):
 *  1. VITE_API_URL build-time env var  (set in Vercel project settings → points to Render backend)
 *  2. If running on localhost/127.0.0.1 → fall back to http://127.0.0.1:8000/api  (local dev)
 *  3. Otherwise → relative "/api"       (same-origin proxy / server-side rendering hybrid)
 *
 * Keeping all API calls in one place means changing the backend URL is a
 * single env-var change in Vercel — no code change needed.
 */

function resolveApiBase(): string {
  // 1. Build-time env var set in Vercel (or a local .env file)
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/$/, '');

  // 2. Running on localhost — use the local backend dev server
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');
  if (isLocal) return 'http://127.0.0.1:8000/api';

  // 3. Deployed but no env var set → relative path (avoids CORS, works if backend
  //    is served at the same origin or via a reverse proxy).
  return '/api';
}

export const API_BASE = resolveApiBase();

/**
 * Thin wrapper around fetch() that:
 *  - Prepends API_BASE to relative paths
 *  - Throws a descriptive Error (with status + body) on non-2xx responses
 *  - Is typed so callers just await apiFetch() without manual .ok checks
 */
export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  // Support both relative paths ("/products") and already-absolute URLs
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const res = await fetch(url, init);

  if (!res.ok) {
    // Try to extract a useful error message from the response body
    let detail = `HTTP ${res.status} ${res.statusText}`;
    try {
      const body = await res.clone().json();
      if (body?.detail) detail = body.detail;
    } catch {
      // body was not JSON — keep the default message
    }
    throw new Error(detail);
  }

  return res;
}

/**
 * Builds a URL safely regardless of whether API_BASE is relative ("/api")
 * or absolute ("https://example.com/api").  Replaces every `new URL(\`${API_BASE}/...\`)` call.
 *
 * Usage:  apiUrl('/products', { page: '1', limit: '10' })
 */
export function apiUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  const base = API_BASE.startsWith('http')
    ? API_BASE
    : `${window.location.origin}${API_BASE}`;

  const url = new URL(`${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });
  }
  return url.toString();
}
