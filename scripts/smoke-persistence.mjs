// StudyPath — end-to-end persistence smoke test.
//
// Boots a fresh Hono server against a throwaway SQLite file, writes every
// entity type the app supports, restarts the server to simulate an app
// relaunch, then reads everything back via /api/state to prove the data was
// actually persisted to disk (not just kept in memory).
//
// This is the authoritative check that the desktop app persists user data.
// Run: node scripts/smoke-persistence.mjs

import { spawn } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 4512;
const BASE = `http://127.0.0.1:${PORT}/api`;

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const err = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const section = (t) => console.log(`\n\x1b[36m── ${t} ──\x1b[0m`);

const failures = [];
function assert(cond, name) {
  if (cond) ok(name);
  else {
    err(name);
    failures.push(name);
  }
}

async function waitForServer(retries = 40) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not start');
}

async function j(path, init) {
  const r = await fetch(`${BASE}${path}`, init);
  const body = await r.text();
  if (!r.ok) throw new Error(`${path} → ${r.status} ${body}`);
  return body ? JSON.parse(body) : {};
}

const jsonPost = (path, body) =>
  j(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const jsonPatch = (path, body) =>
  j(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const jsonDelete = (path) => j(path, { method: 'DELETE' });

function startServer(dbPath) {
  const proc = spawn('npx', ['tsx', 'server/index.ts'], {
    env: { ...process.env, STUDYPATH_PORT: String(PORT), STUDYPATH_DB_PATH: dbPath, STUDYPATH_SEED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', () => {});
  proc.stderr.on('data', (d) => process.stderr.write(d));
  return proc;
}

async function stopServer(proc) {
  proc.kill();
  await new Promise((r) => proc.once('exit', r));
}

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'studypath-persist-'));
  const dbPath = join(dir, 'persist.db');

  section('Boot #1 — write everything');
  let server = startServer(dbPath);
  await waitForServer();
  ok('server up');

  // Grab the first real focus/topic from the seeded roadmap so linked entities
  // reference things that actually exist.
  const { roadmap } = await j('/state');
  const firstFocus = roadmap.phases[0].months[0].focuses[0];
  const firstTopic = firstFocus.topics[0];
  assert(!!firstFocus && !!firstTopic, 'seeded roadmap has focus + topic');

  // ── Progress
  await jsonPost('/progress/toggle', { topicId: firstTopic.id });
  ok('progress: toggleTopic');

  // ── Sessions
  await jsonPost('/sessions', {
    id: 'smoke-session-1',
    topicId: firstTopic.id,
    focusId: firstFocus.id,
    startedAt: '2026-04-15T10:00:00.000Z',
    endedAt: '2026-04-15T10:45:00.000Z',
    durationMs: 45 * 60_000,
    plannedMs: 45 * 60_000,
    completed: true,
  });
  ok('sessions: postSession');

  // ── Reviews
  await jsonPost('/reviews/schedule', {
    topicId: firstTopic.id,
    stage: 1,
    nextReviewAt: '2026-04-20T10:00:00.000Z',
    createdAt: '2026-04-15T10:00:00.000Z',
  });
  ok('reviews: scheduleReview');

  // ── Notes
  await jsonPost('/notes', {
    id: 'smoke-note-1',
    title: 'Smoke note',
    body: JSON.stringify([{ type: 'paragraph', content: 'persist me' }]),
    bodyVersion: 2,
    icon: '📝',
    topicId: firstTopic.id,
    focusId: firstFocus.id,
    subjectTag: firstFocus.name,
    createdAt: '2026-04-15T10:00:00.000Z',
    updatedAt: '2026-04-15T10:00:00.000Z',
  });
  ok('notes: postNote');

  // ── Subtopics
  await jsonPost('/subtopics', {
    id: 'smoke-sub-1',
    topicId: firstTopic.id,
    label: 'Smoke subtopic',
  });
  ok('subtopics: postSubtopic');

  // ── Milestones (done)
  const firstMilestone = roadmap.milestones[0];
  await jsonPost('/milestones', { milestoneId: firstMilestone.id });
  ok('milestones: postMilestone');

  // ── Reflections
  await jsonPost('/reflections', {
    id: 'smoke-refl-1',
    weekKey: '2026-W16',
    hardest: 'Event loop',
    toReview: ['closures'],
    pace: 'good',
    noteToSelf: 'Keep going',
    createdAt: '2026-04-15T10:00:00.000Z',
  });
  ok('reflections: postReflection');

  // ── Roadmap CRUD (granular)
  await jsonPost('/roadmap/focuses', {
    id: 'smoke-focus-1',
    monthId: roadmap.phases[0].months[0].id,
    type: 'main',
    name: 'Smoke topic',
    masteryNote: 'persisted',
    icon: 'Brain',
    color: '#FF00AA',
    position: 99,
  });
  ok('roadmap: createFocus');

  // ── Routines: create + patch every field + create override
  const slotCreate = await jsonPost('/routines/slots', {
    id: 'smoke-slot-1',
    dayOfWeek: 2,
    startTime: '08:00',
    durationMin: 60,
    label: null,
    focusId: firstFocus.id,
    topicId: null,
    subtopicId: null,
    color: null,
    active: true,
    position: 0,
  });
  assert(slotCreate.slot.id === 'smoke-slot-1', 'routines: create returns slot');

  const patched = await jsonPatch('/routines/slots/smoke-slot-1', {
    label: 'Deep work',
    color: '#3DA8FF',
    durationMin: 90,
    startTime: '09:00',
    dayOfWeek: 3,
    topicId: firstTopic.id,
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    active: false,
  });
  assert(patched.slot.label === 'Deep work', 'routines: patched label');
  assert(patched.slot.color === '#3DA8FF', 'routines: patched color');
  assert(patched.slot.durationMin === 90, 'routines: patched durationMin');
  assert(patched.slot.startTime === '09:00', 'routines: patched startTime');
  assert(patched.slot.dayOfWeek === 3, 'routines: patched dayOfWeek');
  assert(patched.slot.topicId === firstTopic.id, 'routines: patched topicId');
  assert(
    patched.slot.meetingUrl === 'https://meet.google.com/abc-defg-hij',
    'routines: patched meetingUrl (Google Meet)',
  );
  assert(patched.slot.active === false, 'routines: patched active');

  // Reject bad meeting URLs
  const bad = await fetch(`${BASE}/routines/slots/smoke-slot-1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meetingUrl: 'not a url' }),
  });
  assert(bad.status === 400, 'routines: invalid meetingUrl rejected (400)');

  await jsonPost('/routines/overrides', {
    id: 'smoke-ovr-1',
    slotId: 'smoke-slot-1',
    date: '2026-04-22',
    kind: 'skip',
  });
  ok('routines: create override (skip)');

  await jsonPost('/routines/overrides', {
    id: 'smoke-ovr-2',
    slotId: 'smoke-slot-1',
    date: '2026-04-29',
    kind: 'reschedule',
    newDate: '2026-04-30',
    newStartTime: '19:00',
  });
  ok('routines: create override (reschedule)');

  // Sanity: verify the DB file exists and has non-trivial size.
  const dbStat = await stat(dbPath);
  assert(dbStat.size > 0, `sqlite file on disk (${dbStat.size} bytes)`);

  section('Restart server — simulates desktop app relaunch');
  await stopServer(server);
  ok('server down');
  server = startServer(dbPath);
  await waitForServer();
  ok('server back up on same db file');

  section('Boot #2 — read everything back via /api/state');
  const state = await j('/state');

  // Progress
  assert(
    state.progress.checkedTopics.includes(firstTopic.id),
    'progress: topic still checked after restart',
  );

  // Sessions
  assert(
    state.sessions.some((s) => s.id === 'smoke-session-1' && s.focusId === firstFocus.id),
    'sessions: persisted across restart',
  );

  // Reviews
  assert(
    state.reviews[firstTopic.id]?.stage === 1,
    'reviews: persisted across restart',
  );

  // Notes
  assert(
    state.notes.some((n) => n.id === 'smoke-note-1' && n.icon === '📝'),
    'notes: persisted with icon across restart',
  );

  // Subtopics
  assert(
    state.subtopics[firstTopic.id]?.some((s) => s.id === 'smoke-sub-1'),
    'subtopics: persisted across restart',
  );

  // Milestones
  assert(
    state.milestones.doneIds.includes(firstMilestone.id),
    'milestones: done-state persisted across restart',
  );

  // Reflections
  assert(
    state.reflections.some((r) => r.id === 'smoke-refl-1'),
    'reflections: persisted across restart',
  );

  // Roadmap CRUD
  const persistedFocus = state.roadmap.phases[0].months[0].focuses.find(
    (f) => f.id === 'smoke-focus-1',
  );
  assert(persistedFocus?.color === '#FF00AA', 'roadmap: focus color override persisted');
  assert(persistedFocus?.icon === 'Brain', 'roadmap: focus icon persisted');

  // Routines
  const persistedSlot = state.routines?.slots.find((s) => s.id === 'smoke-slot-1');
  assert(!!persistedSlot, 'routines: slot persisted across restart');
  assert(persistedSlot?.color === '#3DA8FF', 'routines: color persisted across restart');
  assert(persistedSlot?.label === 'Deep work', 'routines: label persisted across restart');
  assert(persistedSlot?.durationMin === 90, 'routines: duration persisted across restart');
  assert(persistedSlot?.startTime === '09:00', 'routines: startTime persisted across restart');
  assert(persistedSlot?.dayOfWeek === 3, 'routines: dayOfWeek persisted across restart');
  assert(persistedSlot?.topicId === firstTopic.id, 'routines: topicId persisted across restart');
  assert(persistedSlot?.active === false, 'routines: active flag persisted across restart');
  assert(
    persistedSlot?.meetingUrl === 'https://meet.google.com/abc-defg-hij',
    'routines: meetingUrl persisted across restart',
  );

  const skipOv = state.routines?.overrides.find((o) => o.id === 'smoke-ovr-1');
  assert(skipOv?.kind === 'skip', 'routines: skip override persisted');
  const resOv = state.routines?.overrides.find((o) => o.id === 'smoke-ovr-2');
  assert(
    resOv?.kind === 'reschedule' && resOv?.newDate === '2026-04-30' && resOv?.newStartTime === '19:00',
    'routines: reschedule override persisted with new date+time',
  );

  // Further mutation after restart — make sure writes still work on the
  // reopened database (not just reads).
  await jsonPatch('/routines/slots/smoke-slot-1', { color: '#E84F3C' });
  const verify = await j('/routines');
  const verifySlot = verify.slots.find((s) => s.id === 'smoke-slot-1');
  assert(verifySlot?.color === '#E84F3C', 'routines: can still PATCH after restart');

  // Cycle through all supported meeting providers to prove each URL shape persists.
  const providers = [
    'https://teams.microsoft.com/l/meetup-join/foo',
    'https://company.zoom.us/j/1234567890',
    'https://app.slack.com/client/T123/C456',
    'https://discord.com/channels/1/2',
  ];
  for (const url of providers) {
    await jsonPatch('/routines/slots/smoke-slot-1', { meetingUrl: url });
    const check = await j('/routines');
    const checkSlot = check.slots.find((s) => s.id === 'smoke-slot-1');
    assert(checkSlot?.meetingUrl === url, `routines: meetingUrl persists (${new URL(url).hostname})`);
  }

  // Clear meetingUrl with explicit null
  await jsonPatch('/routines/slots/smoke-slot-1', { meetingUrl: null });
  const cleared = await j('/routines');
  assert(
    cleared.slots.find((s) => s.id === 'smoke-slot-1')?.meetingUrl === undefined,
    'routines: meetingUrl cleared when patched with null',
  );

  // Undo an override
  await jsonDelete('/routines/overrides/smoke-ovr-1');
  const afterDelete = await j('/routines');
  assert(
    !afterDelete.overrides.some((o) => o.id === 'smoke-ovr-1'),
    'routines: override deleted after restart',
  );

  // Cascade delete: deleting a slot should remove its remaining overrides
  await jsonDelete('/routines/slots/smoke-slot-1');
  const afterCascade = await j('/routines');
  assert(afterCascade.slots.length === 0, 'routines: slot deleted');
  assert(
    afterCascade.overrides.length === 0,
    'routines: cascade deleted remaining overrides',
  );

  section('Tear down');
  await stopServer(server);
  await rm(dir, { recursive: true, force: true });
  ok('cleaned up');

  if (failures.length > 0) {
    console.log(`\n\x1b[31m${failures.length} check(s) failed:\x1b[0m`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  } else {
    console.log('\n\x1b[32mAll persistence checks passed.\x1b[0m');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
