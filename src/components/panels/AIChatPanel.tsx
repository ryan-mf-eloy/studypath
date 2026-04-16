import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  PaperPlaneRight,
  Warning,
  CaretDown,
  CaretLeft,
  Check,
  Trash,
} from '@phosphor-icons/react';
import { useAIStore, useCurrentProvider, useCurrentApiKey } from '../../store/useAIStore';
import { useNotesStore } from '../../store/useNotesStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import { findTopicContext } from '../../lib/utils';
import { extractPlainText } from '../../lib/noteBodyMigration';
import { streamChat } from '../../lib/aiClient';
import {
  AI_PROVIDERS,
  getProvider,
  tagLabel,
  validateProviderConnection,
} from '../../lib/aiProviders';
import type { AIModel, ProviderId } from '../../lib/aiProviders';

function buildSystemPrompt(context: { topicLabel?: string; focusName?: string; noteContent?: string }): string {
  const parts: string[] = [
    'Você é um tutor de estudos do StudyPath, assistente pessoal do Ryan.',
    'Responda em português brasileiro, de forma clara, direta e pedagógica.',
    'Seja conciso mas substancial — sem encher com exemplos vazios.',
    'Quando fizer um quiz, faça 3–5 perguntas e aguarde respostas antes de corrigir.',
    'Quando explicar, use exemplos de código em TypeScript/Node.js quando fizer sentido.',
  ];

  if (context.topicLabel) {
    parts.push('');
    parts.push(`Contexto atual do usuário:`);
    parts.push(`- Tópico em foco: ${context.topicLabel}`);
    if (context.focusName) parts.push(`- Matéria: ${context.focusName}`);
  }

  if (context.noteContent) {
    parts.push('');
    parts.push('Nota do usuário sobre o tópico (use como contexto):');
    parts.push('---');
    parts.push(context.noteContent.slice(0, 2000));
    parts.push('---');
  }

  return parts.join('\n');
}

type View = 'chat' | 'providers' | 'key-setup' | 'model-picker';

export default function AIChatPanel() {
  const { t } = useTranslation();
  const chatOpen = useAIStore(s => s.chatOpen);
  const closeChat = useAIStore(s => s.closeChat);
  const providerId = useAIStore(s => s.providerId);
  const apiKeys = useAIStore(s => s.apiKeys);
  const setApiKey = useAIStore(s => s.setApiKey);
  const removeApiKey = useAIStore(s => s.removeApiKey);
  const setProvider = useAIStore(s => s.setProvider);
  const model = useAIStore(s => s.model);
  const setModel = useAIStore(s => s.setModel);
  const dynamicModels = useAIStore(s => s.dynamicModels);
  const setDynamicModels = useAIStore(s => s.setDynamicModels);
  const messages = useAIStore(s => s.messages);
  const thinking = useAIStore(s => s.thinking);
  const contextTopicId = useAIStore(s => s.contextTopicId);
  const contextNoteId = useAIStore(s => s.contextNoteId);
  const seedPrompt = useAIStore(s => s.seedPrompt);
  const addMessage = useAIStore(s => s.addMessage);
  const appendToLastAssistant = useAIStore(s => s.appendToLastAssistant);
  const setThinking = useAIStore(s => s.setThinking);

  const provider = useCurrentProvider();
  const apiKey = useCurrentApiKey();

  const notes = useNotesStore(s => s.notes);
  const roadmap = useRoadmap();

  const [input, setInput] = useState('');
  const [keyDraft, setKeyDraft] = useState('');
  const [keyDraftProvider, setKeyDraftProvider] = useState<ProviderId>(providerId);
  const [validating, setValidating] = useState(false);
  const [keySetupError, setKeySetupError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seedSentRef = useRef<string | null>(null);

  const ctx = contextTopicId ? findTopicContext(roadmap, contextTopicId) : null;
  const contextNote = contextNoteId ? notes.find(n => n.id === contextNoteId) : null;
  const noteContent = contextNote
    ? extractPlainText(contextNote.body, contextNote.bodyVersion)
    : undefined;

  const hasCurrentKey = !!apiKey;

  // Decide initial view when opening the panel
  useEffect(() => {
    if (!chatOpen) return;
    if (!hasCurrentKey) {
      setKeyDraftProvider(providerId);
      setView('providers');
    } else {
      setView('chat');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen]);

  const sendMessage = (rawMessage: string) => {
    const userMessage = rawMessage.trim();
    if (!userMessage || thinking) return;
    if (!apiKey) {
      setView('providers');
      return;
    }
    setError(null);

    addMessage({ role: 'user', content: userMessage });
    addMessage({ role: 'assistant', content: '' });
    setThinking(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const systemPrompt = buildSystemPrompt({
      topicLabel: ctx?.topic.label,
      focusName: ctx?.focus.name,
      noteContent,
    });

    const currentMessages = useAIStore.getState().messages;
    const apiMessages = currentMessages
      .filter(m => m.content.trim())
      .map(m => ({ role: m.role, content: m.content }));

    streamChat({
      provider,
      apiKey,
      model,
      system: systemPrompt,
      messages: apiMessages,
      maxTokens: 2048,
      signal: controller.signal,
      onDelta: (delta) => appendToLastAssistant(delta),
      onDone: () => {
        setThinking(false);
        abortRef.current = null;
      },
      onError: (err) => {
        setThinking(false);
        abortRef.current = null;
        setError(err.message);
      },
    });
  };

  useEffect(() => {
    if (!chatOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChat();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [chatOpen, closeChat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  useEffect(() => {
    if (chatOpen && hasCurrentKey && view === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [chatOpen, hasCurrentKey, view]);

  useEffect(() => {
    if (!chatOpen && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [chatOpen]);

  useEffect(() => {
    if (!chatOpen) {
      seedSentRef.current = null;
      return;
    }
    if (
      hasCurrentKey &&
      view === 'chat' &&
      seedPrompt &&
      messages.length === 0 &&
      !thinking &&
      seedSentRef.current !== seedPrompt
    ) {
      seedSentRef.current = seedPrompt;
      setTimeout(() => sendMessage(seedPrompt), 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, hasCurrentKey, view, seedPrompt, messages.length, thinking]);

  if (!chatOpen) return null;

  const handleSubmit = () => {
    if (!input.trim() || thinking) return;
    const msg = input;
    setInput('');
    sendMessage(msg);
  };

  const handleSaveKey = async () => {
    if (validating) return;
    const trimmed = keyDraft.trim();
    if (!trimmed) return;
    const targetProvider = getProvider(keyDraftProvider);

    setValidating(true);
    setKeySetupError(null);
    try {
      const result = await validateProviderConnection(targetProvider, trimmed);
      if (!result.ok) {
        const raw = result.error ?? t('ai.connectionFailed');
        const scrubbed = scrubSecret(raw, trimmed);
        setKeySetupError(scrubbed.slice(0, 240));
        return;
      }

      setApiKey(keyDraftProvider, trimmed);
      if (result.models && result.models.length > 0) {
        setDynamicModels(keyDraftProvider, result.models);
      }
      if (keyDraftProvider !== providerId) {
        setProvider(keyDraftProvider);
      } else if (result.models && result.models.length > 0) {
        const stillValid = result.models.some(m => m.id === model);
        if (!stillValid) setModel(result.models[0].id);
      }
      setKeyDraft('');
      setView('chat');
    } finally {
      setValidating(false);
    }
  };

  const handlePickProvider = (pid: ProviderId) => {
    setKeySetupError(null);
    if (apiKeys[pid]) {
      setProvider(pid);
      setView('chat');
    } else {
      setKeyDraftProvider(pid);
      const defaultForOllama =
        getProvider(pid).protocol === 'ollama' ? 'http://localhost:11434' : '';
      setKeyDraft(defaultForOllama);
      setView('key-setup');
    }
  };

  const keyDraftProviderMeta = getProvider(keyDraftProvider);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeChat}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'var(--bg-backdrop)',
          zIndex: 440,
          animation: 'sp-confirm-backdrop-in 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label={t('ai.chatTitle')}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 460,
          maxWidth: '100vw',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--text-15)',
          zIndex: 450,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-16px 0 40px var(--shadow-md)',
          animation: 'sp-pop-in 280ms cubic-bezier(0.22, 1, 0.36, 1)',
          transformOrigin: 'right center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Header
          view={view}
          setView={setView}
          provider={provider}
          model={model}
          ctx={ctx?.topic.label ?? null}
          closeChat={closeChat}
          hasCurrentKey={hasCurrentKey}
        />

        {/* Content */}
        {view === 'providers' && (
          <ProviderGrid
            apiKeys={apiKeys}
            currentProviderId={providerId}
            onPick={handlePickProvider}
            onRemoveKey={(pid) => {
              removeApiKey(pid);
            }}
          />
        )}

        {view === 'key-setup' && (
          <KeySetup
            provider={keyDraftProviderMeta}
            draft={keyDraft}
            setDraft={setKeyDraft}
            onSave={handleSaveKey}
            onCancel={() => {
              setKeySetupError(null);
              setView('providers');
            }}
            validating={validating}
            error={keySetupError}
          />
        )}

        {view === 'model-picker' && (
          <ModelPicker
            provider={provider}
            currentModel={model}
            dynamicModels={dynamicModels[providerId]}
            onPick={(m) => {
              setModel(m);
              setView('chat');
            }}
          />
        )}

        {view === 'chat' && (
          <ChatView
            messages={messages}
            thinking={thinking}
            ctxLabel={ctx?.topic.label ?? null}
            error={error}
            scrollRef={scrollRef}
            inputRef={inputRef}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            hasCurrentKey={hasCurrentKey}
            openProviders={() => setView('providers')}
          />
        )}
      </div>
    </>
  );
}

/* ─── Header ────────────────────────────────────────────────── */

function Header(props: {
  view: View;
  setView: (v: View) => void;
  provider: ReturnType<typeof getProvider>;
  model: string;
  ctx: string | null;
  closeChat: () => void;
  hasCurrentKey: boolean;
}) {
  const { view, setView, provider, model, ctx, closeChat, hasCurrentKey } = props;
  const { t } = useTranslation();
  const ProviderLogo = provider.Logo;
  const modelMeta = provider.models.find(m => m.id === model);

  return (
    <div
      className="flex items-center"
      style={{
        padding: '16px 18px 14px',
        gap: 12,
        borderBottom: '1px solid var(--text-08)',
        flexShrink: 0,
      }}
    >
      {view !== 'chat' && view !== 'providers' && (
        <button
          type="button"
          onClick={() => setView('providers')}
          aria-label={t('common.back')}
          className="flex items-center justify-center"
          style={{
            padding: 6,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-50)',
          }}
        >
          <CaretLeft size={16} />
        </button>
      )}

      {view === 'chat' && <ProviderLogo size={22} />}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text)',
            lineHeight: 1.2,
          }}
        >
          {view === 'providers'
            ? t('ai.selectProvider')
            : view === 'key-setup'
            ? t('ai.configureProvider')
            : view === 'model-picker'
            ? t('ai.selectModel')
            : provider.name}
        </div>
        {view === 'chat' && hasCurrentKey && (
          <button
            type="button"
            onClick={() => setView('model-picker')}
            className="flex items-center"
            style={{
              marginTop: 2,
              gap: 4,
              padding: 0,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--text-30)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {modelMeta?.label ?? model}
              {ctx && ` · ${ctx}`}
            </span>
            <CaretDown size={10} style={{ flexShrink: 0 }} />
          </button>
        )}
      </div>

      {view === 'chat' && (
        <button
          type="button"
          onClick={() => setView('providers')}
          aria-label={t('ai.manageProviders')}
          className="flex items-center justify-center"
          style={{
            padding: '6px 10px',
            background: 'transparent',
            border: '1px solid var(--text-15)',
            cursor: 'pointer',
            fontSize: 11,
            color: 'var(--text-50)',
          }}
        >
          Trocar
        </button>
      )}

      <button
        type="button"
        onClick={closeChat}
        aria-label={t('common.close')}
        className="flex items-center justify-center"
        style={{
          padding: 6,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-50)',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

/* ─── Provider Grid ─────────────────────────────────────────── */

function ProviderGrid(props: {
  apiKeys: Partial<Record<ProviderId, string>>;
  currentProviderId: ProviderId;
  onPick: (id: ProviderId) => void;
  onRemoveKey: (id: ProviderId) => void;
}) {
  const { apiKeys, currentProviderId, onPick, onRemoveKey } = props;
  const { t } = useTranslation();
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '18px 18px 24px',
      }}
    >
      <p
        style={{
          fontSize: 12,
          color: 'var(--text-50)',
          lineHeight: 1.55,
          margin: '0 0 16px',
        }}
      >
        {t('ai.apiKeyHelper')}
      </p>

      <div className="flex flex-col" style={{ gap: 8 }}>
        {AI_PROVIDERS.map((p) => {
          const Logo = p.Logo;
          const connected = !!apiKeys[p.id];
          const active = connected && p.id === currentProviderId;
          return (
            <div
              key={p.id}
              className="flex items-center"
              style={{
                gap: 14,
                padding: '14px 14px',
                border: `1px solid ${active ? 'var(--text-30)' : 'var(--text-08)'}`,
                background: active ? 'var(--text-04)' : 'transparent',
                transition:
                  'border-color var(--transition-fast), background-color var(--transition-fast)',
              }}
            >
              <button
                type="button"
                onClick={() => onPick(p.id)}
                className="flex items-center"
                style={{
                  flex: 1,
                  minWidth: 0,
                  gap: 14,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text)',
                  }}
                >
                  <Logo size={24} monochrome />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="flex items-center"
                    style={{ gap: 8, marginBottom: 2 }}
                  >
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: 'var(--text)',
                        lineHeight: 1.2,
                      }}
                    >
                      {p.name}
                    </span>
                    {connected && (
                      <span
                        className="flex items-center"
                        style={{
                          gap: 3,
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: '0.6px',
                          textTransform: 'uppercase',
                          color: 'var(--accent-green)',
                        }}
                      >
                        <Check size={10} weight="bold" />
                        {t('ai.connected')}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-50)',
                      lineHeight: 1.45,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t(p.descriptionKey)}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text-30)',
                      marginTop: 3,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {p.models.length} {t('ai.models').toLowerCase()}
                  </div>
                </div>
              </button>
              {connected && (
                <button
                  type="button"
                  onClick={() => onRemoveKey(p.id)}
                  aria-label={`${t('ai.removeKey')} — ${p.name}`}
                  className="flex items-center justify-center"
                  style={{
                    padding: 6,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-30)',
                    flexShrink: 0,
                  }}
                >
                  <Trash size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Key Setup ─────────────────────────────────────────────── */

function KeySetup(props: {
  provider: ReturnType<typeof getProvider>;
  draft: string;
  setDraft: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  validating: boolean;
  error: string | null;
}) {
  const { provider, draft, setDraft, onSave, onCancel, validating, error } = props;
  const { t } = useTranslation();
  const Logo = provider.Logo;
  const isOllama = provider.protocol === 'ollama';
  const fieldLabel = isOllama ? 'URL do servidor' : t('ai.apiKey');
  const helpText = isOllama
    ? 'Informe a URL do servidor Ollama. Ela fica salva só no seu navegador e é usada só pra conectar localmente. Lembre de rodar o Ollama com CORS liberado (OLLAMA_ORIGINS=*).'
    : t('ai.apiKeyHelper');
  return (
    <div
      className="flex flex-col"
      style={{
        flex: 1,
        padding: '24px 22px',
        gap: 18,
      }}
    >
      <div className="flex items-center" style={{ gap: 12 }}>
        <Logo size={28} />
        <div>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              color: 'var(--text)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {provider.name}
          </h3>
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-50)',
              margin: '2px 0 0',
            }}
          >
            {t(provider.descriptionKey)}
          </p>
        </div>
      </div>

      <p
        style={{
          fontSize: 12.5,
          color: 'var(--text-50)',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {helpText}
      </p>

      <a
        href={provider.keyUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 12,
          color: 'var(--accent-coral)',
        }}
      >
        {isOllama ? 'Baixar Ollama →' : 'Obter uma chave →'}
      </a>

      <label
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: 'var(--text-30)',
          margin: '4px 0 -8px',
        }}
      >
        {fieldLabel}
      </label>

      <input
        type={isOllama ? 'text' : 'password'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={provider.keyPlaceholder}
        autoFocus
        disabled={validating}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave();
        }}
        style={{
          width: '100%',
          padding: '10px 14px',
          border: `1px solid ${error ? 'var(--accent-coral)' : 'var(--text-15)'}`,
          background: 'transparent',
          color: 'var(--text)',
          fontFamily: 'var(--font-mono, var(--font-sans))',
          fontSize: 13,
          outline: 'none',
          opacity: validating ? 0.5 : 1,
        }}
      />

      {error && (
        <div
          className="flex items-start"
          style={{
            gap: 8,
            padding: '10px 12px',
            border: '1px solid var(--accent-coral)',
            background: 'var(--focus-main-bg)',
            fontSize: 11.5,
            color: 'var(--accent-coral)',
            lineHeight: 1.5,
          }}
        >
          <Warning size={13} weight="bold" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ flex: 1, wordBreak: 'break-word' }}>{error}</span>
        </div>
      )}

      <div className="flex" style={{ gap: 10 }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={validating}
          style={{
            padding: '10px 16px',
            border: '1px solid var(--text-15)',
            background: 'transparent',
            color: 'var(--text-50)',
            cursor: validating ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            opacity: validating ? 0.5 : 1,
          }}
        >
          {t('common.back')}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!draft.trim() || validating}
          className="flex items-center justify-center"
          style={{
            gap: 8,
            padding: '10px 18px',
            border: '1px solid var(--text)',
            background: 'var(--text)',
            color: 'var(--bg-surface)',
            cursor: draft.trim() && !validating ? 'pointer' : 'not-allowed',
            opacity: draft.trim() && !validating ? 1 : 0.4,
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {validating && <Spinner size={13} />}
          {validating ? t('common.saving') : t('ai.saveKey')}
        </button>
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */

function scrubSecret(text: string, secret: string): string {
  if (!secret || secret.length < 6) return text;
  return text.split(secret).join('[chave redacted]');
}

/* ─── Spinner ────────────────────────────────────────────── */

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'sp-spin 900ms linear infinite' }}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Model Picker ──────────────────────────────────────────── */

function ModelPicker(props: {
  provider: ReturnType<typeof getProvider>;
  currentModel: string;
  dynamicModels?: AIModel[];
  onPick: (modelId: string) => void;
}) {
  const { provider, currentModel, dynamicModels, onPick } = props;
  const { t } = useTranslation();
  const models =
    dynamicModels && dynamicModels.length > 0 ? dynamicModels : provider.models;
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '16px 18px 24px',
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: 'var(--text-30)',
          margin: '0 0 10px',
        }}
      >
        {provider.protocol === 'ollama'
          ? `${t('ai.models')} (${models.length})`
          : t('ai.models')}
      </p>
      {models.length === 0 && (
        <div
          style={{
            padding: '14px 12px',
            border: '1px solid var(--text-08)',
            fontSize: 12,
            color: 'var(--text-50)',
            lineHeight: 1.5,
          }}
        >
          Nenhum modelo disponível. Reconecte o provedor pra atualizar a lista.
        </div>
      )}
      <div className="flex flex-col" style={{ gap: 6 }}>
        {models.map((m) => {
          const active = m.id === currentModel;
          const tag = tagLabel(m.tag);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m.id)}
              className="flex items-center"
              style={{
                gap: 10,
                padding: '11px 13px',
                background: active ? 'var(--text-04)' : 'transparent',
                border: `1px solid ${active ? 'var(--text-30)' : 'var(--text-08)'}`,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text)',
                    lineHeight: 1.2,
                  }}
                >
                  {m.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--text-30)',
                    marginTop: 2,
                    fontFamily: 'var(--font-mono, var(--font-sans))',
                  }}
                >
                  {m.id}
                </div>
              </div>
              {tag && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    color: 'var(--text-50)',
                    border: '1px solid var(--text-08)',
                    padding: '2px 6px',
                    flexShrink: 0,
                  }}
                >
                  {tag}
                </span>
              )}
              {active && (
                <Check size={14} weight="bold" style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Chat View ─────────────────────────────────────────────── */

function ChatView(props: {
  messages: { id: string; role: 'user' | 'assistant'; content: string }[];
  thinking: boolean;
  ctxLabel: string | null;
  error: string | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  input: string;
  setInput: (v: string) => void;
  handleSubmit: () => void;
  hasCurrentKey: boolean;
  openProviders: () => void;
}) {
  const {
    messages,
    thinking,
    error,
    scrollRef,
    inputRef,
    input,
    setInput,
    handleSubmit,
    hasCurrentKey,
    openProviders,
  } = props;
  const { t } = useTranslation();

  const emptyMessage = useMemo(() => {
    if (!hasCurrentKey) return t('ai.noKeyWarning');
    return t('ai.welcome');
  }, [hasCurrentKey, t]);

  return (
    <>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '20px 20px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {messages.length === 0 && (
          <div
            className="flex flex-col items-center"
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-30)',
              fontSize: 13,
              lineHeight: 1.6,
              gap: 14,
            }}
          >
            <div>{emptyMessage}</div>
            {!hasCurrentKey && (
              <button
                type="button"
                onClick={openProviders}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--text)',
                  background: 'var(--text)',
                  color: 'var(--bg-surface)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {t('ai.selectProvider')}
              </button>
            )}
          </div>
        )}

        {messages.map((msg) =>
          msg.content || msg.role === 'user' ? (
            <div
              key={msg.id}
              className="flex flex-col"
              style={{
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  color: 'var(--text-30)',
                  padding: '0 4px',
                }}
              >
                {msg.role === 'user' ? 'Você' : 'IA'}
              </div>
              <div
                style={{
                  maxWidth: '90%',
                  padding: '12px 14px',
                  background: msg.role === 'user' ? 'var(--text-08)' : 'var(--bg-pill)',
                  border: '1px solid var(--text-08)',
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: 'var(--text)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content || (
                  <span style={{ color: 'var(--text-30)', fontStyle: 'italic' }}>{t('ai.thinking')}</span>
                )}
              </div>
            </div>
          ) : null,
        )}

        {error && (
          <div
            className="flex items-start"
            style={{
              gap: 10,
              padding: '12px 14px',
              border: '1px solid var(--accent-coral)',
              background: 'var(--focus-main-bg)',
              color: 'var(--accent-coral)',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <Warning size={14} weight="bold" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <strong>Erro:</strong> {error}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          padding: '12px 16px 16px',
          borderTop: '1px solid var(--text-08)',
          flexShrink: 0,
        }}
      >
        <div
          className="flex items-end"
          style={{
            gap: 10,
            border: '1px solid var(--text-15)',
            padding: '10px 12px',
            background: 'var(--bg-surface)',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              !hasCurrentKey
                ? t('ai.noKeyWarning')
                : thinking
                ? t('ai.thinking')
                : t('ai.typeMessage')
            }
            rows={1}
            disabled={thinking || !hasCurrentKey}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--text)',
              lineHeight: 1.5,
              maxHeight: 120,
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || thinking || !hasCurrentKey}
            aria-label={t('ai.send')}
            className="flex items-center justify-center"
            style={{
              width: 30,
              height: 30,
              background:
                input.trim() && !thinking && hasCurrentKey
                  ? 'var(--accent-coral)'
                  : 'var(--text-15)',
              color: '#FFFFFF',
              border: 'none',
              cursor:
                input.trim() && !thinking && hasCurrentKey ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              transition: 'background-color var(--transition-fast)',
            }}
          >
            <PaperPlaneRight size={13} weight="bold" />
          </button>
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            color: 'var(--text-30)',
            textAlign: 'right',
          }}
        >
          Enter pra enviar · Shift+Enter pra nova linha
        </div>
      </div>
    </>
  );
}
