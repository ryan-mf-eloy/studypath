/**
 * Spaced Repetition System (SRS) — Leitner-style helpers.
 *
 * Intervalos crescentes: tópico marcado volta pra revisão em 3d, depois 7d,
 * depois 21d, depois 60d, depois 180d. Usuário diz "lembro bem / parcial /
 * esqueci" → stage avança, mantém ou reseta.
 */

export const LEITNER_INTERVALS_DAYS = [3, 7, 21, 60, 180] as const;
export const MAX_STAGE = LEITNER_INTERVALS_DAYS.length - 1;

export type ReviewResult = 'good' | 'partial' | 'forgot';

/** Retorna o intervalo em dias para o estágio dado. */
export function intervalForStage(stage: number): number {
  const clamped = Math.min(Math.max(stage, 0), MAX_STAGE);
  return LEITNER_INTERVALS_DAYS[clamped];
}

/** Calcula o próximo nextReviewAt (ISO) a partir do stage corrente. */
export function scheduleNextReview(stage: number, now: Date = new Date()): string {
  const days = intervalForStage(stage);
  const next = new Date(now);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

/** Transição de stage baseada no resultado do review. */
export function nextStageForResult(stage: number, result: ReviewResult): number {
  if (result === 'good') return Math.min(stage + 1, MAX_STAGE);
  if (result === 'forgot') return 0;
  // 'partial' mantém o stage (mesmo intervalo de novo)
  return stage;
}

/** Label human-friendly para o stage (usado em UI de debug / tooltip). */
export function stageLabel(stage: number): string {
  const labels = ['Novo', 'Iniciante', 'Consolidando', 'Consolidado', 'Firme'];
  return labels[Math.min(Math.max(stage, 0), MAX_STAGE)] ?? 'Novo';
}
