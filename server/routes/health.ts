import { Router, Request, Response } from 'express';
import { getStorageStatus } from '../lib/storage';
import { fetchRawWeatherData } from '../lib/weather';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  let weatherReachable = false;
  try {
    const rawWeather = await fetchRawWeatherData();
    weatherReachable = Boolean(rawWeather && rawWeather.code === 0);
  } catch {
    weatherReachable = false;
  }

  const locationConfigured = Boolean(process.env.ONEMAP_API_KEY);
  const storageStatus = getStorageStatus();

  return res.json({
    service: 'CoMeal',
    ok: true,
    weatherProviderReachable: weatherReachable,
    locationProviderConfigured: locationConfigured,
    storageConfigured: storageStatus.configured,
    storageMode: storageStatus.mode,
    checkedAt: new Date().toISOString(),
  });
});
