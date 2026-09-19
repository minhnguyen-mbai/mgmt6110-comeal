/**
 * Vercel-compatible runtime probe.
 *
 * Loads api/index.ts the way Vercel's Node runtime does - as a default-exported
 * (req, res) handler - and serves it over plain http. This exercises the actual
 * serverless entrypoint rather than server.ts, so it catches the case where the
 * long-running server works locally but the deployed function does not.
 *
 * Run: npx tsx scripts/vercel_fn_probe.ts
 */
import http from 'http';
import handler from '../api/index';

const PORT = 3999;

const server = http.createServer((req, res) => {
  try {
    (handler as any)(req, res);
  } catch (err: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ harnessError: String(err?.message || err) }));
  }
});

interface Case {
  label: string;
  path: string;
  /** Route must exist: a 404 is a failure even when the provider errors. */
  mustNotBe404?: boolean;
  expectJson?: boolean;
}

const CASES: Case[] = [
  { label: '/api/health', path: '/api/health', expectJson: true, mustNotBe404: true },
  { label: '/api/weather?area=Clementi', path: '/api/weather?area=Clementi', expectJson: true, mustNotBe404: true },
  { label: '/api/location/search?query=Clementi', path: '/api/location/search?query=Clementi', expectJson: true, mustNotBe404: true },
  { label: '/api/meal-batches', path: '/api/meal-batches', expectJson: true, mustNotBe404: true },
  { label: '/api/events (GET)', path: '/api/events', expectJson: true, mustNotBe404: true },
  { label: '/api/comments (GET)', path: '/api/comments', expectJson: true, mustNotBe404: true },
  // Proves the prefix-normalisation guard in api/index.ts works if Vercel
  // delivers the path with /api already stripped.
  { label: 'prefix-stripped /health', path: '/health', expectJson: true, mustNotBe404: true },
  // Unknown API paths must be JSON, never the SPA's HTML.
  { label: 'unknown /api/nope', path: '/api/nope', expectJson: true },
];

function get(path: string): Promise<{ status: number; body: string; type: string; ms: number }> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path, timeout: 20000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () =>
        resolve({
          status: res.statusCode || 0,
          body,
          type: String(res.headers['content-type'] || ''),
          ms: Date.now() - started,
        })
      );
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

server.listen(PORT, async () => {
  console.log(`Vercel-style function harness on :${PORT}\n`);
  let failures = 0;

  for (const c of CASES) {
    try {
      const r = await get(c.path);
      const isJson = r.type.includes('application/json');
      const is404 = r.status === 404;
      const bad404 = Boolean(c.mustNotBe404 && is404);
      const badType = Boolean(c.expectJson && !isJson);
      const ok = !bad404 && !badType;
      if (!ok) failures++;

      let parsed = '';
      try {
        const j = JSON.parse(r.body);
        parsed = j.ok === false ? `ok:false code:${j.code}` : `ok:${j.ok}`;
      } catch {
        parsed = r.body.slice(0, 40).replace(/\s+/g, ' ');
      }

      console.log(
        `${ok ? 'PASS' : 'FAIL'}  ${c.label.padEnd(38)} ${String(r.status).padEnd(4)} ` +
        `${isJson ? 'json' : 'NOT-JSON'}  ${String(r.ms).padStart(5)}ms  ${parsed}`
      );
      if (bad404) console.log('        !! route does not exist (404)');
      if (badType) console.log(`        !! expected JSON, got ${r.type || 'no content-type'}`);
    } catch (err: any) {
      failures++;
      console.log(`FAIL  ${c.label.padEnd(38)} ${String(err?.message || err)}`);
    }
  }

  console.log(`\n${failures === 0 ? 'ALL ROUTES SERVED BY THE FUNCTION' : `${failures} FAILURE(S)`}`);
  server.close();
  process.exit(failures ? 1 : 0);
});
