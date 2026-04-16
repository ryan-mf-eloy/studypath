import type { Icon } from '@phosphor-icons/react';
import {
  Lightning,
  Compass,
  Function,
  FileTs,
  Database,
  ShieldCheck,
  TreeStructure,
  PuzzlePiece,
  TrendUp,
  Cube,
  Cloud,
  Wrench,
  Brain,
  Microphone,
  CloudCheck,
  Graph,
  CloudArrowUp,
  FilePy,
  Briefcase,
  Rocket,
  Palette,
  FlagCheckered,
  BookOpenText,
} from '@phosphor-icons/react';
import { resolveIcon, ICONS } from './iconRegistry';

export interface SubjectMeta {
  Icon: Icon;
  label: string;
  color: string;
}

const DEFAULT: SubjectMeta = {
  Icon: BookOpenText,
  label: 'Geral',
  color: '#8B8478',
};

const MATCHERS: Array<{ test: RegExp; meta: SubjectMeta }> = [
  { test: /\bnode/i,                                  meta: { Icon: Lightning,     label: 'Node.js',        color: '#6B9E3F' } },
  { test: /\btypescript\b/i,                          meta: { Icon: FileTs,        label: 'TypeScript',     color: '#2B6CB0' } },
  { test: /\bpython\b/i,                              meta: { Icon: FilePy,        label: 'Python',         color: '#3F6FB3' } },
  { test: /algoritmo/i,                               meta: { Icon: Function,      label: 'Algoritmos',     color: '#7C5CBF' } },
  { test: /bancos? de dados|banco\b/i,                meta: { Icon: Database,      label: 'Bancos',         color: '#A86A2B' } },
  { test: /owasp|segurança|graphql/i,                 meta: { Icon: ShieldCheck,   label: 'Segurança',      color: '#B0442F' } },
  { test: /filas?|mensageria/i,                       meta: { Icon: TreeStructure, label: 'Filas',          color: '#8B5E34' } },
  { test: /padr(ão|ões) arquitetural|design patt/i,   meta: { Icon: PuzzlePiece,   label: 'Patterns',       color: '#9A5BA0' } },
  { test: /escalabilidade|confiabilidade/i,           meta: { Icon: TrendUp,       label: 'Escala',         color: '#D97706' } },
  { test: /docker|kubernetes|k8s|ci\/?cd/i,           meta: { Icon: Cube,          label: 'Docker/K8s',     color: '#2B6CB0' } },
  { test: /\baws\b/i,                                 meta: { Icon: Cloud,         label: 'AWS',            color: '#D97706' } },
  { test: /\bgcp\b|google cloud/i,                    meta: { Icon: CloudCheck,    label: 'GCP',            color: '#3B82F6' } },
  { test: /\bazure\b/i,                               meta: { Icon: CloudArrowUp,  label: 'Azure',          color: '#0284C7' } },
  { test: /terraform|iac|observabilidade/i,           meta: { Icon: Wrench,        label: 'IaC',            color: '#6B7280' } },
  { test: /\bia\b|\brag\b|inteligência artific/i,     meta: { Icon: Brain,         label: 'IA',             color: '#8B5CF6' } },
  { test: /mock interview/i,                          meta: { Icon: Microphone,    label: 'Mocks',          color: '#3D9E6B' } },
  { test: /system design/i,                           meta: { Icon: Graph,         label: 'System Design',  color: '#2B6CB0' } },
  { test: /sequoia|saas/i,                            meta: { Icon: Rocket,        label: 'Sequoia',        color: '#E84F3C' } },
  { test: /design system/i,                           meta: { Icon: Palette,       label: 'Design Sys',     color: '#C2410C' } },
  { test: /aplica(ções|cões)|portfólio|open source/i, meta: { Icon: Briefcase,     label: 'Aplicações',     color: '#3D9E6B' } },
  { test: /fundamentos de arquitetura/i,              meta: { Icon: Compass,       label: 'Arquitetura',    color: '#475569' } },
  { test: /fechamento/i,                              meta: { Icon: FlagCheckered, label: 'Fechamento',     color: '#3D9E6B' } },
];

export function getSubjectMeta(focusName: string): SubjectMeta {
  for (const { test, meta } of MATCHERS) {
    if (test.test(focusName)) return meta;
  }
  return DEFAULT;
}

/**
 * Resolve a metadata visual de um foco aplicando overrides per-instance
 * (icon/color definidos no próprio foco) sobre o matcher default por nome.
 */
export function resolveFocusMeta(focus: {
  name: string;
  icon?: string;
  color?: string;
}): SubjectMeta {
  const base = getSubjectMeta(focus.name);
  const IconOverride = focus.icon
    ? resolveIcon(focus.icon, ICONS.BookOpenText)
    : null;
  return {
    Icon: IconOverride ?? base.Icon,
    label: base.label,
    color: focus.color ?? base.color,
  };
}
