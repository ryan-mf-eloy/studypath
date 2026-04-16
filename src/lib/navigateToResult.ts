import { useUIStore } from '../store/useUIStore';
import { getRoadmap } from '../store/useRoadmapStore';
import { inferPeriodRange } from './utils';
import type { SearchResult } from './commandPaletteSearch';

/**
 * Despacha a ação de navegação correta baseada no tipo de resultado do
 * CommandPalette. Sempre coloca o usuário na tela certa com o contexto certo
 * e fecha a busca ao final.
 */
export function navigateToResult(result: SearchResult) {
  const ui = useUIStore.getState();

  switch (result.kind) {
    case 'topic': {
      // Achar o focus que contém o tópico pra setar activeFocusType correto.
      const roadmap = getRoadmap();
      for (const phase of roadmap.phases) {
        for (const month of phase.months) {
          for (const focus of month.focuses) {
            if (focus.topics.some((t) => t.id === result.topicId)) {
              ui.setActivePage('study');
              ui.setActiveMonth(month.id);
              ui.setActiveFocusType(focus.type);
              ui.setActiveView('day');
              break;
            }
          }
        }
      }
      break;
    }

    case 'note':
      // Handoff atômico — NotePanel reage ao targetNoteId e abre o editor
      // direto na nota indicada. Também garante que o usuário esteja na tela
      // do estudo com o mês do tópico ativo, pra manter o contexto.
      {
        const roadmap = getRoadmap();
        for (const phase of roadmap.phases) {
          for (const month of phase.months) {
            for (const focus of month.focuses) {
              if (focus.topics.some((t) => t.id === result.topicId)) {
                ui.setActivePage('study');
                ui.setActiveMonth(month.id);
                ui.setActiveFocusType(focus.type);
                ui.setActiveView('day');
                break;
              }
            }
          }
        }
      }
      ui.openNotePanelWithNote(result.topicId, result.id);
      break;

    case 'focus': {
      // Encontra o focus real pra pegar seu tipo.
      const roadmap = getRoadmap();
      const focus = roadmap.phases
        .flatMap((p) => p.months)
        .flatMap((m) => m.focuses)
        .find((f) => f.id === result.id);
      ui.setActivePage('study');
      ui.setActiveMonth(result.monthId);
      if (focus) ui.setActiveFocusType(focus.type);
      ui.setActiveView('day');
      break;
    }

    case 'milestone': {
      // Marco: ir pra visão anual do plano de estudo e posicionar no
      // período (mês) que contém a data do marco, se existir.
      const target = new Date(result.date).getTime();
      const roadmap = getRoadmap();
      let bestMonthId: string | null = null;
      for (const phase of roadmap.phases) {
        for (const month of phase.months) {
          const range = inferPeriodRange(month.id);
          if (!range) continue;
          if (target >= range.start.getTime() && target <= range.end.getTime()) {
            bestMonthId = month.id;
            break;
          }
        }
        if (bestMonthId) break;
      }
      if (bestMonthId) ui.setActiveMonth(bestMonthId);
      ui.setActivePage('study');
      ui.setActiveView('year');
      break;
    }

    case 'month':
      ui.setActivePage('study');
      ui.setActiveMonth(result.id);
      ui.setActiveView('month');
      break;
  }

  ui.closeSearch();
}
