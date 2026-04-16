import type { FocusType, MilestoneType, Note, RoadmapData } from '../types';
import { focusLabel, getActiveMonth } from './utils';
import { extractPlainText } from './noteBodyMigration';
import i18n from '../i18n';

/* ─── Tipos de resultado ────────────────────────────────────────────── */

export type SearchResult =
  | {
      kind: 'topic';
      id: string;
      label: string;
      monthLabel: string;
      focusType: string;
      topicId: string;
      monthId: string;
    }
  | {
      kind: 'note';
      id: string;
      title: string;
      preview: string;
      topicId: string;
      icon?: string;
    }
  | {
      kind: 'focus';
      id: string;
      name: string;
      monthLabel: string;
      monthId: string;
      type: FocusType;
    }
  | {
      kind: 'milestone';
      id: string;
      name: string;
      description?: string;
      date: string;
      type: MilestoneType;
    }
  | {
      kind: 'month';
      id: string;
      label: string;
      phaseLabel: string;
    };

export interface ResultGroup {
  kind: SearchResult['kind'];
  label: string;
  items: SearchResult[];
  totalCount: number;
}

/* ─── Índice ──────────────────────────────────────────────────────── */

interface TopicIndexEntry {
  topicId: string;
  label: string;
  lower: string;
  monthId: string;
  monthLabel: string;
  focusType: string;
}
interface FocusIndexEntry {
  id: string;
  name: string;
  lower: string;
  monthId: string;
  monthLabel: string;
  type: FocusType;
}
interface MonthIndexEntry {
  id: string;
  label: string;
  lower: string;
  phaseLabel: string;
}
interface MilestoneIndexEntry {
  id: string;
  name: string;
  description?: string;
  lower: string;
  date: string;
  type: MilestoneType;
}

export interface SearchIndex {
  topics: TopicIndexEntry[];
  focuses: FocusIndexEntry[];
  months: MonthIndexEntry[];
  milestones: MilestoneIndexEntry[];
}

export function buildSearchIndex(roadmap: RoadmapData): SearchIndex {
  const topics: TopicIndexEntry[] = [];
  const focuses: FocusIndexEntry[] = [];
  const months: MonthIndexEntry[] = [];
  const milestones: MilestoneIndexEntry[] = [];

  for (const phase of roadmap.phases) {
    for (const month of phase.months) {
      months.push({
        id: month.id,
        label: month.label,
        lower: month.label.toLowerCase(),
        phaseLabel: phase.label,
      });
      for (const focus of month.focuses) {
        focuses.push({
          id: focus.id,
          name: focus.name,
          lower: focus.name.toLowerCase(),
          monthId: month.id,
          monthLabel: month.label,
          type: focus.type,
        });
        for (const topic of focus.topics) {
          topics.push({
            topicId: topic.id,
            label: topic.label,
            lower: topic.label.toLowerCase(),
            monthId: month.id,
            monthLabel: month.label,
            focusType: focusLabel(focus.type),
          });
        }
      }
    }
  }

  for (const m of roadmap.milestones) {
    milestones.push({
      id: m.id,
      name: m.name,
      description: m.description,
      lower: `${m.name} ${m.description ?? ''}`.toLowerCase(),
      date: m.date,
      type: m.type,
    });
  }

  return { topics, focuses, months, milestones };
}

/* ─── Scoring ─────────────────────────────────────────────────────── */

/** Score menor = melhor. Infinity = sem match. */
function score(lower: string, q: string): number {
  const idx = lower.indexOf(q);
  if (idx === -1) return Infinity;
  if (idx === 0) return 0;
  if (lower[idx - 1] === ' ') return 5;
  return 10 + idx;
}

/* ─── Filter + agrupamento ────────────────────────────────────────── */

const GROUP_LIMIT = 5;

export interface FilterResultsReturn {
  groups: ResultGroup[];
  flatItems: SearchResult[];
}

export function filterResults(
  index: SearchIndex,
  query: string,
  searchNotes: (q: string) => Note[],
): FilterResultsReturn {
  const q = query.toLowerCase().trim();
  if (!q) return { groups: [], flatItems: [] };

  /* Tópicos */
  const topicsScored = index.topics
    .map(t => ({ t, s: score(t.lower, q) }))
    .filter(x => x.s !== Infinity)
    .sort((a, b) => a.s - b.s);
  const topicsTotal = topicsScored.length;
  const topicItems: SearchResult[] = topicsScored
    .slice(0, GROUP_LIMIT)
    .map(({ t }) => ({
      kind: 'topic',
      id: t.topicId,
      label: t.label,
      monthLabel: t.monthLabel,
      focusType: t.focusType,
      topicId: t.topicId,
      monthId: t.monthId,
    }));

  /* Notas — usa searchNotes do store e re-scora pelo título */
  const rawNotes = searchNotes(q);
  const noteCandidates = rawNotes
    .filter(n => !!n.topicId)
    .map(n => {
      const titleLower = n.title.toLowerCase();
      const titleScore = score(titleLower, q);
      // body substring vale como fallback (score 20)
      const s = titleScore === Infinity ? 20 : titleScore;
      return { n, s };
    })
    .sort((a, b) => a.s - b.s);
  const notesTotal = noteCandidates.length;
  const noteItems: SearchResult[] = noteCandidates
    .slice(0, GROUP_LIMIT)
    .map(({ n }) => ({
      kind: 'note',
      id: n.id,
      title: n.title || 'Sem título',
      preview: extractPlainText(n.body, n.bodyVersion).substring(0, 80),
      topicId: n.topicId as string,
      icon: n.icon,
    }));

  /* Matérias (focuses) */
  const focusesScored = index.focuses
    .map(f => ({ f, s: score(f.lower, q) }))
    .filter(x => x.s !== Infinity)
    .sort((a, b) => a.s - b.s);
  const focusesTotal = focusesScored.length;
  const focusItems: SearchResult[] = focusesScored
    .slice(0, GROUP_LIMIT)
    .map(({ f }) => ({
      kind: 'focus',
      id: f.id,
      name: f.name,
      monthLabel: f.monthLabel,
      monthId: f.monthId,
      type: f.type,
    }));

  /* Marcos (milestones) */
  const milestonesScored = index.milestones
    .map(m => ({ m, s: score(m.lower, q) }))
    .filter(x => x.s !== Infinity)
    .sort((a, b) => a.s - b.s);
  const milestonesTotal = milestonesScored.length;
  const milestoneItems: SearchResult[] = milestonesScored
    .slice(0, GROUP_LIMIT)
    .map(({ m }) => ({
      kind: 'milestone',
      id: m.id,
      name: m.name,
      description: m.description,
      date: m.date,
      type: m.type,
    }));

  /* Meses */
  const monthsScored = index.months
    .map(mo => ({ mo, s: score(mo.lower, q) }))
    .filter(x => x.s !== Infinity)
    .sort((a, b) => a.s - b.s);
  const monthsTotal = monthsScored.length;
  const monthItems: SearchResult[] = monthsScored
    .slice(0, GROUP_LIMIT)
    .map(({ mo }) => ({
      kind: 'month',
      id: mo.id,
      label: mo.label,
      phaseLabel: mo.phaseLabel,
    }));

  /* Montagem final */
  const groups: ResultGroup[] = [];
  if (topicItems.length)
    groups.push({ kind: 'topic', label: i18n.t('search.groups.topics'), items: topicItems, totalCount: topicsTotal });
  if (noteItems.length)
    groups.push({ kind: 'note', label: i18n.t('search.groups.notes'), items: noteItems, totalCount: notesTotal });
  if (focusItems.length)
    groups.push({ kind: 'focus', label: i18n.t('search.groups.focuses'), items: focusItems, totalCount: focusesTotal });
  if (milestoneItems.length)
    groups.push({
      kind: 'milestone',
      label: i18n.t('search.groups.milestones'),
      items: milestoneItems,
      totalCount: milestonesTotal,
    });
  if (monthItems.length)
    groups.push({ kind: 'month', label: i18n.t('search.groups.months'), items: monthItems, totalCount: monthsTotal });

  const flatItems: SearchResult[] = groups.flatMap(g => g.items);

  return { groups, flatItems };
}

/* ─── Sugestões iniciais (query vazia) ────────────────────────────── */

/**
 * Gera sugestões relevantes pra mostrar ao abrir a busca sem query.
 * Prioriza: próximos tópicos pendentes do mês atual, matérias do mês atual,
 * e próximos marcos pendentes.
 */
export function buildSuggestions(
  roadmap: RoadmapData,
  checkedTopics: readonly string[],
): FilterResultsReturn {
  const groups: ResultGroup[] = [];
  const checked = new Set(checkedTopics);

  // 1. Próximos tópicos pendentes do mês atual (até 5).
  const month = getActiveMonth(roadmap);
  if (month) {
    const pendingTopics: SearchResult[] = [];
    outer: for (const focus of month.focuses) {
      for (const topic of focus.topics) {
        if (checked.has(topic.id)) continue;
        pendingTopics.push({
          kind: 'topic',
          id: topic.id,
          label: topic.label,
          monthLabel: month.label,
          focusType: focusLabel(focus.type),
          topicId: topic.id,
          monthId: month.id,
        });
        if (pendingTopics.length >= 5) break outer;
      }
    }
    if (pendingTopics.length > 0) {
      groups.push({
        kind: 'topic',
        label: i18n.t('search.groups.suggestedNext'),
        items: pendingTopics,
        totalCount: pendingTopics.length,
      });
    }

    // 2. Matérias do período atual.
    const focusItems: SearchResult[] = month.focuses.map((focus) => ({
      kind: 'focus',
      id: focus.id,
      name: focus.name,
      monthLabel: month.label,
      monthId: month.id,
      type: focus.type,
    }));
    if (focusItems.length > 0) {
      groups.push({
        kind: 'focus',
        label: i18n.t('search.groups.suggestedFocuses'),
        items: focusItems,
        totalCount: focusItems.length,
      });
    }
  }

  // 3. Próximos marcos pendentes (ordenados por data).
  const today = new Date().toISOString().slice(0, 10);
  const upcomingMilestones = roadmap.milestones
    .filter((m) => m.status !== 'done' && m.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  if (upcomingMilestones.length > 0) {
    groups.push({
      kind: 'milestone',
      label: i18n.t('search.groups.suggestedMilestones'),
      items: upcomingMilestones.map((m) => ({
        kind: 'milestone',
        id: m.id,
        name: m.name,
        description: m.description,
        date: m.date,
        type: m.type,
      })),
      totalCount: upcomingMilestones.length,
    });
  }

  const flatItems: SearchResult[] = groups.flatMap((g) => g.items);
  return { groups, flatItems };
}
