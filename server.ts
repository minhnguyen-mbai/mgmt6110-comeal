/**
 * Local / self-hosted entrypoint.
 *
 * Runs the same API app as production plus the frontend: Vite middleware in
 * development, static `dist` otherwise. Vercel does NOT use this file - it
 * serves the built frontend itself and runs api/index.ts as a function.
 */
import dotenv from 'dotenv';

// Load local secrets before anything reads process.env.
// .env.local wins over .env; dotenv never overrides variables already set in
// the real environment, so deployment config still takes precedence.
dotenv.config({ path: '.env.local' });
dotenv.config();

import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './server/app';
import { initStorage } from './server/lib/storage';

async function startServer() {
  // Respect the platform-provided port; fall back to 3000 for local use.
  const PORT = Number(process.env.PORT) || 3000;

  await initStorage();

  // API routes are registered first so they always win over the SPA fallback.
  const app = createApiApp();

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
