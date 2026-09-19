import { Router, Request, Response } from 'express';
import { getStorageStatus } from '../lib/storage';
import { fetchRawWeatherData } from '../lib/weather';
import { hasOneMapCredentials, probeOneMapAuth } from '../lib/onemapAuth';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  let weatherReachable = false;
  try {
    const rawWeather = await fetchRawWeatherData();
    weatherReachable = Boolean(rawWeather && rawWeather.code === 0);
  } catch {
    weatherReachable = false;
  }

  // "configured" means the credentials the integration actually needs are
  // present. "authenticated" means a token was really obtained from OneMap.
  // Only the second one justifies telling a user the provider is connected.
  const locationConfigured = hasOneMapCredentials();
  let locationAuthenticated = false;
  try {
    locationAuthenticated = await probeOneMapAuth();
  } catch {
    locationAuthenticated = false;
  }

  const storageStatus = getStorageStatus();

  // NOTE: no token, email or password is ever included in this payload.
  return res.json({
    service: 'CoMeal',
    ok: true,
    weatherProviderReachable: weatherReachable,
    locationProviderConfigured: locationConfigured,
    locationProviderAuthenticated: locationAuthenticated,
    storageConfigured: storageStatus.configured,
    storageMode: storageStatus.mode,
    checkedAt: new Date().toISOString(),
  });
});
