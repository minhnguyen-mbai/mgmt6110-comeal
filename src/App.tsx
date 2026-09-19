import React, { useState, useEffect, useRef } from 'react';
import { MealDrop, ScreenState, DayBucket, TrackingEvent, QualitativeFeedback } from './types';
import { MOCK_MEAL_DROPS } from './data/mockDrops';
import { Navbar } from './components/Navbar';
import { DiscoverScreen } from './components/DiscoverScreen';
import { MealDropDetailScreen } from './components/MealDropDetailScreen';
import { JoinDropScreen } from './components/JoinDropScreen';
import { FeedbackScreen } from './components/FeedbackScreen';
import { AnalyticsDrawer } from './components/AnalyticsDrawer';
import {
  trackEvent,
  getStoredEvents,
  getStoredFeedback,
  subscribeToEvents,
  subscribeToFeedback,
} from './services/tracker';

export default function App() {
  const [drops, setDrops] = useState<MealDrop[]>(MOCK_MEAL_DROPS);
  const [screenState, setScreenState] = useState<ScreenState>({ screen: 'discover' });
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedDay, setSelectedDay] = useState<DayBucket | 'all'>('all');
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  // Live event logs for inspector
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [feedbackList, setFeedbackList] = useState<QualitativeFeedback[]>([]);

  const hasTrackedInitialDiscover = useRef(false);

  useEffect(() => {
    // Initial events load
    setEvents(getStoredEvents());
    setFeedbackList(getStoredFeedback());

    // Track initial discover view once
    if (!hasTrackedInitialDiscover.current) {
      hasTrackedInitialDiscover.current = true;
      trackEvent('discover_viewed', {
        location: 'All',
        metadata: { initialLoad: true, totalDropsAvailable: MOCK_MEAL_DROPS.length },
      });
    }

    const unsubscribeEvents = subscribeToEvents((newEvent) => {
      setEvents((prev) => [newEvent, ...prev]);
    });

    const unsubscribeFeedback = subscribeToFeedback((newFb) => {
      setFeedbackList((prev) => [newFb, ...prev]);
    });

    return () => {
      unsubscribeEvents();
      unsubscribeFeedback();
    };
  }, []);

  const handleSelectDrop = (dropId: string) => {
    setScreenState({ screen: 'detail', dropId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToDiscover = () => {
    setScreenState({ screen: 'discover' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAbandonDetail = (dropId: string) => {
    // Navigate to Abandonment Feedback screen
    setScreenState({ screen: 'feedback', dropId, type: 'abandonment' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJoinDrop = (dropId: string) => {
    setScreenState({ screen: 'join', dropId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderJoined = (dropId: string, orderDetails: { quantity: number }) => {
    // Dynamically increment portions joined for the prototype feedback loop
    setDrops((prev) =>
      prev.map((d) => {
        if (d.id === dropId) {
          const updatedJoined = d.portionsJoined + orderDetails.quantity;
          const isNowUnlocked = updatedJoined >= d.groupOrderThreshold;
          return {
            ...d,
            portionsJoined: updatedJoined,
            status: updatedJoined >= d.totalPortions ? 'SOLD_OUT' : isNowUnlocked ? 'UNLOCKED' : d.status,
          };
        }
        return d;
      })
    );

    // Transition to Conversion Feedback screen
    setScreenState({ screen: 'feedback', dropId, type: 'conversion' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDataCleared = () => {
    setEvents([]);
    setFeedbackList([]);
  };

  // Find active drop if in detail/join/feedback screen
  const activeDropId = 'dropId' in screenState ? screenState.dropId : null;
  const activeDrop = activeDropId ? drops.find((d) => d.id === activeDropId) : undefined;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-['Plus_Jakarta_Sans'] flex flex-col">
      {/* Desktop Centered Mobile Shell Frame */}
      <div className="w-full max-w-md mx-auto bg-white min-h-screen shadow-xl relative flex flex-col">
        {/* Navigation Bar (visible across screens or discover) */}
        <Navbar
          onOpenAnalytics={() => setIsAnalyticsOpen(true)}
          eventCount={events.length}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          onHomeClick={handleBackToDiscover}
        />

        {/* Main View Router */}
        <main className="flex-1">
          {screenState.screen === 'discover' && (
            <DiscoverScreen
              drops={drops}
              onSelectDrop={handleSelectDrop}
              selectedLocation={selectedLocation}
              onLocationChange={setSelectedLocation}
              selectedDay={selectedDay}
              onDayChange={setSelectedDay}
            />
          )}

          {screenState.screen === 'detail' && activeDrop && (
            <MealDropDetailScreen
              drop={activeDrop}
              onBack={handleBackToDiscover}
              onJoinDrop={handleJoinDrop}
              onAbandon={handleAbandonDetail}
            />
          )}

          {screenState.screen === 'join' && activeDrop && (
            <JoinDropScreen
              drop={activeDrop}
              onBack={() => setScreenState({ screen: 'detail', dropId: activeDrop.id })}
              onOrderJoined={handleOrderJoined}
            />
          )}

          {screenState.screen === 'feedback' && (
            <FeedbackScreen
              type={screenState.type}
              drop={activeDrop}
              onFinished={handleBackToDiscover}
            />
          )}
        </main>
      </div>

      {/* Behavioral Research Analytics Drawer */}
      <AnalyticsDrawer
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        events={events}
        feedbackList={feedbackList}
        onDataCleared={handleDataCleared}
      />
    </div>
  );
}
