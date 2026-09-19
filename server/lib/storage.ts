import fs from 'fs/promises';
import path from 'path';
import { safeLog } from './safeLog';
import { stripPreciseLocation } from './validation';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const INTENTS_FILE = path.join(DATA_DIR, 'order_intents.json');

// In-memory mirrors for high-throughput reads
let eventsCache: any[] = [];
let commentsCache: any[] = [];
let intentsCache: any[] = [];
let initialized = false;

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    safeLog('error', 'Failed to create data directory', { err: String(err) });
  }
}

async function loadFile<T>(filePath: string, defaultVal: T): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return defaultVal;
  }
}

async function persistFile(filePath: string, data: any) {
  try {
    await ensureDataDir();
    const tempFile = `${filePath}.tmp.${Date.now()}`;
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempFile, filePath);
  } catch (err) {
    safeLog('error', 'Failed to persist storage file', { filePath, err: String(err) });
  }
}

export async function initStorage() {
  if (initialized) return;
  await ensureDataDir();
  eventsCache = await loadFile(EVENTS_FILE, []);
  commentsCache = await loadFile(COMMENTS_FILE, []);
  intentsCache = await loadFile(INTENTS_FILE, []);
  initialized = true;
  safeLog('info', 'CoMeal file-backed storage initialized', {
    eventsCount: eventsCache.length,
    commentsCount: commentsCache.length,
    intentsCount: intentsCache.length,
  });
}

export async function saveEvent(event: any) {
  await initStorage();

  // Privacy choke point: exact coordinates and addresses are stripped here, so
  // they cannot reach events.json from any caller. Only distanceBand survives.
  const safeMetadata = stripPreciseLocation(event.context || event.metadata || {});

  const record = {
    id: event.id || `evt_${Math.random().toString(36).substring(2, 9)}`,
    session_id: event.sessionId,
    event_name: event.event,
    meal_batch_id: event.mealBatchId || null,
    neighbourhood: event.context?.neighbourhood || event.location || null,
    fulfilment_type: event.context?.fulfilmentType || null,
    metadata: safeMetadata,
    created_at: event.timestamp || new Date().toISOString(),
  };

  eventsCache.unshift(record);
  if (eventsCache.length > 2000) {
    eventsCache = eventsCache.slice(0, 2000);
  }

  // Persist asynchronously to avoid blocking API response
  persistFile(EVENTS_FILE, eventsCache).catch((err) =>
    safeLog('error', 'Async event persist failed', { err: String(err) })
  );

  return record;
}

export async function getEvents(limit = 100) {
  await initStorage();
  return eventsCache.slice(0, limit);
}

export async function saveComment(comment: any) {
  await initStorage();
  const record = {
    id: `cm_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`,
    session_id: comment.sessionId,
    meal_batch_id: comment.mealBatchId || null,
    context: comment.context,
    primary_factor: comment.primaryFactor,
    comment: comment.comment,
    created_at: new Date().toISOString(),
  };

  commentsCache.unshift(record);
  persistFile(COMMENTS_FILE, commentsCache).catch((err) =>
    safeLog('error', 'Async comment persist failed', { err: String(err) })
  );

  return record;
}

export async function getComments(limit = 100) {
  await initStorage();
  return commentsCache.slice(0, limit);
}

export async function saveOrderIntent(intent: any) {
  await initStorage();
  const record = {
    id: `intent_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`,
    session_id: intent.sessionId,
    meal_batch_id: intent.mealBatchId,
    quantity: intent.quantity,
    fulfilment_type: intent.fulfilmentType,
    // Fee quoted to this customer at the moment they joined (pre-order cluster
    // state). Stored so the recorded price can be reconciled against what the
    // customer was shown. Pickup is always 0.
    delivery_fee: typeof intent.deliveryFee === 'number' ? intent.deliveryFee : null,
    neighbourhood: intent.neighbourhood || null,
    created_at: new Date().toISOString(),
  };

  intentsCache.unshift(record);
  persistFile(INTENTS_FILE, intentsCache).catch((err) =>
    safeLog('error', 'Async intent persist failed', { err: String(err) })
  );

  return record;
}

export async function getOrderIntents(limit = 100) {
  await initStorage();
  return intentsCache.slice(0, limit);
}

export async function clearAllStorage() {
  eventsCache = [];
  commentsCache = [];
  intentsCache = [];
  await Promise.all([
    persistFile(EVENTS_FILE, []),
    persistFile(COMMENTS_FILE, []),
    persistFile(INTENTS_FILE, []),
  ]);
  safeLog('info', 'CoMeal storage cleared');
}

export function getStorageStatus() {
  return {
    configured: true,
    mode: 'file_backed_json_store',
    path: DATA_DIR,
    eventCount: eventsCache.length,
    commentCount: commentsCache.length,
    intentCount: intentsCache.length,
  };
}
