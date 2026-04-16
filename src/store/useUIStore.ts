import { create } from 'zustand';
import type { ViewScale, FocusType } from '../types';

export type ActivePage = 'overview' | 'study' | 'routine' | 'settings';

interface UIStore {
  /** Página ativa de nível raiz (Overview ou Estudos) */
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;

  /** Escala temporal ativa */
  activeView: ViewScale;
  setActiveView: (view: ViewScale) => void;

  /** Mês ativo na navegação (formato "YYYY-MM") */
  activeMonthId: string;
  setActiveMonth: (id: string) => void;

  /** Tipo de foco ativo no DayView (modo foco profundo) */
  activeFocusType: FocusType;
  setActiveFocusType: (type: FocusType) => void;

  /** ID do tópico cujo painel de nota está aberto. null = painel fechado */
  activeNoteTopicId: string | null;
  openNotePanel: (topicId: string) => void;
  closeNotePanel: () => void;

  /**
   * ID de nota-alvo a ser aberta diretamente no editor quando o NotePanel
   * montar com o tópico certo. Usado pelo CommandPalette para pular a etapa
   * da lista de notas e abrir direto no editor da nota escolhida.
   */
  targetNoteId: string | null;
  /** Ação atômica: abre o NotePanel no tópico e marca a nota-alvo */
  openNotePanelWithNote: (topicId: string, noteId: string) => void;
  /** Limpa a flag targetNoteId após o handoff */
  clearTargetNote: () => void;

  /** Busca rápida */
  searchOpen: boolean;
  searchQuery: string;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (q: string) => void;

  /** Modais globais acessíveis de qualquer tela */
  reviewModalOpen: boolean;
  openReviewModal: () => void;
  closeReviewModal: () => void;

  reflectionModalOpen: boolean;
  openReflectionModal: () => void;
  closeReflectionModal: () => void;
}

export const useUIStore = create<UIStore>(set => ({
  activePage: 'overview',
  setActivePage(page) {
    set({ activePage: page });
  },

  activeView: 'day',
  setActiveView(view) {
    set({ activeView: view });
  },

  activeMonthId: '',
  setActiveMonth(id) {
    set({ activeMonthId: id });
  },

  activeFocusType: 'main',
  setActiveFocusType(type) {
    set({ activeFocusType: type });
  },

  activeNoteTopicId: null,
  openNotePanel(topicId) {
    set({ activeNoteTopicId: topicId });
  },
  closeNotePanel() {
    set({ activeNoteTopicId: null, targetNoteId: null });
  },

  targetNoteId: null,
  openNotePanelWithNote(topicId, noteId) {
    set({ activeNoteTopicId: topicId, targetNoteId: noteId });
  },
  clearTargetNote() {
    set({ targetNoteId: null });
  },

  searchOpen: false,
  searchQuery: '',
  openSearch() {
    set({ searchOpen: true, searchQuery: '' });
  },
  closeSearch() {
    set({ searchOpen: false, searchQuery: '' });
  },
  setSearchQuery(q) {
    set({ searchQuery: q });
  },

  reviewModalOpen: false,
  openReviewModal() { set({ reviewModalOpen: true }); },
  closeReviewModal() { set({ reviewModalOpen: false }); },

  reflectionModalOpen: false,
  openReflectionModal() { set({ reflectionModalOpen: true }); },
  closeReflectionModal() { set({ reflectionModalOpen: false }); },
}));
