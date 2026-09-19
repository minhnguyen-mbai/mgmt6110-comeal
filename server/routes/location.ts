import { Router, Request, Response } from 'express';
import { searchOneMap, getWalkingRoute } from '../lib/location';
import type {
  LocationErrorCode,
  LocationFailure,
  RouteSuccess,
  SearchSuccess,
} from '../lib/location';
import { getBatchById } from '../data/marketplaceBatches';

export const locationRouter = Router();

/** Normalized error code -> HTTP status. The body is always JSON. */
const STATUS_BY_CODE: Record<LocationErrorCode, number> = {
  INVALID_LOCATION_QUERY: 400,
  LOCATION_NOT_FOUND: 404,
  LOCATION_RATE_LIMITED: 429,
  LOCATION_PROVIDER_AUTH_ERROR: 503,
  LOCATION_PROVIDER_ERROR: 502,
  LOCATION_TIMEOUT: 504,
};

/**
 * Explicit guard: this project compiles without `strict`, so discriminant
 * narrowing on `ok` is not reliable here. Checking through a type predicate
 * keeps the failure branches type-safe.
 */
function isLocationFailure(
  value: SearchSuccess | RouteSuccess | LocationFailure
): value is LocationFailure {
  return value.ok === false;
}

function sendFailure(res: Response, code: LocationErrorCode, message: string) {
  return res.status(STATUS_BY_CODE[code] ?? 502).json({ ok: false, code, message });
}

/**
 * GET /api/location/search?query=...
 *
 * Returns every match so the caller can disambiguate. This endpoint never
 * silently picks one result.
 */
locationRouter.get('/search', async (req: Request, res: Response) => {
  const query = (req.query.query ?? req.query.q) as string | undefined;

  const result = await searchOneMap(query ?? '');
  if (isLocationFailure(result)) return sendFailure(res, result.code, result.message);

  return res.json({
    ok: true,
    results: result.results,
    source: result.source,
  });
});

/**
 * GET /api/location/distance
 *
 * Primary contract (explicit coordinates):
 *   ?fromLat=&fromLng=&toLat=&toLng=
 *
 * Convenience form for cook pickup points, which keeps cook coordinates on the
 * server and costs the client one round trip instead of two:
 *   ?fromLat=&fromLng=&mealBatchId=drop_001
 *
 * Always a real OneMap walking route. There is no straight-line fallback: if
 * routing fails the caller shows "Distance unavailable".
 */
locationRouter.get('/distance', async (req: Request, res: Response) => {
  const num = (v: unknown) => (v === undefined || v === null || v === '' ? NaN : Number(v));

  const fromLat = num(req.query.fromLat);
  const fromLng = num(req.query.fromLng);

  if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng)) {
    return sendFailure(
      res,
      'INVALID_LOCATION_QUERY',
      'fromLat and fromLng are required and must be numbers.'
    );
  }

  let toLat = num(req.query.toLat);
  let toLng = num(req.query.toLng);

  const mealBatchId = req.query.mealBatchId as string | undefined;
  if (mealBatchId && (!Number.isFinite(toLat) || !Number.isFinite(toLng))) {
    const batch = getBatchById(mealBatchId);
    if (!batch) {
      return res.status(404).json({
        ok: false,
        code: 'MEAL_NOT_FOUND',
        message: `Meal batch "${mealBatchId}" not found`,
      });
    }

    // Strip the human-facing parenthetical ("(Void Deck near Lift B)") which is
    // guidance for neighbours, not part of a geocodable address.
    const geocodable = batch.pickupLocation.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    const lookup = await searchOneMap(geocodable);

    // Propagate the real reason: an auth/provider problem must not be reported
    // as "address not found".
    if (isLocationFailure(lookup)) return sendFailure(res, lookup.code, lookup.message);
    if (lookup.results.length === 0) {
      return sendFailure(
        res,
        'LOCATION_NOT_FOUND',
        'Could not resolve the pickup location for this meal batch.'
      );
    }

    // Curated project address, so the top match is unambiguous here.
    toLat = lookup.results[0].latitude;
    toLng = lookup.results[0].longitude;
  }

  if (!Number.isFinite(toLat) || !Number.isFinite(toLng)) {
    return sendFailure(
      res,
      'INVALID_LOCATION_QUERY',
      'Provide either toLat and toLng, or mealBatchId.'
    );
  }

  const route = await getWalkingRoute(fromLat, fromLng, toLat, toLng);
  if (isLocationFailure(route)) return sendFailure(res, route.code, route.message);

  return res.json(route);
});
