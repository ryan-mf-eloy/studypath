// StudyPath — backend API smoke test
// Sobe o servidor em porta dedicada, hita endpoints críticos, valida shapes.
// Rodar: node scripts/smoke-api.mjs

import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 4499;
const BASE = `http://127.0.0.1:${PORT}/api`;

function logOk(msg)   { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function logErr(msg)  { console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
function logSection(title) { console.log(`\n\x1b[36m── ${title} ──\x1b[0m`); }

const failures = [];
function assert(cond, name) {
  if (cond) {
    logOk(name);
  } else {
    logErr(name);
    failures.push(name);
  }
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

async function waitForServer(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not start in time');
}

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'studypath-smoke-'));
  const dbPath = join(dir, 'smoke.db');

  logSection('Subindo servidor');
  const server = spawn('npx', ['tsx', 'server/index.ts'], {
    env: { ...process.env, STUDYPATH_PORT: String(PORT), STUDYPATH_DB_PATH: dbPath, STUDYPATH_SEED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  server.stdout.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });

  try {
    await waitForServer();
    logOk('server up');

    logSection('/api/health');
    const health = await getJson('/health');
    assert(health.ok === true, 'health.ok === true');
    assert(typeof health.schemaVersion === 'string', 'schemaVersion is string');

    logSection('/api/state (empty)');
    const empty = await getJson('/state');
    assert(empty.empty === true, 'empty flag on fresh db');
    assert(Array.isArray(empty.progress.checkedTopics), 'progress.checkedTopics is array');

    logSection('Migração from-local');
    const migResult = await postJson('/migrate/from-local', {
      version: 1,
      stores: {
        'studypath-progress': {
          state: {
            checkedTopics: ['2026-04-main-eventloop', '2026-04-main-promises'],
            checkedAt: {
              '2026-04-main-eventloop': '2026-04-12T10:00:00.000Z',
              '2026-04-main-promises': '2026-04-13T08:00:00.000Z',
            },
          },
        },
        'studypath-sessions': {
          state: {
            sessions: [
              {
                id: 'smoke-s1',
                topicId: '2026-04-main-eventloop',
                focusId: '2026-04-main',
                startedAt: '2026-04-13T09:00:00.000Z',
                endedAt: '2026-04-13T09:25:00.000Z',
                durationMs: 1_500_000,
                plannedMs: 1_500_000,
                completed: true,
              },
            ],
          },
        },
      },
    });
    assert(migResult.ok === true, 'migration ok');
    assert(migResult.summary?.checkedTopics === 2, 'migrated 2 topics');
    assert(migResult.summary?.sessions === 1, 'migrated 1 session');

    logSection('Idempotência do migrate');
    const migAgain = await postJson('/migrate/from-local', { version: 1, stores: {} });
    assert(migAgain.skipped === true, 'second migration is skipped');

    logSection('/api/state (populated)');
    const populated = await getJson('/state');
    assert(populated.empty === false, 'empty=false after migrate');
    assert(populated.progress.checkedTopics.length === 2, 'progress has 2 topics');
    assert(populated.sessions.length === 1, 'has 1 session');

    logSection('Progress toggle');
    await postJson('/progress/toggle', { topicId: '2026-04-main-asyncawait' });
    const prog = await getJson('/progress');
    assert(prog.checkedTopics.includes('2026-04-main-asyncawait'), 'toggle added topic');

    logSection('/api/metrics/overview');
    const overview = await getJson('/metrics/overview');
    assert(overview.totalTopicsCount === 145, 'totalTopicsCount === 145');
    assert(overview.checkedTopicsCount === 3, 'checkedTopicsCount === 3');
    assert(overview.activeMonthId === '2026-04', 'activeMonthId === 2026-04');

    logSection('/api/metrics/progress');
    const progMetrics = await getJson('/metrics/progress');
    assert(progMetrics.total.done === 3, 'metrics.total.done === 3');
    assert(progMetrics.byMonth.length > 0, 'byMonth not empty');

    logSection('/api/metrics/pace/2026-04');
    const pace = await getJson('/metrics/pace/2026-04');
    assert(pace.monthId === '2026-04', 'pace monthId matches');
    assert(typeof pace.delta === 'number', 'pace.delta is number');
    assert(typeof pace.dailyGoal === 'number', 'pace.dailyGoal is number');

    logSection('/api/metrics/time');
    const time = await getJson('/metrics/time?scope=week&by=focus');
    assert(time.totalMs === 1_500_000, 'time.totalMs === 1.5s');
    assert(time.byFocus?.[0]?.focusId === '2026-04-main', 'byFocus[0] is main');

    logSection('/api/metrics/streak');
    const streak = await getJson('/metrics/streak');
    assert(typeof streak.current === 'number', 'streak.current is number');
    assert(typeof streak.longest === 'number', 'streak.longest is number');

    logSection('Reset');
    const resetRes = await postJson('/admin/reset', { confirm: true });
    assert(resetRes.ok === true, 'reset ok');
    const afterReset = await getJson('/state');
    assert(afterReset.empty === true, 'state empty after reset');
  } catch (err) {
    console.error('\x1b[31mFatal:\x1b[0m', err.message);
    if (serverOutput) console.error('\n--- server log ---\n' + serverOutput);
    failures.push('fatal: ' + err.message);
  } finally {
    server.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 200));
    await rm(dir, { recursive: true, force: true });
  }

  console.log('');
  if (failures.length === 0) {
    console.log('\x1b[32mTodos os checks passaram.\x1b[0m');
    process.exit(0);
  } else {
    console.log(`\x1b[31m${failures.length} checks falharam:\x1b[0m`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

main();
