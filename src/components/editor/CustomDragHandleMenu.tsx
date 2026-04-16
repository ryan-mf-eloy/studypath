import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DragHandleMenu,
  RemoveBlockItem,
  BlockColorsItem,
  useBlockNoteEditor,
  useComponentsContext,
} from '@blocknote/react';
import {
  Trash,
  Copy,
  ArrowUp,
  ArrowDown,
  Palette,
  ArrowSquareOut,
  ClipboardText,
  CopySimple,
  TextT,
  TextHOne,
  TextHTwo,
  TextHThree,
  ListBullets,
  ListNumbers,
  ListChecks,
  Quotes,
  Code,
} from '@phosphor-icons/react';

/* eslint-disable @typescript-eslint/no-explicit-any */

const TEXT_TYPES = new Set([
  'paragraph', 'heading', 'bulletListItem',
  'numberedListItem', 'checkListItem', 'quote',
]);

function findTargetBlock(editor: any): any {
  const sm = document.querySelector('.bn-side-menu');
  if (!sm) return null;
  const smRect = sm.getBoundingClientRect();
  const blocks = document.querySelectorAll('[data-node-type="blockOuter"]');
  let bestEl: Element | null = null;
  let bestDist = Infinity;
  for (const b of blocks) {
    const d = Math.abs(b.getBoundingClientRect().top - smRect.top);
    if (d < bestDist) { bestDist = d; bestEl = b; }
  }
  if (!bestEl || bestDist > 100) return null;
  const id = bestEl.getAttribute('data-id');
  if (!id) return null;
  try { return editor.getBlock(id); } catch { return null; }
}

export default function CustomDragHandleMenu(props: any) {
  return (
    <DragHandleMenu {...props}>
      <MenuItems />
    </DragHandleMenu>
  );
}

function MenuItems() {
  const { t } = useTranslation();
  const editor = useBlockNoteEditor() as any;
  const Components = useComponentsContext();

  const sm = document.querySelector('.bn-side-menu');
  const blockType = sm?.getAttribute('data-block-type') || '';
  const isText = TEXT_TYPES.has(blockType);
  const isCode = blockType === 'codeBlock';
  const canConvert = isText || isCode;
  const isLink = blockType === 'linkPreview' || blockType === 'embed';

  const getBlock = useCallback(() => findTargetBlock(editor), [editor]);

  const turnInto = useCallback((type: string, p?: Record<string, unknown>) => {
    const b = getBlock(); if (!b) return;
    try { editor.updateBlock(b, { type, props: p ?? {} } as any); } catch {}
  }, [editor, getBlock]);

  const duplicate = useCallback(() => {
    const b = getBlock(); if (!b) return;
    const c = JSON.parse(JSON.stringify(b));
    const rm = (n: any) => { delete n.id; n.children?.forEach(rm); };
    rm(c);
    editor.insertBlocks([c], b, 'after');
  }, [editor, getBlock]);

  const moveUp = useCallback(() => {
    const b = getBlock(); if (b) try { editor.moveBlockUp(b); } catch {}
  }, [editor, getBlock]);

  const moveDown = useCallback(() => {
    const b = getBlock(); if (b) try { editor.moveBlockDown(b); } catch {}
  }, [editor, getBlock]);

  const openUrl = useCallback(() => {
    const u = getBlock()?.props?.url;
    if (u) window.open(u, '_blank', 'noopener,noreferrer');
  }, [getBlock]);

  const copyUrl = useCallback(() => {
    const u = getBlock()?.props?.url;
    if (u) navigator.clipboard.writeText(u).catch(() => {});
  }, [getBlock]);

  const copyCode = useCallback(() => {
    const b = getBlock(); if (!b?.content) return;
    const text = Array.isArray(b.content)
      ? b.content.map((n: any) => n?.text ?? '').join('') : '';
    navigator.clipboard.writeText(text).catch(() => {});
  }, [getBlock]);

  if (!Components) return null;

  const Item = Components.Generic.Menu.Item;
  const Div = Components.Generic.Menu.Divider;
  const Label = Components.Generic.Menu.Label;

  const level = sm?.getAttribute('data-level');

  return (
    <>
      {/* Link / Embed */}
      {isLink && (<>
        <Item onClick={openUrl}><Row icon={ArrowSquareOut} label={t('editor.openLink')} /></Item>
        <Item onClick={copyUrl}><Row icon={ClipboardText} label={t('editor.copyUrl')} /></Item>
        <Div />
      </>)}

      {/* Code block */}
      {isCode && (<>
        <Item onClick={copyCode}><Row icon={CopySimple} label={t('editor.copyCode')} /></Item>
        <Div />
      </>)}

      {/* Turn into (text + code) */}
      {canConvert && (<>
        <Label>{t('editor.turnInto.label')}</Label>
        {[
          { l: t('editor.turnInto.paragraph'), ty: 'paragraph', Icon: TextT, on: blockType === 'paragraph' },
          { l: t('editor.turnInto.heading1'), ty: 'heading', p: { level: 1 }, Icon: TextHOne, on: blockType === 'heading' && level === '1' },
          { l: t('editor.turnInto.heading2'), ty: 'heading', p: { level: 2 }, Icon: TextHTwo, on: blockType === 'heading' && level === '2' },
          { l: t('editor.turnInto.heading3'), ty: 'heading', p: { level: 3 }, Icon: TextHThree, on: blockType === 'heading' && level === '3' },
          { l: t('editor.turnInto.bulletList'), ty: 'bulletListItem', Icon: ListBullets, on: blockType === 'bulletListItem' },
          { l: t('editor.turnInto.numberedList'), ty: 'numberedListItem', Icon: ListNumbers, on: blockType === 'numberedListItem' },
          { l: t('editor.turnInto.checkList'), ty: 'checkListItem', Icon: ListChecks, on: blockType === 'checkListItem' },
          { l: t('editor.turnInto.quote'), ty: 'quote', Icon: Quotes, on: blockType === 'quote' },
          { l: t('editor.turnInto.codeBlock'), ty: 'codeBlock', Icon: Code, on: blockType === 'codeBlock' },
        ].map((it) => (
          <Item key={`${it.ty}-${(it as any).p?.level ?? ''}`} onClick={() => turnInto(it.ty, (it as any).p)}>
            <Row icon={it.Icon} label={it.l} muted={it.on} />
          </Item>
        ))}
        <Div />
      </>)}

      {/* Colors (text only) */}
      {isText && (<>
        <BlockColorsItem><Row icon={Palette} label={t('editor.colors')} /></BlockColorsItem>
        <Div />
      </>)}

      {/* Universal */}
      <Item onClick={duplicate}><Row icon={Copy} label={t('editor.duplicate')} shortcut="⌘D" /></Item>
      <Item onClick={moveUp}><Row icon={ArrowUp} label={t('editor.moveUp')} /></Item>
      <Item onClick={moveDown}><Row icon={ArrowDown} label={t('editor.moveDown')} /></Item>

      <Div />
      <RemoveBlockItem><Row icon={Trash} label={t('common.delete')} shortcut="Del" destructive /></RemoveBlockItem>
    </>
  );
}

function Row({ icon: Icon, label, shortcut, muted, destructive }: {
  icon: typeof Trash; label: string; shortcut?: string; muted?: boolean; destructive?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
      opacity: muted ? 0.4 : 1,
      color: destructive ? 'var(--accent-coral)' : undefined,
    }}>
      <Icon size={15} weight={muted ? 'bold' : 'regular'} />
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && (
        <span style={{ fontSize: 11, color: 'var(--text-30)', fontFamily: 'var(--font-sans)' }}>
          {shortcut}
        </span>
      )}
    </div>
  );
}
