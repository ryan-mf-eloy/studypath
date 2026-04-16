/**
 * Backup / restore / reset — agora em cima do backend SQLite.
 *
 * O export baixa um dump do `/api/state`. O import POSTa um payload pro
 * `/api/migrate/from-local` após resetar o banco. Mantemos `collectLocalPayload`
 * pra migração automática do localStorage legado no primeiro boot.
 */

import { getState, migrateFromLocal, resetAll } from './api';

const PERSIST_KEYS = [
  'studypath-progress',
  'studypath-sessions',
  'studypath-reviews',
  'studypath-notes',
  'studypath-subtopics',
  'studypath-milestones',
  'studypath-journal',
  'studypath-note-prefs',
  'studypath-theme',
] as const;

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  stores: Record<string, unknown>;
}

function sanitizeFilename(date: string): string {
  return date.replace(/[^\d-]/g, '');
}

/* ─── Legacy localStorage helpers (só pra auto-migração no primeiro boot) ──── */

export function collectLocalPayload(): BackupPayload {
  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    stores: {},
  };
  for (const key of PERSIST_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        payload.stores[key] = JSON.parse(raw);
      } catch {
        payload.stores[key] = raw;
      }
    }
  }
  return payload;
}

export function hasLocalData(): boolean {
  return PERSIST_KEYS.some(k => localStorage.getItem(k) != null);
}

/* ─── Export / import / reset via backend ─────────────────────────────────── */

/** Baixa um snapshot do servidor como JSON. */
export async function exportBackup(): Promise<void> {
  const state = await getState();

  // Wrap server response in the same envelope as collectLocalPayload so the
  // import path (which expects `{version,stores}`) stays backwards-compatible.
  const payload = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    source: 'server' as const,
    state,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const date = sanitizeFilename(new Date().toISOString().slice(0, 10));
  const filename = `studypath-backup-${date}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Importa um backup JSON. Aceita os dois formatos:
 *   - Legacy (version 1 com `stores`) — envia pro /api/migrate/from-local
 *   - Novo (version 1 com `state`) — converte pra `stores` antes de enviar
 * Reseta o banco antes pra garantir idempotência.
 */
export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (data.version !== 1) {
    throw new Error('Formato de backup inválido — esperava version 1.');
  }

  // Reset server state so migration isn't skipped.
  await resetAll();

  if (data.stores && typeof data.stores === 'object') {
    // Legacy localStorage-shape payload — pass through.
    const result = await migrateFromLocal({ version: 1, stores: data.stores });
    if (!result.ok && !result.skipped) {
      throw new Error(result.message ?? 'Falha ao importar backup.');
    }
  } else if (data.state && typeof data.state === 'object') {
    // Server-shape payload — wrap each section in the legacy localStorage shape.
    const s = data.state as {
      progress?: { checkedTopics?: string[]; checkedAt?: Record<string, string> };
      sessions?: unknown[];
      reviews?: Record<string, unknown>;
      notes?: unknown[];
      subtopics?: Record<string, unknown[]>;
      milestones?: { doneIds?: string[] };
      reflections?: unknown[];
    };
    const stores: Record<string, unknown> = {
      'studypath-progress': { state: s.progress ?? {} },
      'studypath-sessions': { state: { sessions: s.sessions ?? [] } },
      'studypath-reviews': { state: { reviews: s.reviews ?? {} } },
      'studypath-notes': { state: { notes: s.notes ?? [] } },
      'studypath-subtopics': { state: { subtopics: s.subtopics ?? {} } },
      'studypath-milestones': { state: { doneIds: s.milestones?.doneIds ?? [] } },
      'studypath-journal': { state: { reflections: s.reflections ?? [] } },
    };
    const result = await migrateFromLocal({ version: 1, stores });
    if (!result.ok && !result.skipped) {
      throw new Error(result.message ?? 'Falha ao importar backup.');
    }
  } else {
    throw new Error('Backup vazio ou formato desconhecido.');
  }

  window.location.reload();
}

/** Apaga todos os dados do servidor. Força reload. */
export async function clearAllData(): Promise<void> {
  await resetAll();
  // Also drop legacy localStorage persistences to avoid re-migration loops.
  for (const key of PERSIST_KEYS) {
    localStorage.removeItem(key);
  }
  window.location.reload();
}
