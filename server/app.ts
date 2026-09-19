/**
 * CoMeal SG - API application factory
 *
 * The single definition of the /api surface. Both entrypoints use it, so the
 * routes cannot drift apart:
 *
 *   server.ts      - long-running Node server for local dev and self-hosting
 *                    (adds Vite middleware or static file serving on top)
 *   api/index.ts   - Vercel serverless function (API only; Vercel serves the
 *                    built frontend itself)
 *
 * Nothing here listens on a port or touches the filesystem at import time,
 * which is what makes it safe to use in a serverless runtime.
 */
import express, { Express } from 'express';
import { healthRouter } from './routes/health';
import { weatherRouter } from './routes/weather';
import { locationRouter } from './routes/location';
import { mealBatchesRouter } from './routes/mealBatches';
import { orderIntentRouter } from './routes/orderIntent';
import { eventsRouter } from './routes/events';
import { commentsRouter } from './routes/comments';

export function createApiApp(): Express {
  const app = express();

  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.use('/api/weather', weatherRouter);
  app.use('/api/location', locationRouter);
  app.use('/api/meal-batches', mealBatchesRouter);
  app.use('/api/order-intent', orderIntentRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/comments', commentsRouter);

  // Any unmatched /api/* path is a JSON 404, never an HTML page. Without this
  // a missing route falls through to the SPA fallback and the client receives
  // index.html where it expected JSON.
  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Unknown API route' });
  });

  return app;
}
