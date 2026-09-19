import { safeLog } from './safeLog';

const ONEMAP_SEARCH_URL = 'https://www.onemap.gov.sg/api/common/elastic/search';
const ONEMAP_ROUTE_URL = 'https://www.onemap.gov.sg/api/public/routingsvc/route';

/**
 * Standard known coordinates for key Singapore residential hubs (WGS84)
 * used as reliable instant fallback or anchor references.
 */
export const KNOWN_SINGAPORE_COORDS: Record<string, { latitude: number; longitude: number }> = {
  'clementi': { latitude: 1.3151, longitude: 103.7652 },
  'jurong east': { latitude: 1.3329, longitude: 103.7436 },
  'jurong west': { latitude: 1.3404, longitude: 103.7050 },
  'tampines': { latitude: 1.3533, longitude: 103.9452 },
  'bedok': { latitude: 1.3236, longitude: 103.9273 },
  'bishan': { latitude: 1.3508, longitude: 103.8485 },
  'queenstown': { latitude: 1.2942, longitude: 103.8061 },
  'bugis': { latitude: 1.3006, longitude: 103.8561 },
};

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in kilometres.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

export function getDistanceBand(distanceKm: number): string {
  if (distanceKm < 1) return '<1km';
  if (distanceKm <= 2) return '1-2km';
  if (distanceKm <= 5) return '2-5km';
  return '>5km';
}

export async function searchOneMap(query: string) {
  if (!query || query.trim().length === 0) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'Query string required' };
  }

  const cleanQuery = query.trim();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const url = `${ONEMAP_SEARCH_URL}?searchVal=${encodeURIComponent(cleanQuery)}&returnGeom=Y&getAddrDetails=Y`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (process.env.ONEMAP_API_KEY) {
      headers['Authorization'] = process.env.ONEMAP_API_KEY;
    }

    const res = await fetch(url, { signal: controller.signal, headers });
    if (!res.ok) {
      throw new Error(`OneMap responded with HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawResults = data.results || [];

    const results = rawResults.slice(0, 5).map((item: any) => ({
      name: item.ADDRESS || item.SEARCHVAL,
      building: item.BUILDING || item.ROAD_NAME,
      postal: item.POSTAL || '',
      latitude: parseFloat(item.LATITUDE),
      longitude: parseFloat(item.LONGITUDE),
    }));

    return {
      ok: true,
      source: 'onemap_search',
      totalFound: data.found || results.length,
      results,
    };
  } catch (err: any) {
    safeLog('warn', 'OneMap search request failed', { query: cleanQuery, error: err?.message });
    // Safe graceful fallback: return known Singapore coordinates if matched
    const known = KNOWN_SINGAPORE_COORDS[cleanQuery.toLowerCase()];
    if (known) {
      return {
        ok: true,
        source: 'local_geographic_directory',
        results: [
          {
            name: `${cleanQuery.toUpperCase()}, Singapore`,
            building: cleanQuery,
            postal: '',
            latitude: known.latitude,
            longitude: known.longitude,
          },
        ],
      };
    }

    return {
      ok: false,
      code: 'LOCATION_UNAVAILABLE',
      message: 'Location search is temporarily unavailable.',
      results: [],
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function parseCoords(val: string): Promise<{ latitude: number; longitude: number } | null> {
  const parts = val.split(',').map((p) => parseFloat(p.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { latitude: parts[0], longitude: parts[1] };
  }

  // Check known coords
  const clean = val.toLowerCase().trim();
  if (KNOWN_SINGAPORE_COORDS[clean]) {
    return KNOWN_SINGAPORE_COORDS[clean];
  }

  // Geocode via OneMap search
  const searchResult = await searchOneMap(val);
  if (searchResult.ok && searchResult.results && searchResult.results.length > 0) {
    return {
      latitude: searchResult.results[0].latitude,
      longitude: searchResult.results[0].longitude,
    };
  }

  return null;
}

export async function calculateDistance(from: string, to: string) {
  if (!from || !to) {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      message: 'Both "from" and "to" parameters are required',
    };
  }

  const fromCoords = await parseCoords(from);
  const toCoords = await parseCoords(to);

  if (!fromCoords || !toCoords) {
    return {
      ok: false,
      code: 'LOCATION_UNAVAILABLE',
      message: "We couldn't calculate distance right now.",
    };
  }

  // If ONEMAP_API_KEY is configured, attempt real routing via OneMap Routing Service
  if (process.env.ONEMAP_API_KEY) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const routeUrl = `${ONEMAP_ROUTE_URL}?start=${fromCoords.latitude},${fromCoords.longitude}&end=${toCoords.latitude},${toCoords.longitude}&routeType=walk`;
      const res = await fetch(routeUrl, {
        signal: controller.signal,
        headers: {
          Authorization: process.env.ONEMAP_API_KEY,
        },
      });

      if (res.ok) {
        const routeData = await res.json();
        // OneMap walk route returns total_distance in meters
        if (routeData?.route_summary?.total_distance) {
          const meters = routeData.route_summary.total_distance;
          const distanceKm = Math.round((meters / 1000) * 10) / 10;
          return {
            ok: true,
            source: 'onemap_routing',
            distanceKm,
            distanceBand: getDistanceBand(distanceKm),
            estimatedTravelTimeMinutes: Math.round(routeData.route_summary.total_time / 60) || undefined,
          };
        }
      }
    } catch (err: any) {
      safeLog('warn', 'OneMap routing service call failed, falling back to Haversine', {
        error: err?.message,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  // Geographic Haversine calculation (real coordinate spherical distance)
  const distanceKm = calculateHaversineDistanceKm(
    fromCoords.latitude,
    fromCoords.longitude,
    toCoords.latitude,
    toCoords.longitude
  );

  return {
    ok: true,
    source: 'geographic_haversine',
    distanceKm,
    distanceBand: getDistanceBand(distanceKm),
  };
}
