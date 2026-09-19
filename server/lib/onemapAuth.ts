/**
 * CoMeal SG - OneMap Authentication Helper
 *
 * The single source of OneMap access tokens for the whole server. Nothing else
 * should call the OneMap auth endpoint directly.
 *
 * Contract (verified against the live provider):
 *   POST https://www.onemap.gov.sg/api/auth/post/getToken
 *   body { email, password }
 *   success -> { access_token, expiry_timestamp }   expiry is UNIX seconds
 *   failure -> HTTP 4xx with { error: "..." }
 *
 * Tokens last roughly 3 days. They are held in memory only: never written to
 * disk, never logged, never returned through any /api route.
 */
import { safeLog } from './safeLog';

const ONEMAP_TOKEN_URL = 'https://www.onemap.gov.sg/api/auth/post/getToken';

/** Refresh this long before real expiry so in-flight requests cannot race it. */
const EXPIRY_SAFETY_MARGIN_MS = 5 * 60 * 1000; // 5 minutes

/** Provider auth call timeout. */
const AUTH_TIMEOUT_MS = 6000;

interface CachedToken {
  token: string;
  /** Absolute epoch ms at which this token must no longer be used. */
  expiresAtMs: number;
}

let cachedToken: CachedToken | null = null;
/** De-duplicates concurrent refreshes so a burst of cards triggers one auth call. */
let inFlight: Promise<string | null> | null = null;

export type OneMapAuthFailure =
  | 'ONEMAP_CREDENTIALS_MISSING'
  | 'ONEMAP_AUTH_REJECTED'
  | 'ONEMAP_AUTH_TIMEOUT'
  | 'ONEMAP_AUTH_UNREACHABLE';

let lastFailure: OneMapAuthFailure | null = null;

/** True when both server-side credentials are present (never reveals values). */
export function hasOneMapCredentials(): boolean {
  return Boolean(process.env.ONEMAP_EMAIL && process.env.ONEMAP_PASSWORD);
}

export function getLastAuthFailure(): OneMapAuthFailure | null {
  return lastFailure;
}

function tokenIsUsable(t: CachedToken | null): t is CachedToken {
  return Boolean(t && Date.now() < t.expiresAtMs - EXPIRY_SAFETY_MARGIN_MS);
}

async function requestNewToken(): Promise<string | null> {
  if (!hasOneMapCredentials()) {
    lastFailure = 'ONEMAP_CREDENTIALS_MISSING';
    safeLog('warn', 'OneMap credentials are not configured');
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    const res = await fetch(ONEMAP_TOKEN_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: process.env.ONEMAP_EMAIL,
        password: process.env.ONEMAP_PASSWORD,
      }),
    });

    const body: any = await res.json().catch(() => null);

    // The provider signals auth problems both by status and by an `error` field.
    if (!res.ok || !body || body.error || !body.access_token) {
      lastFailure = 'ONEMAP_AUTH_REJECTED';
      // Deliberately does NOT log the provider message verbatim: it can echo
      // back credential details.
      safeLog('warn', 'OneMap authentication rejected', { httpStatus: res.status });
      cachedToken = null;
      return null;
    }

    // expiry_timestamp is UNIX seconds; fall back to 3 days if absent/odd.
    const expirySeconds = Number(body.expiry_timestamp);
    const expiresAtMs =
      Number.isFinite(expirySeconds) && expirySeconds > 0
        ? expirySeconds * 1000
        : Date.now() + 3 * 24 * 60 * 60 * 1000;

    cachedToken = { token: String(body.access_token), expiresAtMs };
    lastFailure = null;
    safeLog('info', 'OneMap access token acquired', {
      expiresAt: new Date(expiresAtMs).toISOString(),
    });
    return cachedToken.token;
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    lastFailure = aborted ? 'ONEMAP_AUTH_TIMEOUT' : 'ONEMAP_AUTH_UNREACHABLE';
    safeLog('warn', 'OneMap authentication call failed', { aborted });
    cachedToken = null;
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Returns a usable token, reusing the cached one until it nears expiry.
 * Concurrent callers share a single in-flight refresh.
 */
export async function getOneMapToken(): Promise<string | null> {
  if (tokenIsUsable(cachedToken)) return cachedToken.token;
  if (inFlight) return inFlight;

  inFlight = requestNewToken().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Drops the cached token so the next call re-authenticates. */
export function invalidateOneMapToken(): void {
  cachedToken = null;
}

/**
 * Runs `attempt` with a valid token. If the provider reports the token is
 * expired/invalid, refreshes ONCE and retries ONCE. Never loops further.
 */
export async function withOneMapToken<T>(
  attempt: (token: string) => Promise<{ authExpired: boolean; value: T }>
): Promise<{ ok: true; value: T } | { ok: false; reason: OneMapAuthFailure | 'ONEMAP_AUTH_RETRY_EXHAUSTED' }> {
  const token = await getOneMapToken();
  if (!token) return { ok: false, reason: lastFailure ?? 'ONEMAP_AUTH_UNREACHABLE' };

  const first = await attempt(token);
  if (!first.authExpired) return { ok: true, value: first.value };

  // One refresh, one retry.
  invalidateOneMapToken();
  const fresh = await getOneMapToken();
  if (!fresh) return { ok: false, reason: lastFailure ?? 'ONEMAP_AUTH_UNREACHABLE' };

  const second = await attempt(fresh);
  if (second.authExpired) {
    safeLog('warn', 'OneMap still reports invalid token after one refresh; giving up');
    return { ok: false, reason: 'ONEMAP_AUTH_RETRY_EXHAUSTED' };
  }
  return { ok: true, value: second.value };
}

/**
 * Health probe: reports whether a token can actually be obtained.
 * Returns a boolean only - never the token itself.
 */
export async function probeOneMapAuth(): Promise<boolean> {
  if (!hasOneMapCredentials()) return false;
  const token = await getOneMapToken();
  return Boolean(token);
}
