/* ─── STUDYPATH — Tipos centrais ────────────────────────────────────────────
   Todos os tipos do app definidos aqui. Nunca duplicar em outros arquivos.
   ─────────────────────────────────────────────────────────────────────────── */

// ── Foco ─────────────────────────────────────────────────────────────────────
export type FocusType = 'main' | 'secondary' | 'continuous';

// ── Roadmap ───────────────────────────────────────────────────────────────────
export interface Topic {
  id: string;       // ex: "2026-04-main-eventloop"
  label: string;
  focusId: string;
}

export interface Focus {
  id: string;       // ex: "2026-04-main"
  type: FocusType;
  name: string;
  topics: Topic[];
  masteryNote: string;
  monthId: string;
}

export interface Month {
  id: string;       // formato "YYYY-MM" — ex: "2026-04"
  label: string;    // ex: "Abril 2026"
  phaseId: string;
  focuses: Focus[]; // sempre [main, secondary, continuous]
}

export interface Phase {
  id: string;       // ex: "phase-1"
  label: string;    // ex: "Fase 1 — Fundação"
  months: Month[];
}

export interface RoadmapData {
  phases: Phase[];
  startDate: string;     // "2026-04-01"
  endDate: string;       // "2027-06-30"
  milestones: Milestone[];
}

// ── Milestones ────────────────────────────────────────────────────────────────
export type MilestoneType   = 'certification' | 'career' | 'personal' | 'product';
export type MilestoneStatus = 'pending' | 'active' | 'done';

export interface Milestone {
  id: string;
  name: string;
  type: MilestoneType;
  date: string;          // ISO date "2026-10-31"
  status: MilestoneStatus;
  description?: string;
}

// ── Notas ─────────────────────────────────────────────────────────────────────
export interface Note {
  id: string;
  title: string;
  body: string;          // markdown
  topicId?: string;
  focusId?: string;      // derivado do topicId para queries rápidas
  subjectTag?: string;   // nome da matéria para exibição (ex: "Node.js")
  createdAt: string;     // ISO datetime
  updatedAt: string;     // ISO datetime
}

// ── Progresso (estado derivado) ───────────────────────────────────────────────
export interface FocusProgress {
  focusId: string;
  done: number;
  total: number;
  pct: number;           // 0–100
}

export interface MonthProgress {
  monthId: string;
  done: number;
  total: number;
  pct: number;
}

export interface PhaseProgress {
  phaseId: string;
  done: number;
  total: number;
  pct: number;
}
