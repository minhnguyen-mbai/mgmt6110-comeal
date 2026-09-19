import { Router, Request, Response } from 'express';
import { validateEventPayload } from '../lib/validation';
import { saveEvent, getEvents } from '../lib/storage';

export const eventsRouter = Router();

eventsRouter.post('/', async (req: Request, res: Response) => {
  const validation = validateEventPayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      code: 'INVALID_REQUEST',
      message: validation.error,
    });
  }

  try {
    const saved = await saveEvent(req.body);
    return res.status(201).json({
      ok: true,
      eventSaved: true,
      id: saved.id,
    });
  } catch {
    return res.status(500).json({
      ok: false,
      code: 'STORAGE_UNAVAILABLE',
      message: 'Failed to record tracking event',
    });
  }
});

eventsRouter.get('/', async (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit as string) || '100', 10);
  const events = await getEvents(limit);
  return res.json({
    ok: true,
    total: events.length,
    events,
  });
});
