import { Router, Request, Response } from 'express';
import { getStorageStatus } from '../lib/storage';
import { fetchRawWeatherData } from '../lib/weather';
import { hasOneMapCredentials, probeOneMapAuth } from '../lib/onemapAuth';

export const healthRouter = Router();

/**
 * Upper bound for each provider probe.
 *
 * This route is a deployment probe first and a provider report second, so it
 * must always answer quickly with JSON. The provider clients have their own
 * 4-8s timeouts; running them sequentially could exceed a serverless function's
 * limit and return a platform 504 instead of a response. Each probe is capped
 * here and they run concurrently, so total latency stays near PROBE_TIMEOUT_MS.
 */
const PROBE_TIMEOUT_MS = 2500;

/** Resolves to `fallback` if the probe rejects or outruns the cap. */
async function probe<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const done = (value: T) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    const timer = setTimeout(() => done(fallback), PROBE_TIMEOUT_MS);
    work()
      .then((value) => {
        clearTimeout(timer);
        done(value);
      })
      .catch(() => {
        clearTimeout(timer);
        done(fallback);
      });
  });
}

healthRouter.get('/', async (_req: Request, res: Response) => {
  // Cheap, local facts first: these alone prove the function is running.
  const locationConfigured = hasOneMapCredentials();
  let storageMode = 'unavailable';
  let storageConfigured = false;
  try {
    const storageStatus = getStorageStatus();
    storageConfigured = storageStatus.configured;
    storageMode = storageStatus.mode;
  } catch {
    // Read-only or unavailable filesystem must not fail the probe.
  }

  // Both provider checks are optional and run concurrently. A failure,
  // timeout, or bad OneMap credential downgrades a flag - it never throws and
  // never prevents this route from returning 200 JSON.
  const [weatherReachable, locationAuthenticated] = await Promise.all([
    probe(async () => {
      const raw = await fetchRawWeatherData();
      return Boolean(raw && raw.code === 0);
    }, false),
    probe(async () => (locationConfigured ? await probeOneMapAuth() : false), false),
  ]);

  // No token, email or password is ever included in this payload.
  return res.status(200).json({
    service: 'CoMeal',
    ok: true,
    weatherProviderReachable: weatherReachable,
    locationProviderConfigured: locationConfigured,
    locationProviderAuthenticated: locationAuthenticated,
    storageConfigured,
    storageMode,
    checkedAt: new Date().toISOString(),
  });
});
