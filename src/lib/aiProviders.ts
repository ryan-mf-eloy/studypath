import type { ComponentType } from 'react';
import i18n from '../i18n';
import {
  AnthropicLogo,
  OpenAILogo,
  GeminiLogo,
  XAILogo,
  DeepSeekLogo,
  MistralLogo,
  GroqLogo,
  OllamaLogo,
} from '../components/ui/ProviderLogos';

export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'xai'
  | 'deepseek'
  | 'mistral'
  | 'groq'
  | 'ollama';

/** Protocol used to talk to the provider API. */
export type ProviderProtocol = 'anthropic' | 'openai-compat' | 'google-gemini' | 'ollama';

export interface AIModel {
  id: string;
  label: string;
  tag?: 'flagship' | 'balanced' | 'fast' | 'reasoning' | 'code' | 'legacy';
}

export interface AIProvider {
  id: ProviderId;
  name: string;
  /** i18n key for the provider's description (under `ai.providerDescriptions.*`). */
  descriptionKey: string;
  Logo: ComponentType<{ size?: number; monochrome?: boolean }>;
  protocol: ProviderProtocol;
  baseUrl: string;
  keyPlaceholder: string;
  keyUrl: string;
  models: AIModel[];
  defaultModelId: string;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    descriptionKey: 'ai.providerDescriptions.anthropic',
    Logo: AnthropicLogo,
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    keyPlaceholder: 'sk-ant-api03-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-opus-4-5', label: 'Claude Opus 4.5', tag: 'flagship' },
      { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5', tag: 'balanced' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', tag: 'fast' },
      { id: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', tag: 'legacy' },
      { id: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet (jun)', tag: 'legacy' },
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', tag: 'legacy' },
      { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus', tag: 'legacy' },
      { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', tag: 'legacy' },
    ],
    defaultModelId: 'claude-sonnet-4-5-20250929',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    descriptionKey: 'ai.providerDescriptions.openai',
    Logo: OpenAILogo,
    protocol: 'openai-compat',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    keyPlaceholder: 'sk-proj-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4.1', label: 'GPT-4.1', tag: 'flagship' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', tag: 'balanced' },
      { id: 'gpt-4.1-nano', label: 'GPT-4.1 nano', tag: 'fast' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', tag: 'fast' },
      { id: 'chatgpt-4o-latest', label: 'ChatGPT-4o latest' },
      { id: 'o3', label: 'o3', tag: 'reasoning' },
      { id: 'o3-mini', label: 'o3 mini', tag: 'reasoning' },
      { id: 'o1', label: 'o1', tag: 'reasoning' },
      { id: 'o1-mini', label: 'o1 mini', tag: 'reasoning' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', tag: 'legacy' },
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', tag: 'legacy' },
    ],
    defaultModelId: 'gpt-4o-mini',
  },
  {
    id: 'google',
    name: 'Google Gemini',
    descriptionKey: 'ai.providerDescriptions.google',
    Logo: GeminiLogo,
    protocol: 'google-gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    keyPlaceholder: 'AIza...',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tag: 'flagship' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tag: 'balanced' },
      { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', tag: 'fast' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', tag: 'fast' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', tag: 'legacy' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', tag: 'legacy' },
      { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B', tag: 'legacy' },
    ],
    defaultModelId: 'gemini-2.5-flash',
  },
  {
    id: 'xai',
    name: 'xAI',
    descriptionKey: 'ai.providerDescriptions.xai',
    Logo: XAILogo,
    protocol: 'openai-compat',
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    keyPlaceholder: 'xai-...',
    keyUrl: 'https://console.x.ai',
    models: [
      { id: 'grok-4', label: 'Grok 4', tag: 'flagship' },
      { id: 'grok-4-fast', label: 'Grok 4 Fast', tag: 'fast' },
      { id: 'grok-3', label: 'Grok 3', tag: 'balanced' },
      { id: 'grok-3-mini', label: 'Grok 3 mini', tag: 'fast' },
      { id: 'grok-2-vision-1212', label: 'Grok 2 Vision' },
      { id: 'grok-2-1212', label: 'Grok 2', tag: 'legacy' },
    ],
    defaultModelId: 'grok-3',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    descriptionKey: 'ai.providerDescriptions.deepseek',
    Logo: DeepSeekLogo,
    protocol: 'openai-compat',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    keyPlaceholder: 'sk-...',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek V3', tag: 'flagship' },
      { id: 'deepseek-reasoner', label: 'DeepSeek R1', tag: 'reasoning' },
      { id: 'deepseek-coder', label: 'DeepSeek Coder', tag: 'code' },
    ],
    defaultModelId: 'deepseek-chat',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    descriptionKey: 'ai.providerDescriptions.mistral',
    Logo: MistralLogo,
    protocol: 'openai-compat',
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    keyPlaceholder: 'Mistral API key',
    keyUrl: 'https://console.mistral.ai/api-keys',
    models: [
      { id: 'mistral-large-latest', label: 'Mistral Large', tag: 'flagship' },
      { id: 'mistral-medium-latest', label: 'Mistral Medium', tag: 'balanced' },
      { id: 'mistral-small-latest', label: 'Mistral Small', tag: 'balanced' },
      { id: 'ministral-8b-latest', label: 'Ministral 8B', tag: 'fast' },
      { id: 'ministral-3b-latest', label: 'Ministral 3B', tag: 'fast' },
      { id: 'codestral-latest', label: 'Codestral', tag: 'code' },
      { id: 'pixtral-large-latest', label: 'Pixtral Large' },
      { id: 'open-mistral-nemo', label: 'Mistral Nemo', tag: 'fast' },
    ],
    defaultModelId: 'mistral-small-latest',
  },
  {
    id: 'groq',
    name: 'Groq',
    descriptionKey: 'ai.providerDescriptions.groq',
    Logo: GroqLogo,
    protocol: 'openai-compat',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    keyPlaceholder: 'gsk_...',
    keyUrl: 'https://console.groq.com/keys',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', tag: 'flagship' },
      { id: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', tag: 'fast' },
      { id: 'llama-guard-3-8b', label: 'Llama Guard 3 8B' },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', tag: 'balanced' },
      { id: 'gemma2-9b-it', label: 'Gemma 2 9B', tag: 'fast' },
      { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill 70B', tag: 'reasoning' },
      { id: 'qwen-2.5-32b', label: 'Qwen 2.5 32B' },
    ],
    defaultModelId: 'llama-3.3-70b-versatile',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    descriptionKey: 'ai.providerDescriptions.ollama',
    Logo: OllamaLogo,
    protocol: 'ollama',
    baseUrl: 'http://localhost:11434',
    keyPlaceholder: 'http://localhost:11434',
    keyUrl: 'https://ollama.com/download',
    models: [],
    defaultModelId: '',
  },
];

export function getProvider(id: ProviderId): AIProvider {
  return AI_PROVIDERS.find(p => p.id === id) ?? AI_PROVIDERS[0];
}

export function getModel(providerId: ProviderId, modelId: string): AIModel | null {
  const provider = getProvider(providerId);
  return provider.models.find(m => m.id === modelId) ?? null;
}

/** Normalize user-entered base URL (trim trailing slash, enforce scheme). */
export function normalizeBaseUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, '');
}

/** Fetch list of installed Ollama models from a running server. */
export async function fetchOllamaModels(baseUrl: string, signal?: AbortSignal): Promise<AIModel[]> {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) throw new Error(i18n.t('ai.errorNetwork'));
  const response = await fetch(`${normalized}/api/tags`, { signal });
  if (!response.ok) {
    throw new Error(`Ollama ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  const list = Array.isArray(data?.models) ? data.models : [];
  return list.map((m: { name: string }) => ({
    id: m.name,
    label: m.name,
  }));
}

export interface ValidationResult {
  ok: boolean;
  models?: AIModel[];
  error?: string;
}

/** Validate a key/URL against the provider. For Ollama this also returns available models. */
export async function validateProviderConnection(
  provider: AIProvider,
  credential: string,
  signal?: AbortSignal,
): Promise<ValidationResult> {
  try {
    if (provider.protocol === 'ollama') {
      const models = await fetchOllamaModels(credential, signal);
      if (models.length === 0) {
        return {
          ok: false,
          error: i18n.t('ai.errorUnknown'),
        };
      }
      return { ok: true, models };
    }

    if (provider.protocol === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': credential,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        signal,
      });
      if (!res.ok) {
        return { ok: false, error: `Anthropic ${res.status}: ${await res.text()}` };
      }
      return { ok: true };
    }

    if (provider.protocol === 'google-gemini') {
      const res = await fetch(
        `${provider.baseUrl}?key=${encodeURIComponent(credential)}`,
        { method: 'GET', signal },
      );
      if (!res.ok) {
        return { ok: false, error: `Gemini ${res.status}: ${await res.text()}` };
      }
      return { ok: true };
    }

    if (provider.protocol === 'openai-compat') {
      // baseUrl ends in /chat/completions — swap to /models to list.
      const modelsUrl = provider.baseUrl.replace(/\/chat\/completions$/, '/models');
      const res = await fetch(modelsUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${credential}` },
        signal,
      });
      if (!res.ok) {
        return { ok: false, error: `${provider.name} ${res.status}: ${await res.text()}` };
      }
      return { ok: true };
    }

    return { ok: false, error: i18n.t('ai.errorUnknown') };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: i18n.t('ai.errorNetwork') };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

export function tagLabel(tag: AIModel['tag']): string {
  switch (tag) {
    case 'flagship':
      return i18n.t('ai.tags.flagship');
    case 'balanced':
      return i18n.t('ai.tags.balanced');
    case 'fast':
      return i18n.t('ai.tags.fast');
    case 'reasoning':
      return i18n.t('ai.tags.reasoning');
    case 'code':
      return i18n.t('ai.tags.code');
    case 'legacy':
      return i18n.t('ai.tags.legacy');
    default:
      return '';
  }
}
