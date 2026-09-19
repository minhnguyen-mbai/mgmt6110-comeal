/**
 * CoMeal SG - Walking Distance Service
 *
 * Fetches real OneMap walking routes through the backend and caches them so a
 * re-render never re-requests a route that is already known.
 *
 * Cache key mirrors the server: user coordinates + meal batch + routeType.
 * Each meal resolves independently, so one failed route cannot blank the others.
 */
import { useEffect, useState } from 'react';
import { DistanceState, UserLocation, WalkingRoute } from '../types';
import { fetchWalkingDistance } from './api';

type Entry =
  | { status: 'ok'; route: WalkingRoute }
  | { status: 'unavailable' };

const routeCache = new Map<string, Entry>();
/** De-duplicates concurrent requests for the same route across cards. */
const inFlight = new Map<string, Promise<Entry>>();

function cacheKey(loc: UserLocation, mealBatchId: string): string {
  return `${loc.latitude.toFixed(6)},${loc.longitude.toFixed(6)}|${mealBatchId}|walk`;
}

async function resolveRoute(loc: UserLocation, mealBatchId: string): Promise<Entry> {
  const key = cacheKey(loc, mealBatchId);

  const cached = routeCache.get(key);
  if (cached) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = fetchWalkingDistance(loc.latitude, loc.longitude, mealBatchId)
    .then((res): Entry => {
      const entry: Entry =
        res && res.ok
          ? {
              status: 'ok',
              route: {
                distanceMeters: res.distanceMeters,
                distanceKm: res.distanceKm,
                walkingSeconds: res.walkingSeconds,
                walkingMinutes: res.walkingMinutes,
              },
            }
          : { status: 'unavailable' };
      routeCache.set(key, entry);
      return entry;
    })
    .catch((): Entry => {
      const entry: Entry = { status: 'unavailable' };
      routeCache.set(key, entry);
      return entry;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

/**
 * Walking distance for one meal batch from the user's selected location.
 * Returns 'idle' until a location has been chosen, so nothing numeric is shown
 * before there is a real route to show.
 */
export function useWalkingDistance(
  mealBatchId: string,
  userLocation: UserLocation | null,
  enabled = true
): DistanceState {
  const [state, setState] = useState<DistanceState>({ status: 'idle' });

  useEffect(() => {
    if (!userLocation || !enabled) {
      setState({ status: 'idle' });
      return;
    }

    const key = cacheKey(userLocation, mealBatchId);
    const cached = routeCache.get(key);
    if (cached) {
      setState(cached);
      return;
    }

    let active = true;
    setState({ status: 'loading' });
    resolveRoute(userLocation, mealBatchId).then((entry) => {
      if (active) setState(entry);
    });

    return () => {
      active = false;
    };
  }, [mealBatchId, userLocation?.latitude, userLocation?.longitude, enabled]);

  return state;
}

/** Distance to 1 decimal place, e.g. "1.2 km". */
export function formatKm(distanceKm: number): string {
  return `${distanceKm.toFixed(1)} km`;
}

/** Whole minutes, e.g. "16 min walk". */
export function formatWalk(walkingMinutes: number): string {
  return `${walkingMinutes} min walk`;
}

/**
 * Coarse band for analytics. This is the ONLY distance value that may be sent
 * to event tracking - never coordinates, addresses or exact distances.
 */
export function distanceBand(distanceKm: number): string {
  if (distanceKm < 1) return '<1km';
  if (distanceKm <= 2) return '1-2km';
  if (distanceKm <= 5) return '2-5km';
  return '5km+';
}

/** Clears cached routes, e.g. when the user picks a different location. */
export function clearRouteCache(): void {
  routeCache.clear();
  inFlight.clear();
}
