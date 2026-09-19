/**
 * CoMeal SG - Input Validation & Allow-lists
 * Enforces strict schemas and prevents injection or unsupported behavioral event flooding.
 */

export const ALLOWED_EVENT_NAMES = new Set([
  'discover_viewed',
  'neighbourhood_selected',
  'location_selected',
  'meal_card_viewed',
  'meal_card_clicked',
  'home_cook_card_viewed',
  'home_cook_clicked',
  'meal_clicked',
  'meal_drop_viewed',
  'cook_profile_clicked',
  'cook_reviews_opened',
  'customer_photos_opened',
  'distance_clicked',
  'meal_batch_progress_viewed',
  'delivery_cluster_viewed',
  'group_progress_clicked',
  'reviews_opened',
  'pickup_selected',
  'delivery_selected',
  'delivery_fee_viewed',
  'join_batch_clicked',
  'join_drop_clicked',
  'join_order_clicked',
  'order_intent_registered',
  'order_joined',
  'order_abandoned',
  'drop_abandoned',
  'feedback_submitted',
  'feedback_option_selected',
  'comment_submitted',
]);

// Allowed qualitative factors for post-order conversion
export const ALLOWED_CONVERSION_FACTORS = new Set([
  'trusted_home_cook',
  'good_reviews',
  'food_appeal',
  'price',
  'nearby_location',
  'free_pickup',
  'delivery_convenience',
  'shared_delivery_discount',
  'neighbours_joined',
  'convenient_timing',
  'other',
  // UI Display Labels from FeedbackScreen
  'Trusted home cook',
  'Good neighbour reviews',
  'Food looked good',
  'Price',
  'Nearby location',
  'Free pickup',
  'Delivery convenience',
  'Cheaper shared delivery',
  'Neighbours already joined',
  'Convenient timing',
]);

// Allowed qualitative factors for drop abandonment
export const ALLOWED_ABANDONMENT_FACTORS = new Set([
  'unknown_cook',
  'not_enough_reviews',
  'food_not_appealing',
  'price_too_high',
  'delivery_fee_too_high',
  'pickup_too_far',
  'timing_did_not_work',
  'just_browsing',
  'other',
  // UI Display Labels from FeedbackScreen
  "I don't know the cook",
  'Not enough reviews',
  'Too expensive',
  'Delivery fee too high',
  'Pickup too far',
  'Wrong timing',
  'Food not appealing',
  'Just browsing',
  'Other',
]);

export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return '';
  // Strip potential HTML tags and decode basic symbols
  return input
    .replace(/<[^>]*>?/gm, '')
    .trim();
}

export function validateEventPayload(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { event, sessionId } = body;

  if (!event || typeof event !== 'string') {
    return { valid: false, error: 'Field "event" is required and must be a string' };
  }

  if (!ALLOWED_EVENT_NAMES.has(event)) {
    return { valid: false, error: `Unsupported event name: "${event}"` };
  }

  if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 3) {
    return { valid: false, error: 'Field "sessionId" is required and must be a valid string' };
  }

  return { valid: true };
}

export function validateCommentPayload(body: any): { valid: boolean; error?: string; sanitized?: any } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { sessionId, mealBatchId, context, primaryFactor, comment } = body;

  if (!sessionId || typeof sessionId !== 'string') {
    return { valid: false, error: 'Field "sessionId" is required' };
  }

  const normalizedContext = context === 'conversion' ? 'post_order' : context;
  if (!['post_order', 'abandonment'].includes(normalizedContext)) {
    return { valid: false, error: 'Field "context" must be "post_order" or "abandonment"' };
  }

  const allowedFactors = normalizedContext === 'post_order' ? ALLOWED_CONVERSION_FACTORS : ALLOWED_ABANDONMENT_FACTORS;
  if (primaryFactor && !allowedFactors.has(primaryFactor)) {
    return { valid: false, error: `Invalid primary factor "${primaryFactor}" for context "${normalizedContext}"` };
  }

  const cleanComment = sanitizeText(comment);
  // Human product decision: limit free-text comments to 500 characters
  if (cleanComment.length > 500) {
    return { valid: false, error: 'Comment must be 500 characters or fewer' };
  }

  return {
    valid: true,
    sanitized: {
      sessionId: sanitizeText(sessionId),
      mealBatchId: mealBatchId ? sanitizeText(mealBatchId) : undefined,
      context: normalizedContext,
      primaryFactor: primaryFactor ? sanitizeText(primaryFactor) : 'other',
      comment: cleanComment,
    },
  };
}

export function validateOrderIntentPayload(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { mealBatchId, quantity, fulfilmentType, sessionId } = body;

  if (!mealBatchId || typeof mealBatchId !== 'string') {
    return { valid: false, error: 'Field "mealBatchId" is required' };
  }

  if (typeof quantity !== 'number' || quantity < 1 || quantity > 10 || !Number.isInteger(quantity)) {
    return { valid: false, error: 'Field "quantity" must be an integer between 1 and 10' };
  }

  if (!['pickup', 'delivery'].includes(fulfilmentType)) {
    return { valid: false, error: 'Field "fulfilmentType" must be either "pickup" or "delivery"' };
  }

  if (!sessionId || typeof sessionId !== 'string') {
    return { valid: false, error: 'Field "sessionId" is required' };
  }

  return { valid: true };
}
