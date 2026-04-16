/**
 * Note templates — ready-to-use starting points for a new note.
 * Each template returns a Block[] in BlockNote's shape (bodyVersion: 1).
 *
 * Template names/descriptions are localized at render time via i18n keys.
 * Icons are Phosphor components rendered directly by NoteTemplatePicker.
 */

import type { Block } from '@blocknote/core';
import type { Icon } from '@phosphor-icons/react';
import {
  FileText,
  Columns,
  ListBullets,
  Cards,
  Lightbulb,
  Code,
  Scales,
  Target,
  Users,
} from '@phosphor-icons/react';

export interface NoteTemplate {
  id: string;
  /** i18n key under `notes.templates.<id>.name` */
  nameKey: string;
  /** i18n key under `notes.templates.<id>.description` */
  descriptionKey: string;
  Icon: Icon;
  /** Brand color for the icon chip in the picker. */
  color: string;
  buildBlocks: () => Block[];
}

/* ─── Block helpers ─────────────────────────────────────────────────
 * BlockNote expects `content: [{ type: 'text', text, styles: {} }]` even
 * for empty blocks. Omitting the content array (or passing `[]`) can make
 * the editor crash on load when it re-serializes the body, so we always
 * emit a full text node — with `text: ''` when the block is empty. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBlock = any;

function inlineText(text: string): AnyBlock[] {
  return [{ type: 'text', text, styles: {} }];
}

function inlineRich(
  parts: Array<{ text: string; bold?: boolean; italic?: boolean; code?: boolean }>,
): AnyBlock[] {
  return parts.map((p) => ({
    type: 'text',
    text: p.text,
    styles: {
      ...(p.bold ? { bold: true } : {}),
      ...(p.italic ? { italic: true } : {}),
      ...(p.code ? { code: true } : {}),
    },
  }));
}

function paragraph(text = ''): AnyBlock {
  return { type: 'paragraph', content: inlineText(text) };
}

function paragraphRich(
  parts: Array<{ text: string; bold?: boolean; italic?: boolean; code?: boolean }>,
): AnyBlock {
  return { type: 'paragraph', content: inlineRich(parts) };
}

function heading(text: string, level: 1 | 2 | 3 = 2): AnyBlock {
  return {
    type: 'heading',
    props: { level },
    content: inlineText(text),
  };
}

function bullet(text = ''): AnyBlock {
  return { type: 'bulletListItem', content: inlineText(text) };
}

function numbered(text = ''): AnyBlock {
  return { type: 'numberedListItem', content: inlineText(text) };
}

function check(text = '', checked = false): AnyBlock {
  return {
    type: 'checkListItem',
    props: { checked },
    content: inlineText(text),
  };
}

function codeBlock(language: string, code: string): AnyBlock {
  return {
    type: 'codeBlock',
    props: { language },
    content: inlineText(code),
  };
}

/* ─── Templates ─────────────────────────────────────────────────────── */

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    nameKey: 'notes.templates.blank.name',
    descriptionKey: 'notes.templates.blank.description',
    Icon: FileText,
    color: 'var(--text-50)',
    buildBlocks: () => [paragraph()] as Block[],
  },

  {
    id: 'cornell',
    nameKey: 'notes.templates.cornell.name',
    descriptionKey: 'notes.templates.cornell.description',
    Icon: Columns,
    color: '#2B6CB0',
    buildBlocks: () =>
      [
        heading('Cornell notes', 1),
        paragraphRich([
          { text: 'Método: ', bold: true },
          {
            text:
              'capture ideias na coluna direita; extraia perguntas/cues à esquerda; condense em um resumo no fim.',
          },
        ]),
        heading('Cues / perguntas', 2),
        bullet('Qual é a ideia central?'),
        bullet('Por que isso importa?'),
        bullet('Onde eu travaria se tivesse que explicar?'),
        heading('Notas', 2),
        paragraph(),
        paragraph(),
        paragraph(),
        heading('Resumo (3–5 frases)', 2),
        paragraph(),
      ] as Block[],
  },

  {
    id: 'summary',
    nameKey: 'notes.templates.summary.name',
    descriptionKey: 'notes.templates.summary.description',
    Icon: ListBullets,
    color: '#3D9E6B',
    buildBlocks: () =>
      [
        heading('TL;DR', 2),
        paragraph('Uma frase resumindo o core do tópico.'),
        heading('Pontos-chave', 2),
        numbered('Primeiro ponto — o mais importante'),
        numbered('Segundo ponto — consequência ou nuance'),
        numbered('Terceiro ponto — exceção ou caso-limite'),
        heading('Detalhes', 2),
        paragraph(),
        heading('Conclusão', 2),
        paragraphRich([
          { text: 'O que aprendi: ', bold: true },
          { text: '' },
        ]),
        paragraphRich([
          { text: 'O que ficou em aberto: ', bold: true },
          { text: '' },
        ]),
      ] as Block[],
  },

  {
    id: 'flashcards',
    nameKey: 'notes.templates.flashcards.name',
    descriptionKey: 'notes.templates.flashcards.description',
    Icon: Cards,
    color: '#E84F3C',
    buildBlocks: () =>
      [
        heading('Flashcards', 1),
        paragraphRich([
          {
            text:
              'Recuperação ativa é uma das técnicas mais eficientes de estudo. Revise em intervalos crescentes: 1 dia, 3 dias, 7 dias, 14 dias, 30 dias.',
            italic: true,
          },
        ]),
        heading('Card 1', 3),
        paragraphRich([{ text: 'P: ', bold: true }, { text: '' }]),
        paragraphRich([{ text: 'R: ', bold: true }, { text: '' }]),
        heading('Card 2', 3),
        paragraphRich([{ text: 'P: ', bold: true }, { text: '' }]),
        paragraphRich([{ text: 'R: ', bold: true }, { text: '' }]),
        heading('Card 3', 3),
        paragraphRich([{ text: 'P: ', bold: true }, { text: '' }]),
        paragraphRich([{ text: 'R: ', bold: true }, { text: '' }]),
        heading('Card 4', 3),
        paragraphRich([{ text: 'P: ', bold: true }, { text: '' }]),
        paragraphRich([{ text: 'R: ', bold: true }, { text: '' }]),
      ] as Block[],
  },

  {
    id: 'feynman',
    nameKey: 'notes.templates.feynman.name',
    descriptionKey: 'notes.templates.feynman.description',
    Icon: Lightbulb,
    color: '#D97706',
    buildBlocks: () =>
      [
        heading('Técnica Feynman', 1),
        paragraphRich([
          {
            text:
              'Se você não consegue explicar algo em palavras simples, você ainda não entende de verdade.',
            italic: true,
          },
        ]),
        heading('1. Conceito', 2),
        paragraph('Escreva o nome do conceito que quer dominar.'),
        heading('2. Explique como para uma criança de 12 anos', 2),
        paragraph(
          'Use linguagem simples. Sem jargão. Use analogias e exemplos concretos.',
        ),
        paragraph(),
        paragraph(),
        heading('3. Identifique lacunas', 2),
        bullet('Onde você travou?'),
        bullet('Que parte não conseguiu explicar sem jargão?'),
        bullet('Que conexões estão faltando?'),
        heading('4. Revise e simplifique', 2),
        paragraph(
          'Volte à fonte, refine a explicação e teste de novo. Repita até fluir.',
        ),
      ] as Block[],
  },

  {
    id: 'code-example',
    nameKey: 'notes.templates.codeExample.name',
    descriptionKey: 'notes.templates.codeExample.description',
    Icon: Code,
    color: '#8B5CF6',
    buildBlocks: () =>
      [
        heading('Contexto', 2),
        paragraph('Qual problema esse código resolve. Quando usar.'),
        heading('Código', 2),
        codeBlock('typescript', '// exemplo mínimo — substitua pelo seu snippet\n'),
        heading('Por que funciona', 2),
        paragraph('Raciocínio passo a passo do mecanismo.'),
        heading('Pegadinhas', 2),
        bullet('Caso-limite 1'),
        bullet('Caso-limite 2'),
        heading('Referências', 2),
        bullet('Doc oficial: '),
        bullet('Artigo / fonte: '),
      ] as Block[],
  },

  {
    id: 'decision-log',
    nameKey: 'notes.templates.decisionLog.name',
    descriptionKey: 'notes.templates.decisionLog.description',
    Icon: Scales,
    color: '#0891B2',
    buildBlocks: () =>
      [
        heading('Decisão', 1),
        paragraph('Título curto da decisão.'),
        heading('Status', 2),
        check('Proposta', false),
        check('Aceita', false),
        check('Rejeitada', false),
        check('Substituída', false),
        heading('Contexto', 2),
        paragraph(
          'Qual problema motivou essa decisão? Quais forças estão em jogo? Por que agora?',
        ),
        heading('Opções consideradas', 2),
        paragraphRich([
          { text: 'Opção A — ', bold: true },
          { text: 'descrição' },
        ]),
        bullet('Prós: '),
        bullet('Contras: '),
        paragraphRich([
          { text: 'Opção B — ', bold: true },
          { text: 'descrição' },
        ]),
        bullet('Prós: '),
        bullet('Contras: '),
        paragraphRich([
          { text: 'Opção C — ', bold: true },
          { text: 'descrição' },
        ]),
        bullet('Prós: '),
        bullet('Contras: '),
        heading('Decisão final', 2),
        paragraph('Escolha e justificativa em uma frase.'),
        heading('Consequências', 2),
        paragraphRich([{ text: 'Positivas: ', bold: true }, { text: '' }]),
        paragraphRich([{ text: 'Negativas: ', bold: true }, { text: '' }]),
        paragraphRich([{ text: 'Neutras: ', bold: true }, { text: '' }]),
      ] as Block[],
  },

  {
    id: 'study-plan',
    nameKey: 'notes.templates.studyPlan.name',
    descriptionKey: 'notes.templates.studyPlan.description',
    Icon: Target,
    color: '#A855F7',
    buildBlocks: () =>
      [
        heading('Plano de estudo', 1),
        heading('Objetivo', 2),
        paragraph('Uma frase clara, mensurável.'),
        heading('Por que', 2),
        paragraph(
          'Por que esse assunto importa pra você? (sem esse norte, o plano morre na segunda semana)',
        ),
        heading('Recursos', 2),
        bullet('Livro: '),
        bullet('Curso / vídeo: '),
        bullet('Artigos: '),
        bullet('Comunidade / mentor: '),
        heading('Cronograma', 2),
        check('Semana 1 — fundamentos', false),
        check('Semana 2 — prática guiada', false),
        check('Semana 3 — projeto próprio', false),
        check('Semana 4 — revisão + exercícios difíceis', false),
        heading('Critério de sucesso', 2),
        paragraph('Como vou saber que realmente aprendi?'),
        heading('Perguntas em aberto', 2),
        bullet(''),
      ] as Block[],
  },

  {
    id: 'meeting',
    nameKey: 'notes.templates.meeting.name',
    descriptionKey: 'notes.templates.meeting.description',
    Icon: Users,
    color: '#0284C7',
    buildBlocks: () =>
      [
        heading('Reunião', 1),
        paragraphRich([{ text: 'Data: ', bold: true }, { text: '' }]),
        paragraphRich([{ text: 'Participantes: ', bold: true }, { text: '' }]),
        heading('Pauta', 2),
        numbered(''),
        numbered(''),
        numbered(''),
        heading('Discussão', 2),
        paragraph(),
        paragraph(),
        heading('Decisões', 2),
        bullet(''),
        heading('Ações', 2),
        check('[quem] — [o quê] — [quando]', false),
        check('[quem] — [o quê] — [quando]', false),
        heading('Perguntas em aberto', 2),
        bullet(''),
      ] as Block[],
  },
];
