import { Router, Request, Response } from 'express';
import { getWeatherForArea } from '../lib/weather';

export const weatherRouter = Router();

weatherRouter.get('/', async (req: Request, res: Response) => {
  // Test hook: allow verified simulation of provider failure for test suites
  if (req.query.simulate_failure === 'true') {
    return res.status(200).json({
      ok: false,
      code: 'WEATHER_UNAVAILABLE',
    });
  }

  // Support primary ?area= parameter as requested in Step 1
  const areaQuery = (req.query.area || req.query.neighbourhood) as string | undefined;
  const result = await getWeatherForArea(areaQuery);

  if (!result.ok) {
    // Return normalized error contract without exposing raw provider details
    return res.status(200).json(result);
  }

  // Set HTTP Cache header: 5 min client/CDN cache, 10 min background revalidation
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  return res.json(result);
});
