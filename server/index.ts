import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, getDbPath, runSchema } from './db.js';
import { stateRoute } from './routes/state.js';
import { progressRoute } from './routes/progress.js';
import { sessionsRoute } from './routes/sessions.js';
import { reviewsRoute } from './routes/reviews.js';
import { notesRoute } from './routes/notes.js';
import { subtopicsRoute } from './routes/subtopics.js';
import { milestonesRoute } from './routes/milestones.js';
import { reflectionsRoute } from './routes/reflections.js';
import { migrateRoute } from './routes/migrate.js';
import { adminRoute } from './routes/admin.js';
import { metricsRoute } from './routes/metrics.js';
import { roadmapRoute, seedRoadmapIfEmpty } from './routes/roadmap.js';
import { routinesRoute } from './routes/routines.js';
import { filesRoute } from './routes/files.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = new Hono();

// CORS: only needed in dev (Vite proxy). In production (Electron), the
// renderer loads from the same origin so no CORS headers are necessary.
const isDev = !process.env.STUDYPATH_PRODUCTION;
if (isDev) {
  app.use(
    '*',
    cors({
      origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
      ],
    }),
  );
}

app.get('/api/health', (c) => {
  const schemaVersion =
    (db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version') as
      | { value: string }
      | undefined)?.value ?? 'unknown';
  const info: Record<string, unknown> = { ok: true, version: '0.1.0', schemaVersion };
  if (!process.env.STUDYPATH_PRODUCTION) info.dbPath = getDbPath();
  return c.json(info);
});

app.route('/api/state', stateRoute);
app.route('/api/progress', progressRoute);
app.route('/api/sessions', sessionsRoute);
app.route('/api/reviews', reviewsRoute);
app.route('/api/notes', notesRoute);
app.route('/api/subtopics', subtopicsRoute);
app.route('/api/milestones', milestonesRoute);
app.route('/api/reflections', reflectionsRoute);
app.route('/api/migrate', migrateRoute);
app.route('/api/admin', adminRoute);
app.route('/api/metrics', metricsRoute);
app.route('/api/roadmap', roadmapRoute);
app.route('/api/routines', routinesRoute);
app.route('/api/files', filesRoute);

/* ── Static-file serving for the packaged renderer ──────────────────
 *   When running inside Electron, the built Vite bundle (dist/) is
 *   served directly so the renderer loads same-origin and avoids CORS.
 *   dist/ may live in different places depending on how the app was
 *   packaged, so we search a few candidates.
 * ─────────────────────────────────────────────────────────────────── */

const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;

const distCandidates = [
  resolve(__dirname, '..', 'dist'),                     // dev / dist-server sibling
  resolve(__dirname, '..', '..', 'dist'),               // dist-server nested one deeper
  resourcesPath ? resolve(resourcesPath, 'app', 'dist') : '', // packaged (asar)
  resourcesPath ? resolve(resourcesPath, 'dist') : '',  // packaged (flat)
].filter(Boolean);
const distRoot = distCandidates.find(p => existsSync(resolve(p, 'index.html')));

if (distRoot) {
  // Serve static assets relative to distRoot for anything not under /api
  app.use('/*', serveStatic({ root: distRoot }));

  // SPA fallback — any unmatched GET returns index.html
  app.get('*', (c) => {
    const html = readFileSync(resolve(distRoot, 'index.html'), 'utf-8');
    return c.html(html);
  });
}

app.notFound((c) => {
  if (c.req.path.startsWith('/api')) {
    return c.json({ error: 'not_found' }, 404);
  }
  if (distRoot) {
    const html = readFileSync(resolve(distRoot, 'index.html'), 'utf-8');
    return c.html(html);
  }
  return c.json({ error: 'not_found' }, 404);
});

app.onError((err, c) => {
  console.error('[server error]', err);
  const body: Record<string, string> = { error: 'internal_error' };
  if (!process.env.STUDYPATH_PRODUCTION) body.message = err.message;
  return c.json(body, 500);
});

/* ── Server lifecycle helpers ───────────────────────────────────────── */

export async function startServer(): Promise<number> {
  runSchema();
  // Seed roadmap only when explicitly requested (smoke tests) or on first boot
  // in development. Production Electron builds do NOT auto-seed.
  if (process.env.STUDYPATH_SEED === '1') {
    seedRoadmapIfEmpty();
  }
  const port = Number(process.env.STUDYPATH_PORT ?? 3001);
  return new Promise((resolvePort) => {
    serve(
      { fetch: app.fetch, port, hostname: '127.0.0.1' },
      (info) => {
        console.log(`[studypath-server] listening on http://127.0.0.1:${info.port}`);
        console.log(`[studypath-server] db: ${getDbPath()}`);
        resolvePort(info.port);
      },
    );
  });
}

// Auto-start when run as a CLI entry (tsx or node dist-server/index.js).
// Electron imports the module and calls startServer() explicitly.
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === process.argv[1] ||
    process.argv[1].endsWith('/server/index.ts') ||
    process.argv[1].endsWith('/dist-server/index.js'));

if (isMain) {
  startServer();
}
