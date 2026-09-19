import { TrackingEvent, TrackingEventType, QualitativeFeedback } from '../types';

const SESSION_KEY = 'mealdrop_session_id';
const EVENTS_KEY = 'mealdrop_tracking_events';
const FEEDBACK_KEY = 'mealdrop_feedback_entries';

// Helper to get or create a stable session ID
export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// In-memory event listeners for real-time UI updates
type EventListener = (event: TrackingEvent) => void;
type FeedbackListener = (feedback: QualitativeFeedback) => void;

const eventListeners: Set<EventListener> = new Set();
const feedbackListeners: Set<FeedbackListener> = new Set();

export function getStoredEvents(): TrackingEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load tracking events', err);
    return [];
  }
}

export function getStoredFeedback(): QualitativeFeedback[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load feedback', err);
    return [];
  }
}

export function trackEvent(
  event: TrackingEventType,
  payload?: {
    mealDropId?: string;
    mealName?: string;
    location?: string;
    metadata?: Record<string, any>;
  }
): TrackingEvent {
  const newEvent: TrackingEvent = {
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    event,
    mealDropId: payload?.mealDropId,
    mealName: payload?.mealName,
    location: payload?.location,
    sessionId: getSessionId(),
    timestamp: new Date().toISOString(),
    metadata: payload?.metadata,
  };

  try {
    const existing = getStoredEvents();
    const updated = [newEvent, ...existing].slice(0, 500); // keep up to 500 events
    localStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error storing tracking event', err);
  }

  // Notify listeners
  eventListeners.forEach((listener) => {
    try {
      listener(newEvent);
    } catch (e) {
      console.error(e);
    }
  });

  // Asynchronously send to CoMeal backend API layer
  if (typeof fetch === 'function') {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: newEvent.event,
        sessionId: newEvent.sessionId,
        mealBatchId: newEvent.mealDropId,
        timestamp: newEvent.timestamp,
        context: {
          mealName: newEvent.mealName,
          neighbourhood: newEvent.location,
          ...(newEvent.metadata || {}),
        },
      }),
    }).catch((err) => {
      // Non-blocking background log
      console.debug('Backend event tracking buffered locally', err);
    });
  }

  return newEvent;
}

export function submitFeedback(feedback: {
  type: 'conversion' | 'abandonment';
  mealDropId?: string;
  mealName?: string;
  selectedOption: string;
  comment: string;
}): QualitativeFeedback {
  const newFeedback: QualitativeFeedback = {
    id: 'fb_' + Math.random().toString(36).substring(2, 9),
    type: feedback.type,
    mealDropId: feedback.mealDropId,
    mealName: feedback.mealName,
    selectedOption: feedback.selectedOption,
    comment: feedback.comment,
    sessionId: getSessionId(),
    timestamp: new Date().toISOString(),
  };

  try {
    const existing = getStoredFeedback();
    const updated = [newFeedback, ...existing];
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving feedback', err);
  }

  // Send to backend /api/comments
  if (typeof fetch === 'function') {
    fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: newFeedback.sessionId,
        mealBatchId: newFeedback.mealDropId,
        context: feedback.type === 'conversion' ? 'post_order' : 'abandonment',
        primaryFactor: feedback.selectedOption,
        comment: feedback.comment || '',
      }),
    }).catch((err) => {
      console.debug('Backend comment buffered locally', err);
    });
  }

  feedbackListeners.forEach((listener) => {
    try {
      listener(newFeedback);
    } catch (e) {
      console.error(e);
    }
  });

  return newFeedback;
}

export function subscribeToEvents(listener: EventListener): () => void {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

export function subscribeToFeedback(listener: FeedbackListener): () => void {
  feedbackListeners.add(listener);
  return () => {
    feedbackListeners.delete(listener);
  };
}

export function clearTrackingData(): void {
  localStorage.removeItem(EVENTS_KEY);
  localStorage.removeItem(FEEDBACK_KEY);
}
