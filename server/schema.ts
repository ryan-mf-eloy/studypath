/** DDL for SQLite — kept as a template literal so it bundles cleanly. */
export const SCHEMA_SQL = `
-- Progresso
CREATE TABLE IF NOT EXISTS checked_topics (
  topic_id   TEXT PRIMARY KEY,
  checked_at TEXT NOT NULL
);

-- Sessões de estudo
CREATE TABLE IF NOT EXISTS study_sessions (
  id          TEXT PRIMARY KEY,
  topic_id    TEXT,
  focus_id    TEXT,
  started_at  TEXT NOT NULL,
  ended_at    TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  planned_ms  INTEGER,
  completed   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_topic   ON study_sessions(topic_id);
CREATE INDEX IF NOT EXISTS idx_sessions_focus   ON study_sessions(focus_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON study_sessions(started_at);

-- Revisão espaçada (SRS)
CREATE TABLE IF NOT EXISTS reviews (
  topic_id       TEXT PRIMARY KEY,
  stage          INTEGER NOT NULL,
  next_review_at TEXT NOT NULL,
  last_result    TEXT,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_due ON reviews(next_review_at);

CREATE TABLE IF NOT EXISTS review_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id    TEXT NOT NULL,
  result      TEXT NOT NULL,
  reviewed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_review_history_topic ON review_history(topic_id);

-- Notas
CREATE TABLE IF NOT EXISTS notes (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  body_version INTEGER NOT NULL DEFAULT 2,
  icon         TEXT,
  topic_id     TEXT,
  focus_id     TEXT,
  subject_tag  TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_topic   ON notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at);

-- Subtópicos
CREATE TABLE IF NOT EXISTS subtopics (
  id       TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  label    TEXT NOT NULL,
  position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subtopics_topic ON subtopics(topic_id);

-- Marcos concluídos
CREATE TABLE IF NOT EXISTS milestones_done (
  milestone_id TEXT PRIMARY KEY,
  done_at      TEXT NOT NULL
);

-- Reflexões semanais
CREATE TABLE IF NOT EXISTS reflections (
  id           TEXT PRIMARY KEY,
  week_key     TEXT UNIQUE NOT NULL,
  hardest      TEXT,
  to_review    TEXT,
  pace         TEXT,
  note_to_self TEXT,
  created_at   TEXT NOT NULL
);

-- Meta do schema
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ── Roadmap (antes hardcoded em src/data/roadmap.ts) ─────────────────
CREATE TABLE IF NOT EXISTS roadmap_phases (
  id       TEXT PRIMARY KEY,
  label    TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS roadmap_months (
  id       TEXT PRIMARY KEY,
  phase_id TEXT NOT NULL REFERENCES roadmap_phases(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_roadmap_months_phase ON roadmap_months(phase_id);

CREATE TABLE IF NOT EXISTS roadmap_focuses (
  id           TEXT PRIMARY KEY,
  month_id     TEXT NOT NULL REFERENCES roadmap_months(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  name         TEXT NOT NULL,
  mastery_note TEXT NOT NULL DEFAULT '',
  icon         TEXT,
  color        TEXT,
  position     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_roadmap_focuses_month ON roadmap_focuses(month_id);

CREATE TABLE IF NOT EXISTS roadmap_topics (
  id       TEXT PRIMARY KEY,
  focus_id TEXT NOT NULL REFERENCES roadmap_focuses(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_roadmap_topics_focus ON roadmap_topics(focus_id);

CREATE TABLE IF NOT EXISTS roadmap_milestones (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  date        TEXT NOT NULL,
  status      TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  color       TEXT,
  position    INTEGER NOT NULL
);

-- Metadata do roadmap (startDate, endDate, etc.)
CREATE TABLE IF NOT EXISTS roadmap_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ── Rotina de estudos ────────────────────────────────────────────────
-- Template semanal: blocos recorrentes por dia-da-semana.
CREATE TABLE IF NOT EXISTS routine_slots (
  id             TEXT PRIMARY KEY,
  day_of_week    INTEGER NOT NULL,
  start_time     TEXT NOT NULL,
  duration_min   INTEGER NOT NULL,
  label          TEXT,
  focus_id       TEXT,
  topic_id       TEXT,
  subtopic_id    TEXT,
  color          TEXT,
  meeting_url    TEXT,
  active         INTEGER NOT NULL DEFAULT 1,
  position       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_routine_slots_day ON routine_slots(day_of_week);

-- Exceções por data: pular ou remarcar um slot num dia específico.
CREATE TABLE IF NOT EXISTS routine_overrides (
  id              TEXT PRIMARY KEY,
  slot_id         TEXT NOT NULL REFERENCES routine_slots(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,
  kind            TEXT NOT NULL,
  new_date        TEXT,
  new_start_time  TEXT,
  created_at      TEXT NOT NULL,
  UNIQUE(slot_id, date)
);
CREATE INDEX IF NOT EXISTS idx_routine_overrides_slot ON routine_overrides(slot_id);
CREATE INDEX IF NOT EXISTS idx_routine_overrides_date ON routine_overrides(date);
`;
