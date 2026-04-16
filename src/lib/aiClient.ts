/**
 * Multi-provider streaming chat client (browser-only, BYOK).
 *
 * Keys are passed directly to the provider's API from the browser — they
 * never pass through any proxy. Each provider has its own protocol; this
 * module dispatches to the right implementation based on provider.protocol.
 */

import type { AIProvider } from './aiProviders';
import { normalizeBaseUrl } from './aiProviders';
import i18n from '../i18n';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  provider: AIProvider;
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
  signal?: AbortSignal;
}

export async function streamChat(opts: StreamOptions): Promise<void> {
  if (!opts.apiKey && opts.provider.protocol !== 'ollama') {
    opts.onError(new Error(i18n.t('ai.errorAuth')));
    return;
  }

  try {
    switch (opts.provider.protocol) {
      case 'anthropic':
        await streamAnthropic(opts);
        return;
      case 'openai-compat':
        await streamOpenAICompat(opts);
        return;
      case 'google-gemini':
        await streamGoogleGemini(opts);
        return;
      case 'ollama':
        await streamOllama(opts);
        return;
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      opts.onDone();
      return;
    }
    opts.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/* ── SSE helper — iterates `data: ...` events from a Response body ── */

async function* sseEvents(response: Response): AsyncGenerator<string, void, unknown> {
  if (!response.body) throw new Error(i18n.t('ai.errorNetwork'));

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const lines = chunk.split('\n');
      let data = '';
      for (const line of lines) {
        if (line.startsWith('data:')) {
          data += line.slice(5).trimStart();
        }
      }
      if (!data) continue;
      if (data === '[DONE]') continue;
      yield data;
    }
  }
}

/* ── Anthropic /v1/messages ─────────────────────────────────────── */

async function streamAnthropic(opts: StreamOptions): Promise<void> {
  const { provider, apiKey, model, system, messages, maxTokens = 2048, signal, onDelta, onDone } = opts;

  const response = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic ${response.status}: ${errorText}`);
  }

  for await (const data of sseEvents(response)) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'content_block_delta') {
        const delta = parsed.delta?.text;
        if (typeof delta === 'string') onDelta(delta);
      }
    } catch {
      // ignore malformed events
    }
  }

  onDone();
}

/* ── OpenAI-compatible chat completions ─────────────────────────── */
/*    Works for: OpenAI, xAI, DeepSeek, Mistral, Groq.                */

async function streamOpenAICompat(opts: StreamOptions): Promise<void> {
  const { provider, apiKey, model, system, messages, maxTokens = 2048, signal, onDelta, onDone } = opts;

  const apiMessages = [
    { role: 'system' as const, content: system },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  // o1/o3 reasoning models: no system role, no max_tokens (use max_completion_tokens)
  const isReasoningModel = /^(o1|o3)/.test(model);
  const body: Record<string, unknown> = {
    model,
    messages: isReasoningModel
      ? apiMessages.map(m => (m.role === 'system' ? { role: 'user' as const, content: m.content } : m))
      : apiMessages,
    stream: true,
  };
  if (isReasoningModel) {
    body.max_completion_tokens = maxTokens;
  } else {
    body.max_tokens = maxTokens;
  }

  const response = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider.name} ${response.status}: ${errorText}`);
  }

  for await (const data of sseEvents(response)) {
    try {
      const parsed = JSON.parse(data);
      const delta = parsed.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta) onDelta(delta);
    } catch {
      // ignore malformed events
    }
  }

  onDone();
}

/* ── Google Gemini streamGenerateContent ────────────────────────── */

async function streamGoogleGemini(opts: StreamOptions): Promise<void> {
  const { provider, apiKey, model, system, messages, maxTokens = 2048, signal, onDelta, onDone } = opts;

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const url = `${provider.baseUrl}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { maxOutputTokens: maxTokens },
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini ${response.status}: ${errorText}`);
  }

  for await (const data of sseEvents(response)) {
    try {
      const parsed = JSON.parse(data);
      const parts = parsed.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        for (const p of parts) {
          if (typeof p.text === 'string') onDelta(p.text);
        }
      }
    } catch {
      // ignore malformed events
    }
  }

  onDone();
}

/* ── Ollama /api/chat — NDJSON streaming ─────────────────────── */

async function streamOllama(opts: StreamOptions): Promise<void> {
  const { apiKey, model, system, messages, signal, onDelta, onDone } = opts;
  // For Ollama, apiKey carries the server base URL (not an actual key).
  const base = normalizeBaseUrl(apiKey || 'http://localhost:11434');

  const chatMessages = [
    { role: 'system', content: system },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: chatMessages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama ${response.status}: ${errorText}`);
  }
  if (!response.body) throw new Error(i18n.t('ai.errorNetwork'));

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        const delta = parsed?.message?.content;
        if (typeof delta === 'string' && delta) onDelta(delta);
      } catch {
        // ignore malformed chunks
      }
    }
  }

  onDone();
}
