import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { healthRouter } from './server/routes/health';
import { weatherRouter } from './server/routes/weather';
import { locationRouter } from './server/routes/location';
import { mealBatchesRouter } from './server/routes/mealBatches';
import { orderIntentRouter } from './server/routes/orderIntent';
import { eventsRouter } from './server/routes/events';
import { commentsRouter } from './server/routes/comments';
import { initStorage } from './server/lib/storage';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Pre-initialize persistent file storage
  await initStorage();

  app.use(express.json());

  // API routes go here FIRST
  app.use('/api/health', healthRouter);
  app.use('/api/weather', weatherRouter);
  app.use('/api/location', locationRouter);
  app.use('/api/meal-batches', mealBatchesRouter);
  app.use('/api/order-intent', orderIntentRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/comments', commentsRouter);

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
