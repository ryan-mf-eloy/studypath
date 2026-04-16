import type { Block } from '@blocknote/core';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import mammoth from 'mammoth';
import { extractPlainText, deserializeNoteBody, serializeNoteBody } from './noteBodyMigration';

/* ─── Shared helpers ──────────────────────────────────────── */

function sanitizeFilename(name: string): string {
  return (name || 'nota')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim() || 'nota';
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/* ─── Block tree utilities ────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBlock = any;

function inlineToPlain(content: AnyBlock): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (c?.type === 'text') return c.text ?? '';
        if (c?.type === 'link') return inlineToPlain(c.content);
        return '';
      })
      .join('');
  }
  return '';
}

/* ─── Markdown serialization (blocks → markdown) ──────────── */

function escapeInlineText(text: string): string {
  // Escape characters that would become unintended markdown
  return text.replace(/([\\`*_{}[\]])/g, '\\$1');
}

function inlineToMarkdown(content: AnyBlock): string {
  if (!content) return '';
  if (typeof content === 'string') return escapeInlineText(content);
  if (!Array.isArray(content)) return '';

  return content
    .map((item) => {
      if (item?.type === 'text') {
        let text = escapeInlineText(item.text ?? '');
        const styles = item.styles ?? {};
        if (styles.code) return `\`${item.text ?? ''}\``; // don't escape inside code
        if (styles.bold && styles.italic) text = `***${text}***`;
        else if (styles.bold) text = `**${text}**`;
        else if (styles.italic) text = `*${text}*`;
        if (styles.strike || styles.strikethrough) text = `~~${text}~~`;
        if (styles.underline) text = `<u>${text}</u>`;
        return text;
      }
      if (item?.type === 'link') {
        const inner = inlineToMarkdown(item.content);
        return `[${inner}](${item.href ?? ''})`;
      }
      return '';
    })
    .join('');
}

function blocksToMarkdown(blocks: AnyBlock[], depth = 0): string {
  const lines: string[] = [];
  let numberedCounter = 0;
  let lastWasNumbered = false;
  const indent = '  '.repeat(depth);

  for (const block of blocks) {
    const type = block?.type;
    const props = block?.props ?? {};
    const content = block?.content;
    const inline = inlineToMarkdown(content);

    if (type !== 'numberedListItem' && lastWasNumbered) {
      numberedCounter = 0;
    }

    let md = '';
    switch (type) {
      case 'paragraph':
        md = inline ? `${indent}${inline}` : '';
        break;

      case 'heading': {
        const level = Math.min(Math.max(props.level ?? 1, 1), 6);
        md = `${'#'.repeat(level)} ${inline}`;
        break;
      }

      case 'bulletListItem':
        md = `${indent}- ${inline}`;
        break;

      case 'numberedListItem':
        numberedCounter += 1;
        md = `${indent}${numberedCounter}. ${inline}`;
        break;

      case 'checkListItem': {
        const mark = props.checked ? 'x' : ' ';
        md = `${indent}- [${mark}] ${inline}`;
        break;
      }

      case 'quote':
        md = `${indent}> ${inline}`;
        break;

      case 'codeBlock': {
        const lang = props.language ?? '';
        const raw = inlineToPlain(content);
        md = `\`\`\`${lang}\n${raw}\n\`\`\``;
        break;
      }

      case 'image': {
        const url = props.url ?? props.src ?? '';
        const caption = props.caption ?? '';
        md = url ? `![${caption}](${url})` : '';
        break;
      }

      case 'video':
      case 'embed':
      case 'linkPreview': {
        const url = props.url ?? '';
        const title = props.title ?? url;
        md = url ? `[${title}](${url})` : '';
        break;
      }

      case 'divider':
      case 'horizontalRule':
        md = '---';
        break;

      case 'table': {
        // Best-effort: plain-text flatten of rows
        const rows = props.rows ?? [];
        if (Array.isArray(rows) && rows.length > 0) {
          const rowMd: string[] = [];
          rows.forEach(
            (row: { cells?: AnyBlock[] }, rowIdx: number) => {
              const cells = (row.cells ?? []).map((c) => inlineToMarkdown(c));
              rowMd.push(`| ${cells.join(' | ')} |`);
              if (rowIdx === 0) {
                rowMd.push(`| ${cells.map(() => '---').join(' | ')} |`);
              }
            },
          );
          md = rowMd.join('\n');
        } else {
          md = inline;
        }
        break;
      }

      default:
        md = inline ? `${indent}${inline}` : '';
    }

    if (md) lines.push(md);

    const children = block?.children;
    if (Array.isArray(children) && children.length > 0) {
      const childMd = blocksToMarkdown(children, depth + 1);
      if (childMd) lines.push(childMd);
    }

    lastWasNumbered = type === 'numberedListItem';
  }

  return lines.join('\n\n');
}

/* ─── Markdown parsing (markdown → blocks) ────────────────── */

function parseInlineMarkdown(text: string): AnyBlock[] {
  if (!text) return [];
  const segments: AnyBlock[] = [];

  // Regex: **bold**, *italic*, `code`, ~~strike~~, [link](url)
  const pattern =
    /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index);
      if (plain) segments.push({ type: 'text', text: plain, styles: {} });
    }

    const token = match[1];
    if (token.startsWith('***')) {
      segments.push({
        type: 'text',
        text: token.slice(3, -3),
        styles: { bold: true, italic: true },
      });
    } else if (token.startsWith('**')) {
      segments.push({
        type: 'text',
        text: token.slice(2, -2),
        styles: { bold: true },
      });
    } else if (token.startsWith('*')) {
      segments.push({
        type: 'text',
        text: token.slice(1, -1),
        styles: { italic: true },
      });
    } else if (token.startsWith('`')) {
      segments.push({
        type: 'text',
        text: token.slice(1, -1),
        styles: { code: true },
      });
    } else if (token.startsWith('~~')) {
      segments.push({
        type: 'text',
        text: token.slice(2, -2),
        styles: { strike: true },
      });
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        segments.push({
          type: 'link',
          href: linkMatch[2],
          content: [{ type: 'text', text: linkMatch[1], styles: {} }],
        });
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    const tail = text.slice(lastIndex);
    if (tail) segments.push({ type: 'text', text: tail, styles: {} });
  }

  return segments.length > 0 ? segments : [{ type: 'text', text, styles: {} }];
}

function isSpecialLine(line: string): boolean {
  return /^(#{1,6}\s|>\s?|```|---\s*$|\*\*\*\s*$|[-*]\s|\d+\.\s)/.test(line);
}

function markdownToBlocks(md: string): AnyBlock[] {
  const lines = md.split('\n');
  const blocks: AnyBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        type: 'codeBlock',
        props: { language: lang || 'text' },
        content: [{ type: 'text', text: codeLines.join('\n'), styles: {} }],
      });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 3);
      blocks.push({
        type: 'heading',
        props: { level },
        content: parseInlineMarkdown(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Divider
    if (line.trim() === '---' || line.trim() === '***') {
      blocks.push({ type: 'paragraph', content: [{ type: 'text', text: '———', styles: {} }] });
      i++;
      continue;
    }

    // Quote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({
        type: 'quote',
        content: parseInlineMarkdown(quoteLines.join(' ')),
      });
      continue;
    }

    // Checklist item
    const checkMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (checkMatch) {
      blocks.push({
        type: 'checkListItem',
        props: { checked: checkMatch[1].toLowerCase() === 'x' },
        content: parseInlineMarkdown(checkMatch[2]),
      });
      i++;
      continue;
    }

    // Bullet list
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        type: 'bulletListItem',
        content: parseInlineMarkdown(bulletMatch[1]),
      });
      i++;
      continue;
    }

    // Numbered list
    const numberMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberMatch) {
      blocks.push({
        type: 'numberedListItem',
        content: parseInlineMarkdown(numberMatch[1]),
      });
      i++;
      continue;
    }

    // Paragraph — merge consecutive plain lines
    const paragraphLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !isSpecialLine(lines[i])) {
      paragraphLines.push(lines[i]);
      i++;
    }
    blocks.push({
      type: 'paragraph',
      content: parseInlineMarkdown(paragraphLines.join(' ')),
    });
  }

  return blocks;
}

/* ─── EXPORT API ─────────────────────────────────────────── */

/** Export note as plain text (.txt) — strips all formatting. */
export function exportAsTxt(title: string, body: string, bodyVersion?: number): void {
  const text = extractPlainText(body, bodyVersion);
  const content = `${title}\n\n${text}`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, `${sanitizeFilename(title)}.txt`);
}

/** Export note as markdown (.md) by walking the Block tree directly. */
export function exportAsMarkdown(title: string, body: string, bodyVersion?: number): void {
  const blocks = deserializeNoteBody(body, bodyVersion) as AnyBlock[];
  const md = blocksToMarkdown(blocks);
  const content = `# ${title}\n\n${md}`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  triggerDownload(blob, `${sanitizeFilename(title)}.md`);
}

/* Docx helpers ---------------------------------------------- */

function inlineToTextRuns(content: AnyBlock): TextRun[] {
  if (!content) return [new TextRun({ text: '' })];
  if (typeof content === 'string') return [new TextRun({ text: content })];
  if (!Array.isArray(content)) return [new TextRun({ text: '' })];

  const runs: TextRun[] = [];
  for (const item of content) {
    if (item?.type === 'text') {
      const styles = item.styles ?? {};
      runs.push(
        new TextRun({
          text: item.text ?? '',
          bold: !!styles.bold,
          italics: !!styles.italic,
          strike: !!(styles.strike || styles.strikethrough),
          underline: styles.underline ? {} : undefined,
          font: styles.code ? 'Courier New' : undefined,
        }),
      );
    } else if (item?.type === 'link') {
      runs.push(
        new TextRun({
          text: inlineToPlain(item.content),
          style: 'Hyperlink',
          color: '0563C1',
          underline: {},
        }),
      );
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text: '' })];
}

function blocksToDocxParagraphs(blocks: AnyBlock[], depth = 0): Paragraph[] {
  const out: Paragraph[] = [];
  let numberedCounter = 0;
  let lastWasNumbered = false;

  for (const block of blocks) {
    const type = block?.type;
    const props = block?.props ?? {};
    const content = block?.content;
    const runs = inlineToTextRuns(content);
    const indent = { left: 360 * depth };

    if (type !== 'numberedListItem' && lastWasNumbered) {
      numberedCounter = 0;
    }

    switch (type) {
      case 'heading': {
        const level = props.level ?? 1;
        const headingLevel =
          level === 1 ? HeadingLevel.HEADING_1
          : level === 2 ? HeadingLevel.HEADING_2
          :               HeadingLevel.HEADING_3;
        out.push(new Paragraph({ children: runs, heading: headingLevel }));
        break;
      }

      case 'bulletListItem':
        out.push(
          new Paragraph({
            children: runs,
            bullet: { level: depth },
          }),
        );
        break;

      case 'numberedListItem': {
        numberedCounter += 1;
        out.push(
          new Paragraph({
            children: [new TextRun({ text: `${numberedCounter}. ` }), ...runs],
            indent,
          }),
        );
        break;
      }

      case 'checkListItem': {
        const mark = props.checked ? '☑ ' : '☐ ';
        out.push(
          new Paragraph({
            children: [new TextRun({ text: mark }), ...runs],
            indent,
          }),
        );
        break;
      }

      case 'quote':
        out.push(
          new Paragraph({
            children: runs,
            indent: { left: 720 + depth * 360 },
            alignment: AlignmentType.LEFT,
          }),
        );
        break;

      case 'codeBlock': {
        const raw = inlineToPlain(content);
        raw.split('\n').forEach((line) => {
          out.push(
            new Paragraph({
              children: [new TextRun({ text: line, font: 'Courier New', size: 20 })],
              indent,
            }),
          );
        });
        break;
      }

      case 'image': {
        const caption = props.caption ?? '[imagem]';
        const url = props.url ?? props.src ?? '';
        out.push(
          new Paragraph({
            children: [new TextRun({ text: `[${caption}] ${url}`, italics: true })],
            indent,
          }),
        );
        break;
      }

      case 'video':
      case 'embed':
      case 'linkPreview': {
        const url = props.url ?? '';
        out.push(
          new Paragraph({
            children: [new TextRun({ text: url, style: 'Hyperlink', color: '0563C1', underline: {} })],
            indent,
          }),
        );
        break;
      }

      case 'divider':
      case 'horizontalRule':
        out.push(new Paragraph({ children: [new TextRun({ text: '———' })] }));
        break;

      default:
        // Paragraph + fallbacks
        out.push(new Paragraph({ children: runs, indent }));
    }

    // Children recursion
    const children = block?.children;
    if (Array.isArray(children) && children.length > 0) {
      out.push(...blocksToDocxParagraphs(children, depth + 1));
    }

    lastWasNumbered = type === 'numberedListItem';
  }

  return out;
}

/** Export note as Word document (.docx). */
export async function exportAsDocx(
  title: string,
  body: string,
  bodyVersion?: number,
): Promise<void> {
  const blocks = deserializeNoteBody(body, bodyVersion) as AnyBlock[];
  const paragraphs: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: '' }),
    ...blocksToDocxParagraphs(blocks),
  ];

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${sanitizeFilename(title)}.docx`);
}

/** Export note as PDF via browser's native print dialog. */
export function exportAsPdf(title: string, body: string, bodyVersion?: number): void {
  const blocks = deserializeNoteBody(body, bodyVersion) as AnyBlock[];
  const md = blocksToMarkdown(blocks);
  const html = markdownToHtmlBasic(md);

  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    alert('Pop-up bloqueado. Permita pop-ups para exportar como PDF.');
    return;
  }
  const escapedTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  win.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapedTitle}</title>
      <style>
        @page { margin: 2.2cm; }
        body {
          font-family: Georgia, 'Instrument Serif', serif;
          font-size: 12pt;
          line-height: 1.65;
          color: #111;
          max-width: 680px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 { font-size: 32pt; font-weight: 400; line-height: 1.15; margin: 0 0 20pt; }
        h2 { font-size: 22pt; font-weight: 400; margin: 22pt 0 10pt; }
        h3 { font-size: 16pt; font-weight: 600; margin: 18pt 0 8pt; }
        p { margin: 0 0 10pt; }
        ul, ol { margin: 0 0 10pt 24pt; }
        li { margin: 0 0 4pt; }
        blockquote {
          margin: 10pt 0;
          padding-left: 14pt;
          border-left: 3px solid #ccc;
          color: #555;
          font-style: italic;
        }
        pre {
          background: #f6f5ef;
          padding: 10pt 14pt;
          font-family: 'Courier New', monospace;
          font-size: 10pt;
          white-space: pre-wrap;
          page-break-inside: avoid;
        }
        code { font-family: 'Courier New', monospace; font-size: 0.92em; }
        a { color: #0563C1; text-decoration: underline; }
        hr { border: none; border-top: 1px solid #ccc; margin: 18pt 0; }
      </style>
    </head>
    <body>
      <h1>${escapedTitle}</h1>
      ${html}
      <script>
        window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };
      </script>
    </body>
    </html>
  `);
  win.document.close();
}

/** Minimal markdown → HTML for the PDF print view. */
function markdownToHtmlBasic(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let inCode = false;
  const codeBuffer: string[] = [];

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = (s: string) =>
    escape(s)
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  const closeList = () => {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  };

  for (const raw of lines) {
    if (raw.startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code>${escape(codeBuffer.join('\n'))}</code></pre>`);
        codeBuffer.length = 0;
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuffer.push(raw);
      continue;
    }
    if (!raw.trim()) {
      closeList();
      continue;
    }

    const h = raw.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeList();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      continue;
    }

    if (raw.trim() === '---') {
      closeList();
      out.push('<hr>');
      continue;
    }

    if (raw.startsWith('>')) {
      closeList();
      out.push(`<blockquote>${inline(raw.replace(/^>\s?/, ''))}</blockquote>`);
      continue;
    }

    const chk = raw.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (chk) {
      if (inList !== 'ul') { closeList(); out.push('<ul>'); inList = 'ul'; }
      const mark = chk[1].toLowerCase() === 'x' ? '☑' : '☐';
      out.push(`<li>${mark} ${inline(chk[2])}</li>`);
      continue;
    }

    const bullet = raw.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (inList !== 'ul') { closeList(); out.push('<ul>'); inList = 'ul'; }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }

    const num = raw.match(/^\d+\.\s+(.*)$/);
    if (num) {
      if (inList !== 'ol') { closeList(); out.push('<ol>'); inList = 'ol'; }
      out.push(`<li>${inline(num[1])}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${inline(raw)}</p>`);
  }

  closeList();
  if (inCode && codeBuffer.length) {
    out.push(`<pre><code>${escape(codeBuffer.join('\n'))}</code></pre>`);
  }
  return out.join('\n');
}

/* ─── IMPORT API ─────────────────────────────────────────── */

export interface ImportedNote {
  title: string;
  body: string; // serialized JSON — ready to store in note.body with bodyVersion=1
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function deriveTitleFromLine(firstLine: string | undefined, fallback: string): string {
  if (firstLine && firstLine.trim()) {
    return firstLine.replace(/^#+\s*/, '').trim();
  }
  return fallback;
}

/** Split a markdown string at its first H1/H2 heading, if any. */
function splitTitleFromMarkdown(md: string): { title: string; body: string } {
  const lines = md.split('\n');
  // Find first non-empty line
  const firstIdx = lines.findIndex((l) => l.trim());
  if (firstIdx === -1) return { title: '', body: '' };
  const first = lines[firstIdx];
  if (first.startsWith('#')) {
    const title = first.replace(/^#+\s*/, '').trim();
    const rest = lines.slice(firstIdx + 1).join('\n').replace(/^\n+/, '');
    return { title, body: rest };
  }
  return { title: '', body: md };
}

export async function importTxt(file: File): Promise<ImportedNote> {
  const text = await readFileAsText(file);
  const lines = text.split('\n');
  const firstLine = lines[0];
  const title = deriveTitleFromLine(firstLine, file.name.replace(/\.[^.]+$/, ''));
  const bodyText = lines.slice(1).join('\n').replace(/^\n+/, '');
  return { title, body: plainTextToBody(bodyText) };
}

export async function importMarkdown(file: File): Promise<ImportedNote> {
  const md = await readFileAsText(file);
  const split = splitTitleFromMarkdown(md);
  const title = split.title || file.name.replace(/\.[^.]+$/, '');
  return { title, body: markdownToBody(split.body) };
}

export async function importDocx(file: File): Promise<ImportedNote> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  // mammoth's convertToMarkdown is available in recent versions; fall back gracefully
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyMammoth = mammoth as any;
  let md: string;
  if (typeof anyMammoth.convertToMarkdown === 'function') {
    const result = await anyMammoth.convertToMarkdown({ arrayBuffer });
    md = result.value as string;
  } else {
    const result = await mammoth.extractRawText({ arrayBuffer });
    md = result.value;
  }
  const split = splitTitleFromMarkdown(md);
  const title = split.title || file.name.replace(/\.[^.]+$/, '');
  return { title, body: markdownToBody(split.body) };
}

/** Convert plain text to a serialized BlockNote body (version 1). */
export function plainTextToBody(text: string): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p);
  if (paragraphs.length === 0) {
    return serializeNoteBody([] as unknown as Block[]);
  }
  const blocks = paragraphs.map((p) => ({
    type: 'paragraph',
    content: [{ type: 'text', text: p, styles: {} }],
  }));
  return serializeNoteBody(blocks as unknown as Block[]);
}

/** Convert markdown to a serialized BlockNote body via our own parser. */
export function markdownToBody(markdown: string): string {
  const blocks = markdownToBlocks(markdown);
  return serializeNoteBody(blocks as unknown as Block[]);
}
