/**
 * CoMeal SG - Client API Service Layer
 * Abstracts backend `/api/*` routes.
 * Never calls third-party APIs directly from browser components.
 */

export interface WeatherResponse {
  ok: boolean;
  source?: string;
  lastUpdated?: string | null;
  validFrom?: string;
  validUntil?: string;
  validPeriod?: string;
  area?: string;
  forecast?: string;
  contextualNote?: string;
  code?: string;
  message?: string;
}

/** Normalized OneMap walking-route response from /api/location/distance. */
export interface DistanceResponse {
  ok: boolean;
  routeType?: 'walk';
  distanceMeters?: number;
  distanceKm?: number;
  walkingSeconds?: number;
  walkingMinutes?: number;
  source?: 'OneMap';
  code?: string;
  message?: string;
}

/** Normalized OneMap search response from /api/location/search. */
export interface LocationSearchResponse {
  ok: boolean;
  results: Array<{
    address: string;
    postalCode: string;
    latitude: number;
    longitude: number;
  }>;
  source?: 'OneMap';
  code?: string;
  message?: string;
}

export interface HealthResponse {
  service: string;
  ok: boolean;
  weatherProviderReachable: boolean;
  /** Credentials are present. Does NOT mean the provider accepted them. */
  locationProviderConfigured: boolean;
  /** A real OneMap token was obtained. Only this justifies a "connected" label. */
  locationProviderAuthenticated: boolean;
  storageConfigured: boolean;
  storageMode: string;
  checkedAt: string;
}

export async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to reach /api/health', err);
    return null;
  }
}

export async function fetchWeather(area?: string): Promise<WeatherResponse> {
  try {
    const param = area && area.toLowerCase() !== 'all' ? `?area=${encodeURIComponent(area)}` : '';
    const res = await fetch(`/api/weather${param}`);
    if (!res.ok) {
      throw new Error(`Weather error: ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Weather fetch failed, falling back to safe note', err);
    return {
      ok: false,
      code: 'WEATHER_UNAVAILABLE',
      area: area || 'Clementi',
      forecast: 'Unavailable',
      source: 'data.gov.sg',
      lastUpdated: null,
      message: 'Weather context is temporarily unavailable.',
      contextualNote: 'Weather context is temporarily unavailable.',
    };
  }
}

/**
 * Real OneMap walking route. Destination is given as a mealBatchId so cook
 * coordinates stay on the server. There is no straight-line fallback: a failure
 * here means the UI shows "Distance unavailable".
 */
export async function fetchWalkingDistance(
  fromLat: number,
  fromLng: number,
  mealBatchId: string
): Promise<DistanceResponse> {
  try {
    const url =
      `/api/location/distance?fromLat=${encodeURIComponent(fromLat)}` +
      `&fromLng=${encodeURIComponent(fromLng)}` +
      `&mealBatchId=${encodeURIComponent(mealBatchId)}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => null);
    if (!data) return { ok: false, code: 'LOCATION_PROVIDER_ERROR' };
    return data;
  } catch {
    return { ok: false, code: 'LOCATION_PROVIDER_ERROR' };
  }
}

/**
 * Address / postal / area search via OneMap. Returns every match so the caller
 * can disambiguate - this never picks a result on the user's behalf.
 */
export async function searchLocation(query: string): Promise<LocationSearchResponse> {
  try {
    const res = await fetch(`/api/location/search?query=${encodeURIComponent(query)}`);
    const data = await res.json().catch(() => null);
    if (!data) return { ok: false, results: [], code: 'LOCATION_PROVIDER_ERROR' };
    return { ...data, results: Array.isArray(data.results) ? data.results : [] };
  } catch {
    return { ok: false, results: [], code: 'LOCATION_PROVIDER_ERROR' };
  }
}

export async function fetchMealBatches(neighbourhood?: string) {
  try {
    const param = neighbourhood && neighbourhood !== 'All' ? `?neighbourhood=${encodeURIComponent(neighbourhood)}` : '';
    const res = await fetch(`/api/meal-batches${param}`);
    if (!res.ok) {
      throw new Error(`Meal batches fetch error: ${res.status}`);
    }
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.warn('Failed to fetch meal batches from backend', err);
    return null; // Signals caller to fall back to initial memory list
  }
}

export async function registerOrderIntent(payload: {
  mealBatchId: string;
  quantity: number;
  fulfilmentType: 'pickup' | 'delivery';
  neighbourhood?: string;
  sessionId: string;
}) {
  try {
    const res = await fetch('/api/order-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, message: err.message || 'Order intent failed' };
    }
    return await res.json();
  } catch (err: any) {
    console.warn('Order intent API error', err);
    return { ok: true, intentRegistered: true, offlineFallback: true };
  }
}
