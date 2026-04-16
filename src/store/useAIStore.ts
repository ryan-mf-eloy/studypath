import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from '../lib/utils';
import type { AIModel, ProviderId } from '../lib/aiProviders';
import { AI_PROVIDERS, getProvider } from '../lib/aiProviders';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface AIStore {
  /** Chaves por provedor (ou base URL no caso de Ollama). Armazenadas só em localStorage. */
  apiKeys: Partial<Record<ProviderId, string>>;
  /** Modelos descobertos dinamicamente (ex.: Ollama). */
  dynamicModels: Partial<Record<ProviderId, AIModel[]>>;
  /** Provedor ativo */
  providerId: ProviderId;
  /** Modelo ativo (válido dentro do provedor atual) */
  model: string;

  /** Painel de chat aberto? (não persistido) */
  chatOpen: boolean;
  contextTopicId?: string;
  contextNoteId?: string;
  seedPrompt?: string;
  messages: ChatMessage[];
  thinking: boolean;

  setApiKey: (providerId: ProviderId, key: string) => void;
  removeApiKey: (providerId: ProviderId) => void;
  setProvider: (providerId: ProviderId) => void;
  setModel: (model: string) => void;
  setDynamicModels: (providerId: ProviderId, models: AIModel[]) => void;

  openChat: (opts?: { topicId?: string; noteId?: string; seedPrompt?: string }) => void;
  closeChat: () => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'createdAt'>) => void;
  appendToLastAssistant: (delta: string) => void;
  setThinking: (value: boolean) => void;
  resetConversation: () => void;
}

type PersistedState = {
  apiKeys: Partial<Record<ProviderId, string>>;
  dynamicModels: Partial<Record<ProviderId, AIModel[]>>;
  providerId: ProviderId;
  model: string;
};

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      apiKeys: {},
      dynamicModels: {},
      providerId: 'anthropic',
      model: getProvider('anthropic').defaultModelId,
      chatOpen: false,
      messages: [],
      thinking: false,

      setApiKey(providerId, key) {
        set(s => ({ apiKeys: { ...s.apiKeys, [providerId]: key } }));
      },

      removeApiKey(providerId) {
        set(s => {
          const nextKeys = { ...s.apiKeys };
          delete nextKeys[providerId];
          const nextDynamic = { ...s.dynamicModels };
          delete nextDynamic[providerId];
          return { apiKeys: nextKeys, dynamicModels: nextDynamic };
        });
      },

      setProvider(providerId) {
        const provider = getProvider(providerId);
        const state = get();
        const currentModel = state.model;
        const availableModels =
          state.dynamicModels[providerId] && state.dynamicModels[providerId]!.length > 0
            ? state.dynamicModels[providerId]!
            : provider.models;
        const modelStillValid = availableModels.some(m => m.id === currentModel);
        set({
          providerId,
          model: modelStillValid
            ? currentModel
            : availableModels[0]?.id ?? provider.defaultModelId,
          messages: [],
          thinking: false,
        });
      },

      setModel(model) {
        set({ model });
      },

      setDynamicModels(providerId, models) {
        set(s => {
          const nextDynamic = { ...s.dynamicModels, [providerId]: models };
          // If we just updated the *current* provider's models and the active
          // model is no longer in the list, fall back to the first model.
          if (providerId === s.providerId && models.length > 0) {
            const stillValid = models.some(m => m.id === s.model);
            return {
              dynamicModels: nextDynamic,
              model: stillValid ? s.model : models[0].id,
            };
          }
          return { dynamicModels: nextDynamic };
        });
      },

      openChat(opts) {
        set({
          chatOpen: true,
          contextTopicId: opts?.topicId,
          contextNoteId: opts?.noteId,
          seedPrompt: opts?.seedPrompt,
          messages: [],
        });
      },

      closeChat() {
        set({ chatOpen: false, thinking: false, seedPrompt: undefined });
      },

      addMessage(msg) {
        const full: ChatMessage = {
          ...msg,
          id: nanoid('msg'),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ messages: [...s.messages, full] }));
      },

      appendToLastAssistant(delta) {
        set((s) => {
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === 'assistant') {
            msgs[msgs.length - 1] = { ...last, content: last.content + delta };
          }
          return { messages: msgs };
        });
      },

      setThinking(value) {
        set({ thinking: value });
      },

      resetConversation() {
        set({ messages: [], thinking: false });
      },
    }),
    {
      name: 'studypath-ai',
      version: 3,
      partialize: (state): PersistedState => ({
        apiKeys: state.apiKeys,
        dynamicModels: state.dynamicModels,
        providerId: state.providerId,
        model: state.model,
      }),
      migrate: (persistedState, version) => {
        if (version < 2 && persistedState && typeof persistedState === 'object') {
          const legacy = persistedState as { apiKey?: string; model?: string };
          const apiKeys: Partial<Record<ProviderId, string>> = {};
          if (legacy.apiKey) apiKeys.anthropic = legacy.apiKey;
          const provider = getProvider('anthropic');
          const model =
            legacy.model && provider.models.some(m => m.id === legacy.model)
              ? legacy.model
              : provider.defaultModelId;
          return {
            apiKeys,
            dynamicModels: {},
            providerId: 'anthropic' as ProviderId,
            model,
          } as PersistedState;
        }
        if (version < 3 && persistedState && typeof persistedState === 'object') {
          return {
            dynamicModels: {},
            ...(persistedState as object),
          } as PersistedState;
        }
        return persistedState as PersistedState;
      },
    },
  ),
);

/** Helper hooks */

export function useCurrentProvider() {
  return useAIStore(s => getProvider(s.providerId));
}

export function useCurrentApiKey() {
  return useAIStore(s => s.apiKeys[s.providerId] ?? '');
}

export function hasAnyConfiguredProvider(apiKeys: Partial<Record<ProviderId, string>>): boolean {
  return AI_PROVIDERS.some(p => !!apiKeys[p.id]);
}
