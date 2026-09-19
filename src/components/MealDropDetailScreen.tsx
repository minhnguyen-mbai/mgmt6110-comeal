import React, { useState, useEffect } from 'react';
import { MealDrop } from '../types';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Star,
  CheckCircle2,
  AlertCircle,
  Truck,
  ShoppingBag,
  Info,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  CloudRain,
  Camera,
  Calendar,
  Award,
  Repeat,
} from 'lucide-react';
import { trackEvent } from '../services/tracker';
import { fetchWeather, WeatherResponse } from '../services/api';

interface MealDropDetailScreenProps {
  drop: MealDrop;
  onBack: () => void;
  onJoinDrop: (dropId: string) => void;
  onAbandon: (dropId: string) => void;
}

export const MealDropDetailScreen: React.FC<MealDropDetailScreenProps> = ({
  drop,
  onBack,
  onJoinDrop,
  onAbandon,
}) => {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [showCookStory, setShowCookStory] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);

  useEffect(() => {
    fetchWeather(drop.neighbourhood).then((res) => {
      setWeatherData(res);
    });
  }, [drop.neighbourhood]);

  useEffect(() => {
    trackEvent('meal_drop_viewed', {
      mealDropId: drop.id,
      mealName: drop.mealName,
      location: drop.neighbourhood,
      metadata: {
        price: drop.pricePerPortion,
        portionsJoined: drop.portionsJoined,
        threshold: drop.groupOrderThreshold,
        deliveryCluster: drop.deliveryClusterName,
        householdsJoined: drop.deliveryClusterHouseholdsJoined,
      },
    });

    trackEvent('meal_batch_progress_viewed', {
      mealDropId: drop.id,
      metadata: {
        portionsJoined: drop.portionsJoined,
        totalPortions: drop.totalPortions,
      },
    });

    trackEvent('delivery_cluster_viewed', {
      mealDropId: drop.id,
      metadata: {
        cluster: drop.deliveryClusterName,
        householdsJoined: drop.deliveryClusterHouseholdsJoined,
        clusterThreshold: drop.deliveryClusterThreshold,
      },
    });
  }, [drop.id]);

  const remainingPortions = Math.max(0, drop.totalPortions - drop.portionsJoined);
  const portionsPct = Math.min(100, Math.round((drop.portionsJoined / drop.totalPortions) * 100));

  const clusterRemaining = Math.max(0, drop.deliveryClusterThreshold - drop.deliveryClusterHouseholdsJoined);
  const clusterIsUnlocked = clusterRemaining === 0;

  const handleBackClick = () => {
    trackEvent('drop_abandoned', {
      mealDropId: drop.id,
      mealName: drop.mealName,
      location: drop.neighbourhood,
      metadata: {
        reason: 'navigated_back_before_join',
        portionsJoined: drop.portionsJoined,
      },
    });
    onAbandon(drop.id);
  };

  const handleJoinClick = () => {
    trackEvent('join_drop_clicked', {
      mealDropId: drop.id,
      mealName: drop.mealName,
      location: drop.neighbourhood,
      metadata: {
        joinedCount: drop.portionsJoined,
        threshold: drop.groupOrderThreshold,
        deliveryFee: drop.currentDeliveryFee,
        price: drop.pricePerPortion,
      },
    });
    onJoinDrop(drop.id);
  };

  const handleCookProfileToggle = () => {
    setShowCookStory(!showCookStory);
    trackEvent('cook_profile_clicked', {
      mealDropId: drop.id,
      metadata: { cookName: drop.cookName, expanded: !showCookStory },
    });
  };

  const handleAllReviewsToggle = () => {
    setShowAllReviews(!showAllReviews);
    trackEvent('cook_reviews_opened', {
      mealDropId: drop.id,
      metadata: { reviewCount: drop.reviewCount, expanded: !showAllReviews },
    });
  };

  const handlePhotoClick = (img: string) => {
    setSelectedPhoto(selectedPhoto === img ? null : img);
    trackEvent('customer_photos_opened', {
      mealDropId: drop.id,
      metadata: { photoUrl: img },
    });
  };

  return (
    <div className="pb-32 bg-stone-50 min-h-screen animate-fadeIn">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={handleBackClick}
          id="btn-detail-back"
          className="flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-950 p-1 -ml-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cooks</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
            {drop.neighbourhood} • {drop.distanceKm} km away
          </span>
          <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            Demo Batch
          </span>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* COMPACT FOOD PHOTO (Supporting role, NOT dominating screen) */}
        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-stone-900 border border-stone-200 shadow-2xs">
          <img
            src={drop.mealImage}
            alt={drop.mealName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Floating tags */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span className="bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
              {drop.cuisine}
            </span>
          </div>

          <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between text-white">
            <span className="text-xs text-stone-200 font-medium">
              Home-cooked in {drop.neighbourhood}
            </span>
            <span className="text-xs bg-emerald-600/90 backdrop-blur-xs px-2 py-0.5 rounded font-bold">
              FREE Void Deck Pickup
            </span>
          </div>
        </div>

        {/* 1. COOK REPUTATION (Prominently First) */}
        <section className="bg-white rounded-2xl p-4 border border-stone-200 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h3 className="font-bold text-stone-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-orange-600" />
              <span>Cook Reputation</span>
            </h3>
            <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
              {drop.neighbourhood}
            </span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={drop.cookAvatar}
                alt={drop.cookName}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-stone-100 shadow-xs flex-shrink-0"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-bold text-stone-950 font-['Outfit']">
                    {drop.cookName}
                  </h2>
                </div>

                <div className="flex items-center gap-1 text-xs text-stone-600">
                  <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{drop.rating}</span>
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-stone-800">({drop.reviewCount} reviews)</span>
                  <span>•</span>
                  <span>{drop.neighbourhood}</span>
                </div>

                <p className="text-xs text-stone-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-orange-600" />
                  <span>{drop.cookAddressShort} • {drop.distanceKm} km away</span>
                </p>
              </div>
            </div>
          </div>

          {/* Trust Metrics Pill Strip */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="bg-stone-50 rounded-xl p-2 border border-stone-200/80 flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-stone-900">{drop.completedBatches} previous batches</p>
                <p className="text-[10px] text-stone-500">Regular neighbourhood cook</p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-xl p-2 border border-stone-200/80 flex items-center gap-2">
              <Repeat className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-stone-900">{drop.repeatCustomersPct}% repeat neighbours</p>
                <p className="text-[10px] text-stone-500">Returning households</p>
              </div>
            </div>
          </div>

          {/* Cooking Frequency */}
          <div className="flex items-center gap-1.5 text-xs text-stone-700 bg-orange-50/70 border border-orange-200/60 rounded-xl px-3 py-2">
            <Calendar className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
            <span className="font-medium">{drop.cookingSchedule}</span>
          </div>

          {/* Expandable Cook Story */}
          <div>
            <button
              onClick={handleCookProfileToggle}
              id="btn-toggle-cook-bio"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              <span>{showCookStory ? 'Hide cook story' : 'Read cook story & kitchen philosophy'}</span>
              {showCookStory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showCookStory && (
              <p className="mt-2 text-xs text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/70 animate-fadeIn">
                {drop.cookBio}
              </p>
            )}
          </div>
        </section>

        {/* 2. TODAY'S BATCH */}
        <section className="bg-white rounded-2xl p-4 border border-stone-200 space-y-3 shadow-2xs">
          <div className="flex items-baseline justify-between border-b border-stone-100 pb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                Today's Batch
              </span>
              <h2 className="text-base font-bold text-stone-950 mt-1">
                {drop.mealName}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-stone-950 font-['Outfit']">
                S${drop.pricePerPortion.toFixed(2)}
              </span>
              <span className="text-[11px] text-stone-500 block">/ portion</span>
            </div>
          </div>

          <p className="text-xs text-stone-700 leading-relaxed">
            {drop.shortDescription}
          </p>

          {/* Batch Progress Bar */}
          <div
            onClick={() => {
              trackEvent('group_progress_clicked', {
                mealDropId: drop.id,
                metadata: {
                  portionsJoined: drop.portionsJoined,
                  totalPortions: drop.totalPortions,
                  threshold: drop.groupOrderThreshold,
                },
              });
            }}
            className="bg-stone-50 rounded-xl p-3 border border-stone-200/80 space-y-2 cursor-pointer hover:border-orange-200 transition-colors"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-orange-600" />
                <span>{drop.portionsJoined} / {drop.totalPortions} portions booked</span>
              </span>
              <span className="text-xs font-semibold text-orange-700">
                {remainingPortions > 0 ? `${remainingPortions} left in batch` : 'Sold out'}
              </span>
            </div>

            <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-orange-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${portionsPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <span>Orders close: {drop.orderCutoffTime}</span>
              <span className="font-medium text-stone-700">Limited single kitchen prep</span>
            </div>
          </div>
        </section>

        {/* Real Singapore Weather Context Card */}
        {weatherData && (
          <section className="bg-sky-50/80 border border-sky-200/80 rounded-2xl p-3.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sky-950 font-bold text-xs">
                <CloudRain className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span>{drop.neighbourhood} weather</span>
              </div>
              <span className="text-[9px] text-sky-700 bg-sky-200/60 px-1.5 py-0.5 rounded font-medium">
                NEA 2-Hr
              </span>
            </div>
            {weatherData.ok === false ? (
              <p className="text-[11px] text-sky-900 leading-snug">
                Weather context is temporarily unavailable.
              </p>
            ) : (
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-sky-950">
                  {weatherData.forecast}
                </div>
                {weatherData.contextualNote && (
                  <p className="text-[11px] text-sky-900 leading-snug">
                    {weatherData.contextualNote}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* 3. FULFILMENT (Clear split: Option A Pickup vs Option B Shared Delivery) */}
        <section className="bg-white rounded-2xl p-4 border border-stone-200 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-950 text-xs uppercase tracking-wider">
              Fulfilment Options
            </h3>
            <span className="text-[10px] text-stone-500 font-medium">Flexible pickup or delivery</span>
          </div>

          <div className="space-y-2.5">
            {/* OPTION A: PICKUP */}
            <div className="border-2 border-emerald-500/30 rounded-xl p-3 bg-emerald-50/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                    OPTION A
                  </span>
                  <span className="font-bold text-stone-950 text-xs">Pickup at Void Deck</span>
                </div>
                <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  FREE
                </span>
              </div>
              <p className="text-xs text-stone-800 font-medium">{drop.pickupLocation}</p>
              <div className="flex items-center gap-2 text-[11px] text-stone-600">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-stone-500" />
                  <span>Window: <strong>{drop.pickupWindow}</strong></span>
                </span>
                <span>•</span>
                <span>{drop.distanceKm} km away</span>
              </div>
            </div>

            {/* OPTION B: SHARED DELIVERY */}
            <div className="border border-orange-200 rounded-xl p-3 bg-orange-50/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded">
                    OPTION B
                  </span>
                  <span className="font-bold text-stone-950 text-xs">Shared Delivery</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-stone-900">
                    S${drop.currentDeliveryFee.toFixed(2)}
                  </span>
                  {drop.currentDeliveryFee > drop.unlockedDeliveryFee && (
                    <span className="text-[10px] text-emerald-700 font-semibold block">
                      drops to S${drop.unlockedDeliveryFee.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-stone-800">
                Group delivery to nearby cluster: <strong>{drop.deliveryClusterName}</strong>
              </p>
              <div className="flex items-center gap-1 text-[11px] text-stone-600">
                <Clock className="w-3 h-3 text-stone-500" />
                <span>Window: <strong>{drop.deliveryWindow}</strong></span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. SHARED DELIVERY STATUS (Geographic Grouping) */}
        <section className="bg-white rounded-2xl p-4 border border-stone-200 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-stone-950 text-xs uppercase tracking-wider">
                Shared Delivery Status
              </h3>
            </div>
            <span className="text-[11px] font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
              {drop.deliveryClusterName}
            </span>
          </div>

          {/* Household Visual Representation (👤 👤 👤 👤 + ?) */}
          <div className="bg-orange-50/50 border border-orange-200/80 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: drop.deliveryClusterThreshold }).map((_, i) => {
                  const isJoined = i < drop.deliveryClusterHouseholdsJoined;
                  return (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isJoined
                          ? 'bg-orange-600 text-white shadow-2xs'
                          : 'bg-white border-2 border-dashed border-orange-300 text-orange-400'
                      }`}
                      title={isJoined ? `Household ${i + 1} joined` : 'Available slot'}
                    >
                      {isJoined ? '👤' : '+?'}
                    </div>
                  );
                })}
              </div>
              <span className="text-xs font-bold text-stone-900">
                {drop.deliveryClusterHouseholdsJoined} / {drop.deliveryClusterThreshold} households
              </span>
            </div>

            <p className="text-xs text-stone-800 leading-snug">
              {clusterIsUnlocked ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Shared delivery unlocked! Cost is just S${drop.unlockedDeliveryFee.toFixed(2)}.</span>
                </span>
              ) : (
                <span>
                  <strong className="text-orange-950 font-semibold">{clusterRemaining} more nearby household</strong> → shared delivery drops to <strong>S${drop.unlockedDeliveryFee.toFixed(2)}</strong>!
                </span>
              )}
            </p>
          </div>
        </section>

        {/* 5. NEIGHBOUR REVIEWS & PHOTOS (Below Core Batch Info) */}
        <section className="bg-white rounded-2xl p-4 border border-stone-200 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <h3 className="font-bold text-stone-950 text-xs uppercase tracking-wider">
                Neighbour Reviews
              </h3>
            </div>
            <span className="text-[11px] text-stone-500">
              ★ {drop.rating} from {drop.reviewCount} neighbours
            </span>
          </div>

          {/* Highlighted Review Quote */}
          <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 text-xs">
                {drop.featuredReview.author}
              </span>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                Ordered {drop.featuredReview.orderCount} times
              </span>
            </div>
            <p className="text-xs text-stone-700 italic leading-snug">
              "{drop.featuredReview.comment}"
            </p>
            <p className="text-[10px] text-stone-500 font-medium">
              — {drop.featuredReview.residentArea}
            </p>
          </div>
        </section>

        {/* 6. PHOTOS FROM NEIGHBOURS */}
        {drop.neighbourPhotos && drop.neighbourPhotos.length > 0 && (
          <section className="bg-white rounded-2xl p-4 border border-stone-200 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-stone-700" />
                <h3 className="font-bold text-stone-950 text-xs uppercase tracking-wider">
                  Photos from Neighbours
                </h3>
              </div>
              <span className="text-[10px] text-stone-500 font-medium">Authentic home table unboxings</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {drop.neighbourPhotos.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => handlePhotoClick(img)}
                  className="relative aspect-square rounded-xl overflow-hidden bg-stone-100 border border-stone-200 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img
                    src={img}
                    alt={`Neighbour photo ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7. DISH INGREDIENTS & ALLERGENS (Expandable) */}
        <section className="bg-white rounded-2xl p-4 border border-stone-200 space-y-3 shadow-2xs">
          <button
            onClick={() => setShowIngredients(!showIngredients)}
            id="btn-toggle-ingredients"
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-stone-700" />
              <h3 className="font-bold text-stone-950 text-xs uppercase tracking-wider">
                Full Dish Narrative & Ingredients
              </h3>
            </div>
            {showIngredients ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
          </button>

          {showIngredients && (
            <div className="space-y-3 pt-2 text-xs text-stone-700 animate-fadeIn">
              <p className="leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                {drop.fullDescription}
              </p>

              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1.5">Fresh Market Ingredients</h4>
                <div className="flex flex-wrap gap-1.5">
                  {drop.ingredients.map((ing, i) => (
                    <span
                      key={i}
                      className="bg-stone-100 text-stone-800 text-[11px] px-2.5 py-1 rounded-lg border border-stone-200"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              {drop.allergens && drop.allergens.length > 0 && (
                <div className="bg-amber-50 border border-amber-200/80 p-2.5 rounded-xl text-amber-900">
                  <span className="font-bold block text-[11px] mb-0.5">Allergen Notice:</span>
                  <p className="text-[11px]">{drop.allergens.join(', ')}</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 8. ALL NEIGHBOUR REVIEWS */}
        <section className="bg-white rounded-2xl p-4 border border-stone-200 space-y-3 shadow-2xs">
          <button
            onClick={handleAllReviewsToggle}
            id="btn-toggle-reviews"
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-stone-700" />
              <h3 className="font-bold text-stone-950 text-xs uppercase tracking-wider">
                All Neighbour Reviews ({drop.reviews.length})
              </h3>
            </div>
            {showAllReviews ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
          </button>

          {showAllReviews && (
            <div className="space-y-3 pt-1 animate-fadeIn">
              {drop.reviews.map((rev) => (
                <div key={rev.id} className="border-t border-stone-100 pt-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-xs">{rev.author}</span>
                    <span className="text-[10px] text-stone-400">{rev.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                        }`}
                      />
                    ))}
                    {rev.orderCount && (
                      <span className="text-[10px] text-stone-500 ml-1">
                        • Ordered {rev.orderCount} times
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 leading-snug">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* STICKY BOTTOM CONVERSION BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-stone-500 block">Portion Price</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-stone-950 font-['Outfit']">
                S${drop.pricePerPortion.toFixed(2)}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                Free Pickup
              </span>
            </div>
          </div>

          <button
            onClick={handleJoinClick}
            id="btn-detail-join-drop"
            className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-center text-sm font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Join This Batch</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-normal">
              {remainingPortions} left
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
