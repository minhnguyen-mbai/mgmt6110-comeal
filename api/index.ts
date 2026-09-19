/**
 * Vercel serverless entrypoint for the CoMeal API.
 *
 * Vercel serves the built Vite frontend as static files and does not run
 * server.ts, so the Express API has to be exposed as a function. vercel.json
 * rewrites every /api/* request here; Express then does its own routing.
 *
 * This file adds no routes of its own - the API is defined once in
 * server/app.ts and shared with the local server.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { createApiApp } from '../server/app';

const app = createApiApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Depending on how the rewrite resolves, the function can receive the path
  // either with the /api prefix intact or already stripped. The route mounts
  // in server/app.ts all include /api, so restore the prefix when it is
  // missing. This keeps one set of mounts working under both behaviours.
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : `/${req.url}`);
  }
  return (app as unknown as (rq: IncomingMessage, rs: ServerResponse) => void)(req, res);
}
