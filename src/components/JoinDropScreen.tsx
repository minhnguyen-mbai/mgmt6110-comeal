import React, { useState, useEffect } from 'react';
import { MealDrop } from '../types';
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  Plus,
  Minus,
  Check,
  MapPin,
  Clock,
  Sparkles,
  CloudRain,
  HelpCircle,
  Building,
} from 'lucide-react';
import { trackEvent, getSessionId } from '../services/tracker';
import { fetchWeather, WeatherResponse, registerOrderIntent } from '../services/api';

interface JoinDropScreenProps {
  drop: MealDrop;
  onBack: () => void;
  onOrderJoined: (dropId: string, orderDetails: any) => void;
}

export const JoinDropScreen: React.FC<JoinDropScreenProps> = ({
  drop,
  onBack,
  onOrderJoined,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [fulfilment, setFulfilment] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryBlock, setDeliveryBlock] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [weatherFailed, setWeatherFailed] = useState(false);

  // Fetch real-time Singapore 2-Hour forecast for this neighbourhood
  useEffect(() => {
    fetchWeather(drop.neighbourhood)
      .then((res) => {
        if (res && res.ok !== false) {
          setWeatherData(res);
          setWeatherFailed(false);
        } else {
          setWeatherFailed(true);
        }
      })
      .catch(() => {
        setWeatherFailed(true);
      });
  }, [drop.neighbourhood]);

  // Delivery cluster progress check
  const clusterRemaining = Math.max(0, drop.deliveryClusterThreshold - drop.deliveryClusterHouseholdsJoined);
  const clusterIsUnlocked = clusterRemaining === 0;
  const activeDeliveryFee = clusterIsUnlocked ? drop.unlockedDeliveryFee : drop.currentDeliveryFee;

  const deliveryFee = fulfilment === 'pickup' ? 0 : activeDeliveryFee;
  const mealTotal = drop.pricePerPortion * quantity;
  const grandTotal = mealTotal + deliveryFee;

  useEffect(() => {
    trackEvent('delivery_fee_viewed', {
      mealDropId: drop.id,
      metadata: {
        currentFee: drop.currentDeliveryFee,
        unlockedFee: drop.unlockedDeliveryFee,
        isUnlocked: clusterIsUnlocked,
      },
    });
  }, [drop.id, clusterIsUnlocked]);

  const handleFulfilmentChange = (type: 'pickup' | 'delivery') => {
    setFulfilment(type);
    if (type === 'pickup') {
      trackEvent('pickup_selected', {
        mealDropId: drop.id,
        mealName: drop.mealName,
        metadata: { location: drop.pickupLocation, fee: 0 },
      });
    } else {
      trackEvent('delivery_selected', {
        mealDropId: drop.id,
        mealName: drop.mealName,
        metadata: {
          deliveryFee: activeDeliveryFee,
          cluster: drop.deliveryClusterName,
          isUnlocked: clusterIsUnlocked,
        },
      });
    }
  };

  const handleConfirmOrder = () => {
    setIsSubmitting(true);
    trackEvent('join_order_clicked', {
      mealDropId: drop.id,
      mealName: drop.mealName,
      metadata: {
        quantity,
        fulfilment,
        grandTotal,
      },
    });

    const orderDetails = {
      quantity,
      fulfilment,
      mealTotal,
      deliveryFee,
      grandTotal,
      deliveryBlock: fulfilment === 'delivery' ? deliveryBlock : undefined,
      notes,
    };

    // Send order intent to backend API
    registerOrderIntent({
      mealBatchId: drop.id,
      quantity,
      fulfilmentType: fulfilment,
      neighbourhood: drop.neighbourhood,
      sessionId: getSessionId(),
    }).catch((err) => console.debug('Order intent registered locally', err));

    trackEvent('order_joined', {
      mealDropId: drop.id,
      mealName: drop.mealName,
      location: drop.neighbourhood,
      metadata: {
        quantity,
        fulfilment,
        mealTotal,
        deliveryFee,
        grandTotal,
        cluster: drop.deliveryClusterName,
      },
    });

    setTimeout(() => {
      setIsSubmitting(false);
      onOrderJoined(drop.id, orderDetails);
    }, 400);
  };

  return (
    <div className="pb-32 bg-stone-50 min-h-screen animate-fadeIn">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          id="btn-join-back"
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-950 p-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-xs font-bold text-stone-900">Join Cook's Batch</span>
        <span className="text-[10px] text-stone-400 font-mono">Step 2/2</span>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Cook & Meal Summary */}
        <div className="bg-white rounded-2xl p-3.5 border border-stone-200 flex gap-3 shadow-2xs">
          <img
            src={drop.mealImage}
            alt={drop.mealName}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
          />
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.2 rounded">
              {drop.neighbourhood}
            </span>
            <h2 className="font-bold text-stone-950 text-xs leading-tight truncate">
              {drop.mealName}
            </h2>
            <p className="text-[11px] text-stone-500">Cooked by {drop.cookName}</p>
            <p className="text-xs font-extrabold text-stone-950">
              S${drop.pricePerPortion.toFixed(2)}{' '}
              <span className="text-[10px] text-stone-500 font-normal">/ portion</span>
            </p>
          </div>
        </div>

        {/* Portion Stepper */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-xs text-stone-900">Number of Portions</p>
              <p className="text-[11px] text-stone-500">How many servings for your household?</p>
            </div>
            <div className="flex items-center gap-3 bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                id="btn-portion-decrease"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-7 h-7 rounded-lg bg-white shadow-xs flex items-center justify-center text-stone-700 disabled:opacity-30 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-bold text-sm text-stone-950">
                {quantity}
              </span>
              <button
                type="button"
                id="btn-portion-increase"
                onClick={() => setQuantity((q) => Math.min(6, q + 1))}
                disabled={quantity >= 6}
                className="w-7 h-7 rounded-lg bg-white shadow-xs flex items-center justify-center text-stone-700 disabled:opacity-30 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Weather Context Note (Preserves User Agency) */}
        <div className="bg-sky-50/80 border border-sky-200/70 rounded-xl p-2.5 flex items-start gap-2.5 text-xs text-sky-950">
          <CloudRain className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-900">
                {drop.neighbourhood} weather
              </span>
              <span className="text-[9px] text-sky-700 bg-sky-200/60 px-1 rounded font-medium">
                NEA 2-Hr
              </span>
            </div>
            {weatherFailed || !weatherData || weatherData.ok === false ? (
              <p className="text-[11px] text-sky-900 leading-snug">
                Weather context is temporarily unavailable.
              </p>
            ) : (
              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold text-sky-950">
                  {weatherData.forecast}
                </div>
                {weatherData.contextualNote && (
                  <p className="text-[11px] text-sky-900 leading-snug">
                    {weatherData.contextualNote}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fulfilment Choice: "How would you like to get your meal?" */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 space-y-3 shadow-2xs">
          <div>
            <h3 className="font-bold text-xs text-stone-950 uppercase tracking-wider">
              How would you like to get your meal?
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Choose free neighbourhood pickup or convenient delivery.
            </p>
          </div>

          <div className="space-y-2.5">
            {/* OPTION 1: Self Pickup (FREE) */}
            <div
              onClick={() => handleFulfilmentChange('pickup')}
              id="opt-fulfilment-pickup"
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                fulfilment === 'pickup'
                  ? 'border-emerald-600 bg-emerald-50/30'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      fulfilment === 'pickup' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-stone-950 block">Self Pickup</span>
                    <span className="text-[10px] text-stone-500">{drop.distanceKm} km away</span>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  FREE
                </span>
              </div>

              <div className="mt-2 text-xs text-stone-700 space-y-0.5 bg-stone-50 p-2 rounded-lg border border-stone-150">
                <p className="font-medium text-stone-900">{drop.pickupLocation}</p>
                <p className="text-[11px] text-stone-500">Pickup window: {drop.pickupWindow}</p>
              </div>
            </div>

            {/* OPTION 2: Delivery */}
            <div
              onClick={() => handleFulfilmentChange('delivery')}
              id="opt-fulfilment-delivery"
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                fulfilment === 'delivery'
                  ? 'border-orange-600 bg-orange-50/30'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      fulfilment === 'delivery' ? 'bg-orange-600 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-stone-950 block">Delivery</span>
                    <span className="text-[10px] text-stone-500">Delivered to your area</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-stone-950">
                    S${activeDeliveryFee.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-stone-400 block line-through">
                    S${drop.currentDeliveryFee.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-2 text-xs text-stone-700 space-y-1 bg-stone-50 p-2 rounded-lg border border-stone-150">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-stone-900">Cluster: {drop.deliveryClusterName}</span>
                  <span className="text-orange-700 font-semibold">
                    {drop.deliveryClusterHouseholdsJoined}/{drop.deliveryClusterThreshold} households
                  </span>
                </div>
                <p className="text-[11px] text-stone-600">
                  Delivery window: {drop.deliveryWindow}
                </p>
                <p className="text-[10px] text-emerald-800 font-medium">
                  {clusterIsUnlocked
                    ? '✓ Shared delivery unlocked at S$2.00!'
                    : `1 more nearby delivery → S$${drop.unlockedDeliveryFee.toFixed(2)} shared delivery`}
                </p>
              </div>

              {/* Progressive Delivery Area / Block Input */}
              {fulfilment === 'delivery' && (
                <div className="mt-3 pt-2 border-t border-orange-200/60 space-y-1 animate-fadeIn">
                  <label className="block text-[11px] font-bold text-stone-800">
                    Your HDB Block / Condo in {drop.neighbourhood}:
                  </label>
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
                    <input
                      type="text"
                      id="input-delivery-block"
                      value={deliveryBlock}
                      onChange={(e) => setDeliveryBlock(e.target.value)}
                      placeholder="e.g. Blk 320 Clementi Ave 4 #08-12"
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <p className="text-[10px] text-stone-400">
                    OneMap geocoding mock: clusters nearby drop-offs within 500m.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dietary Notes */}
        <div className="bg-white rounded-2xl p-3.5 border border-stone-200 space-y-1 shadow-2xs">
          <label htmlFor="input-notes" className="text-xs font-bold text-stone-900 block">
            Note for {drop.cookName} (Optional)
          </label>
          <input
            type="text"
            id="input-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Separate chilli / less spicy if possible"
            className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:border-orange-500 text-stone-900"
          />
        </div>

        {/* Price Breakdown Card */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 space-y-2 shadow-2xs">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Order Summary
          </h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-stone-700">
              <span>{quantity}x {drop.mealName.split('(')[0]}</span>
              <span>S${mealTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Fulfilment ({fulfilment === 'pickup' ? 'Self Pickup' : 'Delivery'})</span>
              <span className={deliveryFee === 0 ? 'text-emerald-700 font-bold' : ''}>
                {deliveryFee === 0 ? 'FREE' : `S$${deliveryFee.toFixed(2)}`}
              </span>
            </div>
            <div className="border-t border-stone-200 pt-2 flex justify-between font-bold text-sm text-stone-950">
              <span>Total Amount</span>
              <span className="text-base text-orange-600 font-['Outfit']">
                S${grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Academic Prototype Notice */}
        <p className="text-[10px] text-stone-500 text-center px-4">
          PS3 Academic Prototype: No real credit card charge will be made. Clicking "Join Order" records your purchase intent for behavioural research.
        </p>
      </div>

      {/* Sticky Bottom Confirmation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-stone-500 block">Total Due</span>
            <span className="text-xl font-black text-stone-950 font-['Outfit']">
              S${grandTotal.toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleConfirmOrder}
            disabled={isSubmitting}
            id="btn-confirm-order-joined"
            className="flex-1 py-3 bg-stone-900 hover:bg-orange-600 text-white rounded-xl text-center text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Registering Intent...</span>
            ) : (
              <>
                <span>Join Order</span>
                <span className="text-xs text-stone-300 font-normal">
                  ({fulfilment === 'pickup' ? 'Free Pickup' : 'Delivery'})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
