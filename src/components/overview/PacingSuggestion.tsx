import { useMemo } from 'react';
import { TrendUp, TrendDown, Warning } from '@phosphor-icons/react';
import { useUIStore } from '../../store/useUIStore';
import { useProgressStore } from '../../store/useProgressStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import { getPaceDelta, daysLeftInMonth } from '../../lib/utils';

/**
 * Mostra uma sugestão adaptativa quando o pace do usuário diverge muito
 * do esperado — pra cima (adiantado) ou pra baixo (atrasado).
 *
 * Some quando o pace está dentro de ±8% (considerado "no ritmo").
 */
export default function PacingSuggestion() {
  const activeMonthId = useUIStore(s => s.activeMonthId);
  const checkedTopics = useProgressStore(s => s.checkedTopics);
  const getMonthProgress = useProgressStore(s => s.getMonthProgress);
  const roadmap = useRoadmap();

  const analysis = useMemo(() => {
    if (!activeMonthId) return null;
    const pace = getPaceDelta(activeMonthId, roadmap, checkedTopics);
    const progress = getMonthProgress(activeMonthId, roadmap);
    const daysLeft = daysLeftInMonth(activeMonthId);
    const remaining = progress.total - progress.done;
    const deltaPct = Math.round(pace.delta * 100);
    return { pace, progress, daysLeft, remaining, deltaPct };
  }, [activeMonthId, checkedTopics, getMonthProgress, roadmap]);

  if (!analysis) return null;

  const { deltaPct, remaining, daysLeft } = analysis;

  // Só mostrar se pace significativamente fora do ritmo (|delta| >= 8%)
  if (Math.abs(deltaPct) < 8) return null;

  const isBehind = deltaPct < -8;
  const isAhead = deltaPct > 8;

  // Behind: sugere ritmo diário elevado
  // Ahead: sugere folga / começar próximo mês
  const title = isBehind
    ? 'Você está atrás do ritmo'
    : 'Você está adiantado';

  const message = isBehind
    ? remaining > 0 && daysLeft > 0
      ? `Pra terminar o mês no prazo, você precisa de ${Math.ceil(remaining / daysLeft)} tópicos por dia — ${Math.abs(deltaPct)}% abaixo do esperado.`
      : `${Math.abs(deltaPct)}% abaixo do esperado.`
    : `${deltaPct}% acima do esperado. Ótimo momento pra reforçar revisões ou avançar conteúdo do próximo mês.`;

  const accentColor = isBehind ? 'var(--accent-coral)' : 'var(--accent-green)';
  const accentBg = isBehind ? 'var(--focus-main-bg)' : 'var(--focus-cont-bg)';
  const Icon = isBehind ? Warning : isAhead ? TrendUp : TrendDown;

  return (
    <section>
      <div
        style={{
          display: 'flex',
          gap: 14,
          padding: '16px 18px',
          border: `1px solid ${accentColor}`,
          backgroundColor: accentBg,
          alignItems: 'flex-start',
        }}
      >
        <Icon
          size={20}
          weight="regular"
          style={{ color: accentColor, flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: 4,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-50)',
              lineHeight: 1.55,
            }}
          >
            {message}
          </div>
        </div>
      </div>
    </section>
  );
}
