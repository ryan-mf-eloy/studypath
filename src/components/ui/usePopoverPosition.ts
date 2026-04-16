import { useLayoutEffect, useState } from 'react';

interface Rect {
  top: number;
  left: number;
}

interface Options {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  popoverRef: React.RefObject<HTMLElement | null>;
  gap?: number;
  align?: 'start' | 'end';
}

/**
 * Posiciona um popover fora do fluxo (portal) a partir do trigger. Flipa
 * automaticamente pra cima/esquerda quando estouraria a viewport e reposiciona
 * em scroll/resize enquanto estiver aberto.
 */
export function usePopoverPosition({
  open,
  anchorRef,
  popoverRef,
  gap = 6,
  align = 'start',
}: Options): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const compute = () => {
      const a = anchor.getBoundingClientRect();
      const p = popover.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 8;

      // Vertical: below by default, flip above if overflow.
      let top = a.bottom + gap;
      if (top + p.height > vh - margin) {
        const flipped = a.top - gap - p.height;
        if (flipped >= margin) top = flipped;
        else top = Math.max(margin, vh - p.height - margin);
      }

      // Horizontal: align with trigger edge, clamp inside viewport.
      let left = align === 'end' ? a.right - p.width : a.left;
      if (left + p.width > vw - margin) left = vw - p.width - margin;
      if (left < margin) left = margin;

      setRect({ top, left });
    };

    compute();

    const onScroll = () => compute();
    const onResize = () => compute();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, anchorRef, popoverRef, gap, align]);

  return rect;
}
