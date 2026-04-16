import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA_SQL } from './schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveDbPath(): string {
  return process.env.STUDYPATH_DB_PATH
    ? resolve(process.env.STUDYPATH_DB_PATH)
    : resolve(__dirname, '..', 'data', 'studypath.db');
}

let _db: Database.Database | null = null;
let _dbPath = '';

/** Lazily opens the database (honors STUDYPATH_DB_PATH set before first call). */
function openDb(): Database.Database {
  if (_db) return _db;
  _dbPath = resolveDbPath();
  mkdirSync(dirname(_dbPath), { recursive: true });
  _db = new Database(_dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  return _db;
}

/** Proxy so existing `import { db }` call sites work without changes. */
export const db = new Proxy({} as Database.Database, {
  get(_target, prop, receiver) {
    const target = openDb();
    const value = Reflect.get(target, prop, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as Database.Database;

export function getDbPath(): string {
  if (!_dbPath) openDb();
  return _dbPath;
}

// Backwards-compat export for call sites that want a constant-ish value.
// This is a getter-style: logs the path after openDb() has run at least once.
export const dbPath = {
  toString() { return getDbPath(); },
  valueOf() { return getDbPath(); },
} as unknown as string;

/** Idempotent column add — adds missing columns to existing tables. */
function ensureColumns(target: Database.Database): void {
  const hasCol = (table: string, col: string): boolean => {
    const rows = target.prepare(`PRAGMA table_info(${table})`).all() as Array<{
      name: string;
    }>;
    return rows.some((r) => r.name === col);
  };

  if (!hasCol('roadmap_focuses', 'icon')) {
    target.exec('ALTER TABLE roadmap_focuses ADD COLUMN icon TEXT');
  }
  if (!hasCol('roadmap_focuses', 'color')) {
    target.exec('ALTER TABLE roadmap_focuses ADD COLUMN color TEXT');
  }
  if (!hasCol('roadmap_milestones', 'icon')) {
    target.exec('ALTER TABLE roadmap_milestones ADD COLUMN icon TEXT');
  }
  if (!hasCol('roadmap_milestones', 'color')) {
    target.exec('ALTER TABLE roadmap_milestones ADD COLUMN color TEXT');
  }
  if (!hasCol('routine_slots', 'meeting_url')) {
    target.exec('ALTER TABLE routine_slots ADD COLUMN meeting_url TEXT');
  }
}

/** Run the DDL idempotently. Called explicitly by startServer(). */
export function runSchema(): void {
  const target = openDb();
  target.exec(SCHEMA_SQL);
  ensureColumns(target);

  const current = target
    .prepare('SELECT value FROM meta WHERE key = ?')
    .get('schema_version') as { value: string } | undefined;
  if (!current) {
    target
      .prepare('INSERT INTO meta (key, value) VALUES (?, ?)')
      .run('schema_version', '1');
  }
}
