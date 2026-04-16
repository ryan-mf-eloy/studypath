import { useRef, useEffect, useCallback } from 'react';
import type { Block, BlockNoteEditor } from '@blocknote/core';
import { serializeNoteBody } from '../../lib/noteBodyMigration';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEditor = BlockNoteEditor<any, any, any>;

interface UseAutoSaveOptions {
  editor: AnyEditor | null;
  noteId: string | null;
  onSave: (noteId: string, body: string) => void;
  delay?: number;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

/**
 * Hook de auto-save debounced para o editor BlockNote.
 * Retorna o status atual do save e uma funcao de flush manual.
 */
export function useAutoSave({ editor, noteId, onSave, delay = 800 }: UseAutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<SaveStatus>('idle');
  const onSaveRef = useRef(onSave);
  const noteIdRef = useRef(noteId);

  // Manter refs atualizadas
  onSaveRef.current = onSave;
  noteIdRef.current = noteId;

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (editor && noteIdRef.current) {
      const blocks = editor.document as Block[];
      const body = serializeNoteBody(blocks);
      onSaveRef.current(noteIdRef.current, body);
      statusRef.current = 'saved';
    }
  }, [editor]);

  useEffect(() => {
    if (!editor || !noteId) return;

    const handleChange = () => {
      statusRef.current = 'saving';

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        if (noteIdRef.current) {
          const blocks = editor.document as Block[];
          const body = serializeNoteBody(blocks);
          onSaveRef.current(noteIdRef.current, body);
          statusRef.current = 'saved';
        }
        timerRef.current = null;
      }, delay);
    };

    editor.onChange(handleChange);

    return () => {
      // Flush ao desmontar
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        if (noteIdRef.current) {
          const blocks = editor.document as Block[];
          const body = serializeNoteBody(blocks);
          onSaveRef.current(noteIdRef.current, body);
        }
      }
    };
  }, [editor, noteId, delay]);

  // Cmd+S handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        flush();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flush]);

  return { flush };
}
