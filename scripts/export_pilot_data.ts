import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const INTENTS_FILE = path.join(DATA_DIR, 'order_intents.json');

function loadJsonFile<T>(filePath: string, defaultVal: T): T {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

interface EventRecord {
  id: string;
  session_id: string;
  event_name: string;
  meal_batch_id?: string | null;
  neighbourhood?: string | null;
  fulfilment_type?: string | null;
  metadata?: any;
  created_at: string;
}

interface CommentRecord {
  id: string;
  session_id: string;
  meal_batch_id?: string | null;
  context: string;
  primary_factor: string;
  comment?: string;
  created_at: string;
}

interface IntentRecord {
  id: string;
  session_id: string;
  meal_batch_id: string;
  quantity: number;
  fulfilment_type: string;
  neighbourhood?: string | null;
  created_at: string;
}

interface SessionSummaryRow {
  session_id: string;
  meal_viewed: string;
  cook_reviews_opened: boolean;
  distance_band: string;
  batch_progress: string;
  households_joined: string;
  delivery_fee: string;
  fulfilment_selected: string;
  order_intent: boolean;
  primary_factor: string;
  comment_present: boolean;
  comment_text?: string;
}

export function generateSessionDataset(): {
  summaryRows: SessionSummaryRow[];
  totalSessions: number;
  eventsCount: number;
  commentsCount: number;
  intentsCount: number;
} {
  const events: EventRecord[] = loadJsonFile(EVENTS_FILE, []);
  const comments: CommentRecord[] = loadJsonFile(COMMENTS_FILE, []);
  const intents: IntentRecord[] = loadJsonFile(INTENTS_FILE, []);

  // Collect unique sessions
  const sessions = new Set<string>();
  events.forEach((e) => e.session_id && sessions.add(e.session_id));
  comments.forEach((c) => c.session_id && sessions.add(c.session_id));
  intents.forEach((i) => i.session_id && sessions.add(i.session_id));

  const summaryRows: SessionSummaryRow[] = [];

  for (const sessionId of Array.from(sessions)) {
    const sessionEvents = events.filter((e) => e.session_id === sessionId);
    const sessionComments = comments.filter((c) => c.session_id === sessionId);
    const sessionIntents = intents.filter((i) => i.session_id === sessionId);

    // Identify meals viewed
    const mealViews = sessionEvents.filter(
      (e) => e.event_name === 'meal_drop_viewed' || e.event_name === 'meal_card_clicked'
    );
    const primaryMeal =
      mealViews[0]?.meal_batch_id ||
      sessionIntents[0]?.meal_batch_id ||
      sessionComments[0]?.meal_batch_id ||
      'none';

    // Did user open cook reviews
    const reviewsOpened = sessionEvents.some((e) => e.event_name === 'cook_reviews_opened');

    // Fulfilment selected
    const deliveryEvt = sessionEvents.find((e) => e.event_name === 'delivery_selected');
    const pickupEvt = sessionEvents.find((e) => e.event_name === 'pickup_selected');
    const fulfilment = sessionIntents[0]?.fulfilment_type || (deliveryEvt ? 'delivery' : pickupEvt ? 'pickup' : 'none');

    // Context metadata
    const orderIntentEvt = sessionEvents.find((e) => e.event_name === 'order_intent_registered');
    const deliveryClusterEvt = sessionEvents.find((e) => e.event_name === 'delivery_cluster_viewed');
    const batchProgressEvt = sessionEvents.find((e) => e.event_name === 'meal_batch_progress_viewed');

    const householdsJoined =
      orderIntentEvt?.metadata?.householdsJoinedNow ??
      deliveryClusterEvt?.metadata?.householdsJoined ??
      'N/A';

    const batchProgress =
      orderIntentEvt?.metadata?.portionsBookedNow ??
      batchProgressEvt?.metadata?.portionsBooked ??
      'N/A';

    const deliveryFee =
      orderIntentEvt?.metadata?.deliveryFee !== undefined
        ? `S$${orderIntentEvt.metadata.deliveryFee}`
        : deliveryEvt?.metadata?.fee !== undefined
        ? `S$${deliveryEvt.metadata.fee}`
        : fulfilment === 'pickup'
        ? 'S$0'
        : 'N/A';

    const distanceBand =
      sessionEvents.find((e) => e.metadata?.distanceKm)?.metadata?.distanceKm
        ? `${sessionEvents.find((e) => e.metadata?.distanceKm)?.metadata?.distanceKm}km`
        : '1-2km';

    const primaryFactor = sessionComments[0]?.primary_factor || 'none';
    const commentText = sessionComments[0]?.comment || '';
    const hasComment = Boolean(commentText.trim());

    summaryRows.push({
      session_id: sessionId,
      meal_viewed: primaryMeal,
      cook_reviews_opened: reviewsOpened,
      distance_band: distanceBand,
      batch_progress: String(batchProgress),
      households_joined: String(householdsJoined),
      delivery_fee: deliveryFee,
      fulfilment_selected: fulfilment,
      order_intent: sessionIntents.length > 0 || Boolean(orderIntentEvt),
      primary_factor: primaryFactor,
      comment_present: hasComment,
      comment_text: commentText,
    });
  }

  return {
    summaryRows,
    totalSessions: sessions.size,
    eventsCount: events.length,
    commentsCount: comments.length,
    intentsCount: intents.length,
  };
}

// CLI runner
if (process.argv[1] && process.argv[1].includes('export_pilot_data')) {
  const format = process.argv.find((a) => a.startsWith('--format='))?.split('=')[1] || 'table';
  const data = generateSessionDataset();

  if (format === 'csv') {
    const headers = [
      'session_id',
      'meal_viewed',
      'cook_reviews_opened',
      'distance_band',
      'batch_progress',
      'households_joined',
      'delivery_fee',
      'fulfilment_selected',
      'order_intent',
      'primary_factor',
      'comment_present',
      'comment_text',
    ];
    console.log(headers.join(','));
    for (const r of data.summaryRows) {
      console.log(
        [
          r.session_id,
          r.meal_viewed,
          r.cook_reviews_opened,
          r.distance_band,
          r.batch_progress,
          r.households_joined,
          r.delivery_fee,
          r.fulfilment_selected,
          r.order_intent,
          `"${r.primary_factor.replace(/"/g, '""')}"`,
          r.comment_present,
          `"${(r.comment_text || '').replace(/"/g, '""')}"`,
        ].join(',')
      );
    }
  } else if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log('\n======================================================');
    console.log(' CoMeal SG — Pilot User Behavioral Dataset Export');
    console.log('======================================================');
    console.log(`Total Anonymous Sessions: ${data.totalSessions}`);
    console.log(`Total Tracked Events:     ${data.eventsCount}`);
    console.log(`Total Comments/Factors:   ${data.commentsCount}`);
    console.log(`Total Order Intents:      ${data.intentsCount}`);
    console.log('------------------------------------------------------\n');
    console.table(
      data.summaryRows.map((r) => ({
        Session: r.session_id.substring(0, 14),
        Meal: r.meal_viewed,
        Reviews: r.cook_reviews_opened ? 'YES' : 'NO',
        Fulfilment: r.fulfilment_selected,
        Fee: r.delivery_fee,
        Intent: r.order_intent ? 'JOINED' : 'ABANDONED',
        Factor: r.primary_factor.substring(0, 20),
        Comment: r.comment_present ? 'YES' : 'NO',
      }))
    );
  }
}
