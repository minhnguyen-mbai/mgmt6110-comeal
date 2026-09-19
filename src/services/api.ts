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

export interface DistanceResponse {
  ok: boolean;
  source?: string;
  distanceKm?: number;
  distanceBand?: string;
  code?: string;
  message?: string;
}

export interface LocationSearchResponse {
  ok: boolean;
  source?: string;
  results: Array<{
    name: string;
    building: string;
    postal: string;
    latitude: number;
    longitude: number;
  }>;
}

export interface HealthResponse {
  service: string;
  ok: boolean;
  weatherProviderReachable: boolean;
  locationProviderConfigured: boolean;
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

export async function fetchDistance(from: string, to: string): Promise<DistanceResponse> {
  try {
    const url = `/api/location/distance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, code: 'LOCATION_UNAVAILABLE', message: "We couldn't calculate distance right now." };
    }
    return await res.json();
  } catch {
    return { ok: false, code: 'LOCATION_UNAVAILABLE', message: "We couldn't calculate distance right now." };
  }
}

export async function searchLocation(query: string): Promise<LocationSearchResponse> {
  try {
    const res = await fetch(`/api/location/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) {
      return { ok: false, results: [] };
    }
    return await res.json();
  } catch {
    return { ok: false, results: [] };
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
