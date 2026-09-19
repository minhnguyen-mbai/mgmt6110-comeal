import { safeLog } from './safeLog';

const WEATHER_API_URL = 'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast';

/**
 * PRODUCT DECISION - CACHE DURATION:
 * The Singapore National Environment Agency (NEA) 2-Hour Forecast updates approximately
 * every 30 to 60 minutes. An in-memory cache TTL of 15 minutes (900,000 ms) and a 5-minute
 * public HTTP Cache-Control header balance real-time freshness against unnecessary third-party
 * outbound network latency on concurrent meal browse sessions.
 */
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * PRODUCT DECISION - DEFAULT PROTOTYPE AREA:
 * When no explicit ?area= parameter is supplied by the frontend (e.g. general landing state),
 * "Clementi" is used as the temporary prototype default for CoMeal Singapore pilots.
 * The system does not imply or simulate automated GPS/device location detection.
 */
export const DEFAULT_PROTOTYPE_AREA = 'Clementi';

interface CachedWeather {
  data: any;
  timestamp: number;
}

let weatherCache: CachedWeather | null = null;

export interface NormalizedWeatherSuccess {
  ok: true;
  source: 'data.gov.sg';
  area: string;
  forecast: string;
  lastUpdated: string;
  validFrom?: string;
  validUntil?: string;
  validPeriod?: string;
  contextualNote: string;
}

export interface NormalizedWeatherError {
  ok: false;
  code: 'WEATHER_AREA_NOT_FOUND' | 'WEATHER_UNAVAILABLE';
  message?: string;
  area?: string;
  contextualNote?: string;
}

export type NormalizedWeatherResponse = NormalizedWeatherSuccess | NormalizedWeatherError;

/**
 * Generates neutral contextual copy.
 * Product requirement: Do not automatically recommend delivery based on weather;
 * preserve equal user agency for both void deck pickup and delivery.
 */
function generateContextualNote(forecast: string, area: string): string {
  const fLower = forecast.toLowerCase();
  if (fLower.includes('rain') || fLower.includes('shower') || fLower.includes('thunder')) {
    return `Showers expected over ${area}. Void deck pickup and delivery remain available.`;
  }
  if (fLower.includes('cloudy') || fLower.includes('overcast')) {
    return `Cloudy & breezy over ${area}. Void deck pickup and delivery are operating smoothly.`;
  }
  if (fLower.includes('fair') || fLower.includes('sun') || fLower.includes('clear')) {
    return `Fair weather over ${area}. Void deck pickup and delivery are operating smoothly.`;
  }
  return `Weather over ${area}: ${forecast}. Void deck pickup and delivery operating as scheduled.`;
}

/**
 * Fetches raw 2-hour forecast payload from data.gov.sg with timeout and caching.
 */
export async function fetchRawWeatherData(): Promise<any> {
  const now = Date.now();
  if (weatherCache && now - weatherCache.timestamp < CACHE_TTL_MS) {
    return weatherCache.data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000); // 4-second provider timeout

  try {
    const res = await fetch(WEATHER_API_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Weather provider responded with HTTP ${res.status}`);
    }

    const json = await res.json();
    if (!json?.data?.items || !Array.isArray(json.data.items) || json.data.items.length === 0) {
      throw new Error('Invalid or empty provider response structure');
    }

    weatherCache = {
      data: json,
      timestamp: now,
    };
    safeLog('info', 'Fetched fresh Singapore weather from data.gov.sg');
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Resolves weather forecast for a requested area.
 * 
 * Rules:
 * 1. If no area supplied, use DEFAULT_PROTOTYPE_AREA (Clementi).
 * 2. If requested area does not exist in provider forecasts, return WEATHER_AREA_NOT_FOUND.
 *    Do NOT silently substitute another area.
 * 3. If provider fails or times out, return WEATHER_UNAVAILABLE.
 */
export async function getWeatherForArea(
  requestedArea?: string
): Promise<NormalizedWeatherResponse> {
  // Step 3: Default Area Prototype Decision
  const trimmed = requestedArea?.trim();
  const targetArea = (!trimmed || trimmed.toLowerCase() === 'all')
    ? DEFAULT_PROTOTYPE_AREA
    : trimmed;

  try {
    const rawData = await fetchRawWeatherData();
    const item = rawData?.data?.items?.[0];
    const forecasts: Array<{ area: string; forecast: string }> = item?.forecasts || [];

    // Find the forecast matching the requested area (case-insensitive)
    const matched = forecasts.find(
      (f) => f.area.toLowerCase() === targetArea.toLowerCase()
    );

    // Step 4: Invalid Area Handling - do NOT silently substitute another area
    if (!matched) {
      safeLog('warn', 'Requested weather area not found in provider', { requestedArea: targetArea });
      return {
        ok: false,
        code: 'WEATHER_AREA_NOT_FOUND',
        message: 'Weather context is temporarily unavailable.',
        contextualNote: 'Weather context is temporarily unavailable.',
      };
    }

    // Step 2: Normalized Response using actual provider fields
    const lastUpdated = item?.update_timestamp || item?.timestamp || new Date().toISOString();
    const validFrom = item?.valid_period?.start;
    const validUntil = item?.valid_period?.end;
    const validPeriod = item?.valid_period?.text || 'Next 2 hours';
    const contextualNote = generateContextualNote(matched.forecast, matched.area);

    return {
      ok: true,
      source: 'data.gov.sg',
      area: matched.area,
      forecast: matched.forecast,
      lastUpdated,
      validFrom,
      validUntil,
      validPeriod,
      contextualNote,
    };
  } catch (err: any) {
    // Step 5: Provider failure handling with safe error code
    safeLog('warn', 'Weather provider unavailable or timed out', { error: err?.message });
    return {
      ok: false,
      code: 'WEATHER_UNAVAILABLE',
      message: 'Weather context is temporarily unavailable.',
      contextualNote: 'Weather context is temporarily unavailable.',
    };
  }
}

// Backward-compatible alias for existing imports
export const getWeatherForNeighbourhood = getWeatherForArea;
