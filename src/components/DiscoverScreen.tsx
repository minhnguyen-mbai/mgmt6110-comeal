import React, { useState, useEffect } from 'react';
import { MealDrop, DayBucket, UserLocation } from '../types';
import {
  MapPin,
  Users,
  Clock,
  CloudRain,
  Star,
  ChevronRight,
  ShieldCheck,
  Tag,
  Truck,
  ShoppingBag,
  Sparkles,
  Search,
  Loader2,
} from 'lucide-react';
import { trackEvent } from '../services/tracker';
import { fetchWeather, WeatherResponse, searchLocation, fetchHealth } from '../services/api';
import { useWalkingDistance, formatKm, distanceBand } from '../services/distance';

interface DiscoverScreenProps {
  drops: MealDrop[];
  onSelectDrop: (dropId: string) => void;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  selectedDay: DayBucket | 'all';
  onDayChange: (day: DayBucket | 'all') => void;
  userLocation: UserLocation | null;
  onUserLocationChange: (loc: UserLocation | null) => void;
}

const LOCATIONS = ['All', 'Clementi', 'Tampines', 'Bugis', 'Queenstown', 'Jurong East'];

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  drops,
  onSelectDrop,
  selectedLocation,
  onLocationChange,
  selectedDay,
  onDayChange,
  userLocation,
  onUserLocationChange,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  // Location search (real OneMap geocoding via the backend).
  const [locQuery, setLocQuery] = useState('');
  const [locResults, setLocResults] = useState<UserLocation[]>([]);
  const [locSearching, setLocSearching] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [providerReady, setProviderReady] = useState<boolean | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [weatherFailed, setWeatherFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setWeatherFailed(false);
    fetchWeather(selectedLocation === 'All' ? undefined : selectedLocation)
      .then((res) => {
        if (!active) return;
        if (res && res.ok !== false) {
          setWeatherData(res);
          setWeatherFailed(false);
        } else {
          setWeatherData(res);
          setWeatherFailed(true);
        }
      })
      .catch(() => {
        if (!active) return;
        setWeatherFailed(true);
      });

    return () => {
      active = false;
    };
  }, [selectedLocation]);

  // Factual provider status - never inferred from configuration alone.
  useEffect(() => {
    let active = true;
    fetchHealth().then((h) => {
      if (active) setProviderReady(h ? Boolean(h.locationProviderAuthenticated) : false);
    });
    return () => {
      active = false;
    };
  }, []);

  const runLocationSearch = async (raw: string) => {
    const query = raw.trim();
    if (query.length < 2) {
      setLocError('Enter a block, postal code or area.');
      setLocResults([]);
      return;
    }

    setLocSearching(true);
    setLocError(null);
    setLocResults([]);

    const res = await searchLocation(query);
    setLocSearching(false);

    if (!res.ok || res.results.length === 0) {
      setLocError(res.message || 'No matching Singapore location found.');
      return;
    }

    // Exactly one match is unambiguous; otherwise the user chooses.
    if (res.results.length === 1) {
      selectUserLocation(res.results[0]);
      return;
    }
    setLocResults(res.results);
  };

  const selectUserLocation = (place: UserLocation) => {
    onUserLocationChange(place);
    setLocResults([]);
    setLocQuery('');
    setLocError(null);
    // Analytics records that a location was chosen - never which one.
    trackEvent('location_selected', {
      metadata: { hasCoordinates: true },
    });
  };

  const filteredDrops = drops.filter((drop) => {
    const matchesLoc =
      selectedLocation === 'All' || drop.neighbourhood.toLowerCase() === selectedLocation.toLowerCase();
    const matchesDay = selectedDay === 'all' || drop.dayBucket === selectedDay;
    const matchesQuery =
      !filterQuery ||
      drop.mealName.toLowerCase().includes(filterQuery.toLowerCase()) ||
      drop.cuisine.toLowerCase().includes(filterQuery.toLowerCase()) ||
      drop.cookName.toLowerCase().includes(filterQuery.toLowerCase());
    return matchesLoc && matchesDay && matchesQuery;
  });

  const handleCardClick = (
    drop: MealDrop,
    clickTarget: 'card' | 'cook' | 'distance' = 'card',
    distanceBandForEvent?: string
  ) => {
    if (clickTarget === 'cook') {
      trackEvent('home_cook_clicked', {
        mealDropId: drop.id,
        mealName: drop.mealName,
        location: drop.neighbourhood,
        metadata: { cookName: drop.cookName, rating: drop.rating, batches: drop.completedBatches },
      });
    } else if (clickTarget === 'distance') {
      // PRIVACY: only the coarse band is recorded, never an exact distance,
      // coordinate or address.
      trackEvent('distance_clicked', {
        mealDropId: drop.id,
        location: drop.neighbourhood,
        metadata: { distanceBand: distanceBandForEvent },
      });
    } else {
      trackEvent('meal_clicked', {
        mealDropId: drop.id,
        mealName: drop.mealName,
        location: drop.neighbourhood,
        metadata: {
          price: drop.pricePerPortion,
          portionsJoined: drop.portionsJoined,
          threshold: drop.groupOrderThreshold,
        },
      });
    }

    trackEvent('meal_card_clicked', {
      mealDropId: drop.id,
      mealName: drop.mealName,
      location: drop.neighbourhood,
      metadata: {
        price: drop.pricePerPortion,
        portionsJoined: drop.portionsJoined,
        cluster: drop.deliveryClusterName,
      },
    });

    onSelectDrop(drop.id);
  };

  const handleLocationSelect = (loc: string) => {
    onLocationChange(loc);
    trackEvent('location_selected', {
      location: loc,
      metadata: { previousLocation: selectedLocation },
    });
    // The neighbourhood pills double as location presets: selecting one
    // geocodes that area so walking distances can be calculated.
    if (loc !== 'All') {
      void runLocationSearch(loc);
    } else {
      onUserLocationChange(null);
    }
  };

  return (
    <div className="pb-24 animate-fadeIn">
      {/* Short Explanatory Line */}
      <section className="bg-amber-50/90 border-b border-amber-200/70 px-4 py-2">
        <div className="max-w-md mx-auto text-xs text-stone-700 leading-snug">
          Local home cooks prepare limited batches. Pick up nearby for <strong className="text-stone-900">free</strong> or share delivery with neighbours.
        </div>
      </section>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-3.5">
        {/* Discover Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-950 font-['Outfit']">
            Home cooks near you
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            See what your neighbours are ordering today.
          </p>
        </div>

        {/* Singapore Weather Context Banner (Preserves user agency) */}
        <div className="bg-sky-50/90 border border-sky-200/80 rounded-xl p-2.5 flex items-start gap-2.5 text-xs text-sky-950">
          <div className="w-6 h-6 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0 text-sky-700 mt-0.5">
            <CloudRain className="w-3.5 h-3.5" />
          </div>
          <div className="text-[11px] leading-tight space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-900">
                {selectedLocation !== 'All' ? `${selectedLocation} weather` : `${weatherData?.area || 'Clementi'} weather`}
              </span>
              <span className="text-[9px] text-sky-700 bg-sky-200/60 px-1 rounded font-medium">NEA 2-Hr</span>
            </div>
            {weatherFailed || !weatherData || weatherData.ok === false ? (
              <p className="text-sky-800">Weather context is temporarily unavailable.</p>
            ) : (
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-sky-950">
                  {weatherData.forecast}
                </div>
                {weatherData.contextualNote && (
                  <p className="text-sky-800 text-[11px] leading-snug">
                    {weatherData.contextualNote}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Neighbourhood Selection Pills */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-700 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-orange-600" />
              <span>Neighbourhood Area</span>
            </span>
            <span
              className={`text-[10px] font-normal lowercase ${
                providerReady === false ? 'text-stone-500' : 'text-stone-600'
              }`}
            >
              {providerReady === null
                ? 'checking OneMap…'
                : providerReady
                ? 'OneMap connected'
                : 'OneMap unavailable'}
            </span>
          </div>

          {/* Real location entry - geocoded by OneMap through the backend. */}
          {userLocation ? (
            <div className="flex items-center justify-between gap-2 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5">
              <span className="text-[11px] text-stone-700 truncate">
                Distances from <span className="font-semibold text-stone-900">{userLocation.address}</span>
              </span>
              <button
                type="button"
                id="btn-change-location"
                onClick={() => onUserLocationChange(null)}
                className="text-[11px] font-semibold text-orange-700 hover:text-orange-800 flex-shrink-0 cursor-pointer"
              >
                Change
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void runLocationSearch(locQuery);
              }}
              className="flex items-center gap-1.5"
            >
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  id="input-location-search"
                  value={locQuery}
                  onChange={(e) => setLocQuery(e.target.value)}
                  placeholder="Your block, postal code or area"
                  className="w-full text-xs pl-7 pr-2 py-1.5 rounded-lg border border-stone-200 bg-white placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
                />
              </div>
              <button
                type="submit"
                id="btn-check-distance"
                disabled={locSearching}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-stone-900 text-white disabled:opacity-60 whitespace-nowrap cursor-pointer"
              >
                {locSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Check distance'}
              </button>
            </form>
          )}

          {locError && <p className="text-[11px] text-stone-500">{locError}</p>}

          {locResults.length > 0 && (
            <ul className="border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden">
              {locResults.map((place, i) => (
                <li key={`${place.latitude},${place.longitude},${i}`}>
                  <button
                    type="button"
                    onClick={() => selectUserLocation(place)}
                    className="w-full text-left text-[11px] px-2.5 py-1.5 hover:bg-stone-50 cursor-pointer"
                  >
                    <span className="text-stone-800">{place.address}</span>
                    {place.postalCode && (
                      <span className="text-stone-400"> · {place.postalCode}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
            {LOCATIONS.map((loc) => {
              const active = selectedLocation === loc;
              return (
                <button
                  key={loc}
                  id={`btn-loc-${loc.toLowerCase().replace(' ', '-')}`}
                  onClick={() => handleLocationSelect(loc)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                    active
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {loc}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Timing Tabs */}
        <div className="flex items-center bg-stone-100/90 p-1 rounded-xl text-xs font-medium border border-stone-200/80">
          {(['all', 'tonight', 'tomorrow', 'weekend'] as const).map((day) => {
            const active = selectedDay === day;
            const label = day === 'all' ? 'All Batches' : day.charAt(0).toUpperCase() + day.slice(1);
            return (
              <button
                key={day}
                id={`btn-day-${day}`}
                onClick={() => onDayChange(day)}
                className={`flex-1 py-1 rounded-lg text-center capitalize transition-all cursor-pointer text-xs ${
                  active
                    ? 'bg-white text-stone-950 font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Scan Summary Bar */}
        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
          <span>
            <strong className="text-stone-900 font-semibold">{filteredDrops.length}</strong> home cooks taking orders
          </span>
          <span className="text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">
            2-Column Scan View
          </span>
        </div>

        {/* COMPACT 2-COLUMN MOBILE GRID */}
        {filteredDrops.length === 0 ? (
          <div className="bg-stone-50 rounded-2xl p-6 text-center border border-dashed border-stone-200 space-y-2">
            <p className="font-semibold text-stone-800 text-sm">No home cook batches found</p>
            <p className="text-xs text-stone-500">
              Try switching neighbourhoods or selecting "All Batches" to discover other cooks.
            </p>
            <button
              onClick={() => {
                onLocationChange('All');
                onDayChange('all');
              }}
              className="mt-1 text-xs font-semibold text-orange-600 underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredDrops.map((drop) => {
              const remainingPortions = Math.max(0, drop.groupOrderThreshold - drop.portionsJoined);
              const progressPct = Math.min(100, Math.round((drop.portionsJoined / drop.groupOrderThreshold) * 100));

              return (
                <article
                  key={drop.id}
                  id={`card-drop-${drop.id}`}
                  onClick={() => handleCardClick(drop, 'card')}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs hover:shadow-md hover:border-stone-300 transition-all cursor-pointer flex flex-col group text-left"
                >
                  {/* Square Food Image (Supporting, natural home presentation) */}
                  <div className="relative aspect-square w-full bg-stone-100 overflow-hidden">
                    <img
                      src={drop.mealImage}
                      alt={drop.mealName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />

                    {/* Proximity Pill (Top Left) */}
                    <CardDistance
                      drop={drop}
                      userLocation={userLocation}
                      onClick={(e, band) => {
                        e.stopPropagation();
                        handleCardClick(drop, 'distance', band);
                      }}
                    />

                    {/* Free Pickup Badge (Top Right) */}
                    <div className="absolute top-2 right-2 bg-emerald-600/90 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                      FREE PICKUP
                    </div>

                    {/* Price tag overlay bottom */}
                    <div className="absolute bottom-1.5 left-2 right-2 flex items-baseline justify-between text-white drop-shadow-sm">
                      <span className="font-extrabold text-sm font-['Outfit'] bg-stone-950/75 px-1.5 py-0.5 rounded">
                        S${drop.pricePerPortion.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-medium bg-black/60 px-1 py-0.5 rounded text-stone-200">
                        {drop.dayBucket === 'tonight' ? 'Tonight' : drop.dayBucket === 'tomorrow' ? 'Tmrw' : 'Weekend'}
                      </span>
                    </div>
                  </div>

                  {/* Compact Cook Identity & Batch Info */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
                    {/* Cook info & rating */}
                    <div>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(drop, 'cook');
                        }}
                        className="flex items-center gap-1.5 group/cook"
                      >
                        <img
                          src={drop.cookAvatar}
                          alt={drop.cookName}
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 rounded-full object-cover border border-stone-200 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-stone-900 truncate group-hover/cook:text-orange-600 leading-tight">
                            {drop.cookName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-stone-500 mt-0.5">
                        <span className="text-amber-600 font-bold flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          <span>{drop.rating}</span>
                        </span>
                        <span>•</span>
                        <span className="truncate">{drop.reviewCount} reviews</span>
                      </div>
                    </div>

                    {/* Compact Dish Title */}
                    <div>
                      <h2 className="text-xs font-semibold text-stone-950 leading-snug line-clamp-1">
                        {drop.mealName.split('(')[0].trim()}
                      </h2>
                    </div>

                    {/* Batch Availability & Mini Progress Bar */}
                    <div className="space-y-1 pt-1.5 border-t border-stone-100">
                      <div className="flex items-center justify-between text-[10px] leading-tight">
                        <span className="font-bold text-stone-800">
                          {drop.portionsJoined} / {drop.totalPortions} booked
                        </span>
                        <span className="text-orange-700 font-semibold text-[9px]">
                          {remainingPortions > 0 ? `${remainingPortions} left` : 'Sold out'}
                        </span>
                      </div>

                      {/* Mini Bar */}
                      <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-orange-600 h-full rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};


/**
 * Distance badge for one meal card.
 *
 * Shows a real OneMap walking distance once the user has chosen a location.
 * Before that it shows a neutral prompt - never a placeholder number. Each card
 * resolves independently, so one failed route cannot blank the others.
 */
const CardDistance: React.FC<{
  drop: MealDrop;
  userLocation: UserLocation | null;
  onClick: (e: React.MouseEvent, distanceBand?: string) => void;
}> = ({ drop, userLocation, onClick }) => {
  const state = useWalkingDistance(drop.id, userLocation);

  const label =
    state.status === 'ok'
      ? formatKm(state.route.distanceKm)
      : state.status === 'loading'
      ? 'Checking…'
      : state.status === 'unavailable'
      ? 'Distance unavailable'
      : 'Check distance';

  const band = state.status === 'ok' ? distanceBand(state.route.distanceKm) : undefined;

  return (
    <button
      type="button"
      onClick={(e) => onClick(e, band)}
      className="absolute top-2 left-2 bg-stone-900/85 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs"
      title={
        state.status === 'ok'
          ? 'Walking distance to pickup location (OneMap)'
          : 'Set your location to check walking distance'
      }
    >
      {state.status === 'loading' ? (
        <Loader2 className="w-2.5 h-2.5 text-orange-400 animate-spin" />
      ) : (
        <MapPin className="w-2.5 h-2.5 text-orange-400" />
      )}
      <span>{label}</span>
    </button>
  );
};
