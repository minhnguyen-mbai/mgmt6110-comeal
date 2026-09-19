/**
 * CoMeal SG - OneMap Location Layer (Search + Walking Routing)
 *
 * All OneMap calls go through the shared token helper in ./onemapAuth.
 * Nothing in this file may be reached from the browser without passing through
 * /api/location/* - the token never leaves the server.
 *
 * VERIFIED PROVIDER BEHAVIOUR (checked against live OneMap):
 *  - Search returns HTTP 200 even when unauthenticated, with an `error` field
 *    in the body alongside results. HTTP status alone is NOT a success signal.
 *  - Routing returns HTTP 401 {"message":"Unauthorized"} without a valid token.
 *  - Route summary fields: route_summary.total_distance (metres),
 *    route_summary.total_time (seconds).
 */
import { safeLog } from './safeLog';
import { withOneMapToken, hasOneMapCredentials } from './onemapAuth';

const ONEMAP_SEARCH_URL = 'https://www.onemap.gov.sg/api/common/elastic/search';
const ONEMAP_ROUTE_URL = 'https://www.onemap.gov.sg/api/public/routingsvc/route';

const SEARCH_TIMEOUT_MS = 6000;
const ROUTE_TIMEOUT_MS = 8000;

/** Geocode results are stable; cache generously. */
const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
/** Walking routes between fixed points are stable too. */
const ROUTE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

export type LocationErrorCode =
  | 'INVALID_LOCATION_QUERY'
  | 'LOCATION_NOT_FOUND'
  | 'LOCATION_PROVIDER_AUTH_ERROR'
  | 'LOCATION_RATE_LIMITED'
  | 'LOCATION_PROVIDER_ERROR'
  | 'LOCATION_TIMEOUT';

export interface NormalizedPlace {
  address: string;
  postalCode: string;
  latitude: number;
  longitude: number;
}

export interface SearchSuccess {
  ok: true;
  results: NormalizedPlace[];
  source: 'OneMap';
}

export interface LocationFailure {
  ok: false;
  code: LocationErrorCode;
  message: string;
}

export interface RouteSuccess {
  ok: true;
  routeType: 'walk';
  distanceMeters: number;
  distanceKm: number;
  walkingSeconds: number;
  walkingMinutes: number;
  source: 'OneMap';
}

const USER_MESSAGES: Record<LocationErrorCode, string> = {
  INVALID_LOCATION_QUERY: 'Enter a Singapore address, postal code or area to check distance.',
  LOCATION_NOT_FOUND: 'No matching Singapore location found.',
  LOCATION_PROVIDER_AUTH_ERROR: 'Distance service is not available right now.',
  LOCATION_RATE_LIMITED: 'Distance service is busy. Try again shortly.',
  LOCATION_PROVIDER_ERROR: 'Distance service is not available right now.',
  LOCATION_TIMEOUT: 'Distance service did not respond in time.',
};

function fail(code: LocationErrorCode): LocationFailure {
  return { ok: false, code, message: USER_MESSAGES[code] };
}

/**
 * OneMap signals auth failure by HTTP 401/403 OR by an `error` string in an
 * otherwise-200 body. Both must be treated as auth failures.
 */
function looksLikeAuthError(status: number, body: any): boolean {
  if (status === 401 || status === 403) return true;
  const msg = String(body?.error ?? body?.message ?? '');
  if (!msg) return false;
  return /token|unauthor|authentic|api key|expired/i.test(msg);
}

function mapHttpToCode(status: number): LocationErrorCode {
  if (status === 429) return 'LOCATION_RATE_LIMITED';
  if (status === 401 || status === 403) return 'LOCATION_PROVIDER_AUTH_ERROR';
  return 'LOCATION_PROVIDER_ERROR';
}

// ───────────────────── authorized provider fetch ───────────────────────────

/**
 * OneMap's published examples are inconsistent about the Authorization header:
 * some endpoints are documented with a bare `<token>`, others with
 * `Bearer <token>`. Rather than hard-code a guess, send the bare token first
 * and retry once with the Bearer prefix if the provider reports an auth
 * problem. The winning form is remembered so this costs one extra call at most,
 * once per process.
 */
let preferredAuthScheme: 'bare' | 'bearer' | null = null;

function authHeader(token: string, scheme: 'bare' | 'bearer'): string {
  return scheme === 'bearer' ? `Bearer ${token}` : token;
}

interface ProviderResponse {
  status: number;
  body: any;
  /** Provider reported an authentication problem under every header form tried. */
  authError: boolean;
  timedOut: boolean;
  networkError: boolean;
}

async function fetchOneMapAuthorized(
  url: string,
  token: string,
  timeoutMs: number
): Promise<ProviderResponse> {
  const order: Array<'bare' | 'bearer'> =
    preferredAuthScheme === 'bearer' ? ['bearer', 'bare']
    : preferredAuthScheme === 'bare' ? ['bare', 'bearer']
    : ['bare', 'bearer'];

  let last: ProviderResponse = {
    status: 0, body: null, authError: true, timedOut: false, networkError: true,
  };

  for (const scheme of order) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json', Authorization: authHeader(token, scheme) },
      });
      const body: any = await res.json().catch(() => null);
      const authError = looksLikeAuthError(res.status, body);

      if (!authError) {
        preferredAuthScheme = scheme;
        return { status: res.status, body, authError: false, timedOut: false, networkError: false };
      }
      last = { status: res.status, body, authError: true, timedOut: false, networkError: false };
    } catch (err: any) {
      const aborted = err?.name === 'AbortError';
      // A timeout or transport failure is not an auth problem; do not burn the
      // second header attempt on it.
      return { status: 0, body: null, authError: false, timedOut: aborted, networkError: !aborted };
    } finally {
      clearTimeout(timeout);
    }
  }

  return last;
}

// ─────────────────────────────── caches ────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const geocodeCache = new Map<string, CacheEntry<NormalizedPlace[]>>();
const routeCache = new Map<string, CacheEntry<RouteSuccess>>();

function cacheGet<T>(store: Map<string, CacheEntry<T>>, key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet<T>(store: Map<string, CacheEntry<T>>, key: string, value: T, ttl: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttl });
}

/** Normalizes an address so equivalent spellings share one cache entry. */
function normalizeAddressKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Route cache key per spec: start + end + routeType. */
function routeKey(
  fromLat: number, fromLng: number, toLat: number, toLng: number, routeType: string
): string {
  const r = (n: number) => n.toFixed(6);
  return `${r(fromLat)},${r(fromLng)}|${r(toLat)},${r(toLng)}|${routeType}`;
}

// ─────────────────────────────── search ────────────────────────────────────

/**
 * Geocodes a free-text Singapore query via OneMap Search.
 * Returns every match (capped) - the caller decides, never this layer.
 */
export async function searchOneMap(query: string): Promise<SearchSuccess | LocationFailure> {
  const cleanQuery = (query ?? '').trim();
  if (cleanQuery.length < 2) return fail('INVALID_LOCATION_QUERY');

  const cacheKey = normalizeAddressKey(cleanQuery);
  const cached = cacheGet(geocodeCache, cacheKey);
  if (cached) {
    return cached.length > 0
      ? { ok: true, results: cached, source: 'OneMap' }
      : fail('LOCATION_NOT_FOUND');
  }

  if (!hasOneMapCredentials()) return fail('LOCATION_PROVIDER_AUTH_ERROR');

  const outcome = await withOneMapToken<SearchSuccess | LocationFailure>(async (token) => {
    const url =
      `${ONEMAP_SEARCH_URL}?searchVal=${encodeURIComponent(cleanQuery)}` +
      `&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

    const resp = await fetchOneMapAuthorized(url, token, SEARCH_TIMEOUT_MS);

    if (resp.timedOut) return { authExpired: false, value: fail('LOCATION_TIMEOUT') };
    if (resp.networkError) {
      safeLog('warn', 'OneMap search request failed (transport)');
      return { authExpired: false, value: fail('LOCATION_PROVIDER_ERROR') };
    }
    if (resp.authError) {
      return { authExpired: true, value: fail('LOCATION_PROVIDER_AUTH_ERROR') };
    }
    if (resp.status < 200 || resp.status >= 300) {
      return { authExpired: false, value: fail(mapHttpToCode(resp.status)) };
    }
    // A 200 carrying a non-auth `error` is still a provider failure.
    if (!resp.body || resp.body.error) {
      return { authExpired: false, value: fail('LOCATION_PROVIDER_ERROR') };
    }

    const raw: any[] = Array.isArray(resp.body.results) ? resp.body.results : [];
    const results: NormalizedPlace[] = raw
      .slice(0, 8)
      .map((item) => ({
        address: String(item.ADDRESS || item.SEARCHVAL || '').trim(),
        postalCode: item.POSTAL && item.POSTAL !== 'NIL' ? String(item.POSTAL) : '',
        latitude: parseFloat(item.LATITUDE),
        longitude: parseFloat(item.LONGITUDE),
      }))
      .filter((p) => p.address && Number.isFinite(p.latitude) && Number.isFinite(p.longitude));

    return { authExpired: false, value: { ok: true as const, results, source: 'OneMap' as const } };
  });

  if (!outcome.ok) return fail('LOCATION_PROVIDER_AUTH_ERROR');

  const value = outcome.value;
  if (!value.ok) return value;

  cacheSet(geocodeCache, cacheKey, value.results, GEOCODE_TTL_MS);
  if (value.results.length === 0) return fail('LOCATION_NOT_FOUND');
  return value;
}

// ─────────────────────────────── routing ───────────────────────────────────

/**
 * Real OneMap walking route between two coordinates.
 *
 * NOTE: there is deliberately NO Haversine fallback here. A straight-line
 * figure is not a walking distance, and presenting one as such was the
 * misleading behaviour this module replaced. On failure the caller surfaces
 * "Distance unavailable".
 */
export async function getWalkingRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteSuccess | LocationFailure> {
  const coords = [fromLat, fromLng, toLat, toLng];
  if (coords.some((c) => !Number.isFinite(c))) return fail('INVALID_LOCATION_QUERY');

  const key = routeKey(fromLat, fromLng, toLat, toLng, 'walk');
  const cached = cacheGet(routeCache, key);
  if (cached) return cached;

  if (!hasOneMapCredentials()) return fail('LOCATION_PROVIDER_AUTH_ERROR');

  const outcome = await withOneMapToken<RouteSuccess | LocationFailure>(async (token) => {
    const url =
      `${ONEMAP_ROUTE_URL}?start=${fromLat},${fromLng}&end=${toLat},${toLng}&routeType=walk`;

    const resp = await fetchOneMapAuthorized(url, token, ROUTE_TIMEOUT_MS);

    if (resp.timedOut) return { authExpired: false, value: fail('LOCATION_TIMEOUT') };
    if (resp.networkError) {
      safeLog('warn', 'OneMap routing request failed (transport)');
      return { authExpired: false, value: fail('LOCATION_PROVIDER_ERROR') };
    }
    if (resp.authError) {
      return { authExpired: true, value: fail('LOCATION_PROVIDER_AUTH_ERROR') };
    }
    if (resp.status < 200 || resp.status >= 300) {
      return { authExpired: false, value: fail(mapHttpToCode(resp.status)) };
    }

    const summary = resp.body?.route_summary;
    const meters = Number(summary?.total_distance);
    const seconds = Number(summary?.total_time);
    if (!summary || !Number.isFinite(meters) || !Number.isFinite(seconds)) {
      safeLog('warn', 'OneMap route response missing route_summary fields');
      return { authExpired: false, value: fail('LOCATION_PROVIDER_ERROR') };
    }

    const success: RouteSuccess = {
      ok: true,
      routeType: 'walk',
      distanceMeters: Math.round(meters),
      distanceKm: Math.round((meters / 1000) * 100) / 100,
      walkingSeconds: Math.round(seconds),
      walkingMinutes: Math.ceil(seconds / 60),
      source: 'OneMap',
    };
    return { authExpired: false, value: success };
  });

  if (!outcome.ok) return fail('LOCATION_PROVIDER_AUTH_ERROR');
  const value = outcome.value;
  if (value.ok) cacheSet(routeCache, key, value, ROUTE_TTL_MS);
  return value;
}

// ──────────────────────── privacy-safe distance band ───────────────────────

/**
 * Coarse band for behavioural analytics. This is the ONLY distance-derived
 * value permitted into event storage - never coordinates or addresses.
 */
export function getDistanceBand(distanceKm: number): string {
  if (distanceKm < 1) return '<1km';
  if (distanceKm <= 2) return '1-2km';
  if (distanceKm <= 5) return '2-5km';
  return '5km+';
}

/**
 * INTERNAL DIAGNOSTIC ONLY - straight-line great-circle distance.
 *
 * NOT a walking distance and MUST NOT be shown to users or returned from any
 * route as though it came from OneMap. Retained for offline sanity checks.
 */
export function haversineStraightLineKm_internalDiagnosticOnly(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

/** Test/maintenance helper. */
export function clearLocationCaches(): void {
  geocodeCache.clear();
  routeCache.clear();
}
