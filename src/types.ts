export type MealDropStatus = 'OPEN' | 'ALMOST_FULL' | 'UNLOCKED' | 'SOLD_OUT' | 'CLOSED';

export type DayBucket = 'tonight' | 'tomorrow' | 'weekend';

export interface ReviewItem {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
  residentArea?: string;
  orderCount?: number;
}

export interface FeaturedReview {
  author: string;
  residentArea: string;
  orderCount: number;
  rating: number;
  comment: string;
}

export interface MealDrop {
  id: string;
  cookName: string;
  cookAvatar: string;
  cookBio: string;
  cookAddressShort: string;
  completedBatches: number; // e.g. 24 previous batches
  cookingSchedule: string; // e.g. "Vietnamese family meals every Thu & Sun"
  repeatCustomersPct?: number; // e.g. 84% repeat neighbours
  mealName: string;
  mealImage: string;
  shortDescription: string;
  fullDescription: string;
  cuisine: string;
  pricePerPortion: number;
  neighbourhood: string;
  /**
   * DEPRECATED - demo seed value, no longer rendered anywhere.
   * User-visible distance now comes from real OneMap walking routes via
   * useWalkingDistance(). Do not display this field.
   */
  distanceKm: number;
  pickupLocation: string; // e.g. "Blk 318 Clementi Ave 4 (Void Deck near Lift B)"
  pickupWindow: string; // e.g. "6:30 – 8:00 PM"
  deliveryArea: string;
  deliveryWindow: string;
  deliveryClusterName: string; // e.g. "Clementi West"
  deliveryClusterHouseholdsJoined: number; // e.g. 4
  deliveryClusterThreshold: number; // e.g. 5
  dayBucket: DayBucket;
  orderCutoffTime: string;
  totalPortions: number;
  portionsJoined: number;
  groupOrderThreshold: number; // e.g. 20
  currentDeliveryFee: number; // e.g. 4.00
  unlockedDeliveryFee: number; // e.g. 2.00
  rating: number;
  reviewCount: number;
  featuredReview: FeaturedReview;
  neighbourPhotos: string[];
  reviews: ReviewItem[];
  allergens: string[];
  ingredients: string[];
  status: MealDropStatus;
  weatherContext?: string;
}

export type TrackingEventType =
  | 'discover_viewed'
  | 'location_selected'
  | 'home_cook_card_viewed'
  | 'home_cook_clicked'
  | 'meal_card_clicked'
  | 'meal_clicked'
  | 'meal_drop_viewed'
  | 'cook_profile_clicked'
  | 'cook_reviews_opened'
  | 'customer_photos_opened'
  | 'distance_clicked'
  | 'meal_batch_progress_viewed'
  | 'delivery_cluster_viewed'
  | 'group_progress_clicked'
  | 'reviews_opened'
  | 'pickup_selected'
  | 'delivery_selected'
  | 'delivery_fee_viewed'
  | 'join_drop_clicked'
  | 'join_order_clicked'
  | 'order_joined'
  | 'drop_abandoned'
  | 'order_abandoned'
  | 'feedback_submitted'
  | 'feedback_option_selected'
  | 'comment_submitted';

export interface TrackingEvent {
  id: string;
  event: TrackingEventType;
  mealDropId?: string;
  mealName?: string;
  location?: string;
  sessionId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface QualitativeFeedback {
  id: string;
  type: 'conversion' | 'abandonment';
  mealDropId?: string;
  mealName?: string;
  selectedOption: string;
  comment: string;
  sessionId: string;
  timestamp: string;
}

export type ScreenState =
  | { screen: 'discover' }
  | { screen: 'detail'; dropId: string }
  | { screen: 'join'; dropId: string }
  | { screen: 'feedback'; dropId?: string; type: 'conversion' | 'abandonment' };

/**
 * A location the user explicitly searched for and selected.
 * Lives in the browser session only. Never written to behavioural analytics -
 * see stripPreciseLocation() on the server, which enforces that server-side.
 */
export interface UserLocation {
  address: string;
  postalCode: string;
  latitude: number;
  longitude: number;
}

/** A real OneMap walking route. */
export interface WalkingRoute {
  distanceMeters: number;
  distanceKm: number;
  walkingSeconds: number;
  walkingMinutes: number;
}

/**
 * Distance display state for one meal card.
 * 'idle' means no location chosen yet - the UI shows a neutral prompt rather
 * than any distance figure.
 */
export type DistanceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; route: WalkingRoute }
  | { status: 'unavailable' };
