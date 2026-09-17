import React, { useState } from 'react';
import { MealDrop, DayBucket } from '../types';
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
} from 'lucide-react';
import { trackEvent } from '../services/tracker';

interface DiscoverScreenProps {
  drops: MealDrop[];
  onSelectDrop: (dropId: string) => void;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  selectedDay: DayBucket | 'all';
  onDayChange: (day: DayBucket | 'all') => void;
}

const LOCATIONS = ['All', 'Clementi', 'Tampines', 'Bugis', 'Queenstown', 'Jurong East'];

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  drops,
  onSelectDrop,
  selectedLocation,
  onLocationChange,
  selectedDay,
  onDayChange,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

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

  const handleCardClick = (drop: MealDrop, clickTarget: 'card' | 'cook' | 'distance' = 'card') => {
    if (clickTarget === 'cook') {
      trackEvent('home_cook_clicked', {
        mealDropId: drop.id,
        mealName: drop.mealName,
        location: drop.neighbourhood,
        metadata: { cookName: drop.cookName, rating: drop.rating, batches: drop.completedBatches },
      });
    } else if (clickTarget === 'distance') {
      trackEvent('distance_clicked', {
        mealDropId: drop.id,
        location: drop.neighbourhood,
        metadata: { distanceKm: drop.distanceKm },
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
          <div className="text-[11px] leading-tight space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sky-900">Evening Weather Forecast</span>
              <span className="text-[9px] text-sky-700 bg-sky-200/60 px-1 rounded">NEA 2-Hr</span>
            </div>
            <p className="text-sky-800">
              Evening showers expected. Pickup is still available; delivery may be more convenient tonight.
            </p>
          </div>
        </div>

        {/* Neighbourhood Selection Pills */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-700 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-orange-600" />
              <span>Neighbourhood Area</span>
            </span>
            <span className="text-[10px] text-stone-600 font-normal lowercase">OneMap geocoding demo</span>
          </div>
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(drop, 'distance');
                      }}
                      className="absolute top-2 left-2 bg-stone-900/85 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs"
                      title="Approximate distance to pickup location"
                    >
                      <MapPin className="w-2.5 h-2.5 text-orange-400" />
                      <span>{drop.distanceKm} km away</span>
                    </button>

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
