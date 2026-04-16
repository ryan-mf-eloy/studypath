import type { Block } from '@blocknote/core';

/**
 * Deserializa o body de uma nota para Block[] do BlockNote.
 * - bodyVersion === 1: body é JSON serializado de Block[]
 * - bodyVersion ausente: body é texto simples legado, converte para paragraphs
 */
export function deserializeNoteBody(body: string, bodyVersion?: number): Block[] {
  if (bodyVersion === 1) {
    try {
      return JSON.parse(body) as Block[];
    } catch {
      return [];
    }
  }

  // Texto legado: cada linha vira um bloco paragrafo
  if (!body.trim()) return [];

  return body.split('\n').filter(Boolean).map(line => ({
    type: 'paragraph' as const,
    content: [{ type: 'text' as const, text: line, styles: {} }],
  })) as unknown as Block[];
}

/**
 * Serializa Block[] do BlockNote para string JSON (para persistir no store).
 */
export function serializeNoteBody(blocks: Block[]): string {
  return JSON.stringify(blocks);
}

/**
 * Extrai texto plano de Block[] para busca full-text.
 * Percorre recursivamente o conteudo inline de cada bloco.
 */
export function extractPlainText(body: string, bodyVersion?: number): string {
  if (bodyVersion !== 1) return body;

  try {
    const blocks = JSON.parse(body) as Block[];
    return blocksToText(blocks);
  } catch {
    return body;
  }
}

function blocksToText(blocks: Block[]): string {
  return blocks
    .map(block => {
      let text = '';
      if (Array.isArray(block.content)) {
        text = block.content
          .map((item: Record<string, unknown>) =>
            typeof item === 'object' && item && 'text' in item
              ? String(item.text)
              : ''
          )
          .join('');
      }
      if (Array.isArray(block.children) && block.children.length > 0) {
        const childText = blocksToText(block.children as Block[]);
        if (childText) text += ' ' + childText;
      }
      return text;
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * Extrai um preview limpo para a lista de notas: apenas texto de parágrafos,
 * headings e itens de lista. Ignora blocos de código, tabelas, mídia e
 * qualquer bloco estrutural — dá um preview muito mais legível e elegante.
 */
export function extractNotePreview(body: string, bodyVersion?: number, maxLength = 180): string {
  if (bodyVersion !== 1) {
    // legacy plain text — collapse whitespace and trim
    return body.replace(/\s+/g, ' ').trim().slice(0, maxLength);
  }
  try {
    const blocks = JSON.parse(body) as Block[];
    const proseTypes = new Set([
      'paragraph',
      'heading',
      'bulletListItem',
      'numberedListItem',
      'checkListItem',
      'quote',
      'toggleListItem',
    ]);
    const text = blocks
      .filter(b => proseTypes.has((b as { type: string }).type))
      .map(b => {
        if (!Array.isArray(b.content)) return '';
        return b.content
          .map((item: Record<string, unknown>) =>
            typeof item === 'object' && item && 'text' in item ? String(item.text) : ''
          )
          .join('');
      })
      .filter(Boolean)
      .join(' · ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > maxLength ? text.slice(0, maxLength).trimEnd() + '…' : text;
  } catch {
    return '';
  }
}

/**
 * Conta blocos por tipo — usado para exibir badges de conteúdo
 * (ex.: "2 parágrafos · 1 bloco de código · 1 imagem") na listagem.
 */
export interface NoteBlockStats {
  total: number;
  paragraphs: number;
  headings: number;
  lists: number;
  codeBlocks: number;
  images: number;
  embeds: number;
  linkPreviews: number;
  tables: number;
  quotes: number;
  wordCount: number;
}

export function getNoteBlockStats(body: string, bodyVersion?: number): NoteBlockStats {
  const stats: NoteBlockStats = {
    total: 0,
    paragraphs: 0,
    headings: 0,
    lists: 0,
    codeBlocks: 0,
    images: 0,
    embeds: 0,
    linkPreviews: 0,
    tables: 0,
    quotes: 0,
    wordCount: 0,
  };
  if (bodyVersion !== 1) {
    stats.wordCount = body.trim().split(/\s+/).filter(Boolean).length;
    return stats;
  }
  try {
    const blocks = JSON.parse(body) as Block[];
    stats.total = blocks.length;
    const text = blocksToText(blocks);
    stats.wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    for (const b of blocks) {
      const t = (b as { type: string }).type;
      switch (t) {
        case 'paragraph':
          stats.paragraphs += 1;
          break;
        case 'heading':
          stats.headings += 1;
          break;
        case 'bulletListItem':
        case 'numberedListItem':
        case 'checkListItem':
        case 'toggleListItem':
          stats.lists += 1;
          break;
        case 'codeBlock':
          stats.codeBlocks += 1;
          break;
        case 'image':
          stats.images += 1;
          break;
        case 'embed':
        case 'video':
        case 'audio':
          stats.embeds += 1;
          break;
        case 'linkPreview':
          stats.linkPreviews += 1;
          break;
        case 'table':
          stats.tables += 1;
          break;
        case 'quote':
          stats.quotes += 1;
          break;
      }
    }
  } catch {
    /* noop */
  }
  return stats;
}
