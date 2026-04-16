import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, Check } from '@phosphor-icons/react';
import { usePopoverPosition } from './usePopoverPosition';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  color?: string;
  description?: string;
}

interface SelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (next: T) => void;
  placeholder?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  fullWidth?: boolean;
  ariaLabel?: string;
}

/**
 * Dropdown customizado alinhado com o design system. Substitui o `<select>`
 * nativo. Suporta ícones, cores e navegação por teclado.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Selecionar…',
  size = 'md',
  disabled = false,
  fullWidth = false,
  ariaLabel,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === value)),
  );
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.value === value);

  const pos = usePopoverPosition({ open, anchorRef, popoverRef, gap: 4, align: 'end' });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (
        (anchorRef.current && target && anchorRef.current.contains(target)) ||
        (popoverRef.current && target && popoverRef.current.contains(target))
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + options.length) % options.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const opt = options[activeIdx];
        if (opt) {
          onChange(opt.value);
          setOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, options, activeIdx, onChange]);

  const padY = size === 'sm' ? 4 : 8;
  const padX = size === 'sm' ? 10 : 12;
  const fontSize = size === 'sm' ? 11 : 13;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return;
          setActiveIdx(Math.max(0, options.findIndex((o) => o.value === value)));
          setOpen((v) => !v);
        }}
        className="flex items-center"
        style={{
          gap: 6,
          padding: `${padY}px ${padX}px`,
          background: open ? 'var(--text-04)' : 'var(--bg-surface)',
          border: `1px solid ${open ? 'var(--text-30)' : 'var(--text-15)'}`,
          color: 'var(--text)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-sans)',
          fontSize,
          fontWeight: 500,
          textAlign: 'left',
          letterSpacing: size === 'sm' ? '0.4px' : 0,
          textTransform: size === 'sm' ? 'uppercase' : 'none',
          width: fullWidth ? '100%' : 'auto',
          minWidth: size === 'sm' ? 110 : 160,
          flexShrink: 0,
          transition:
            'background-color var(--transition-fast), border-color var(--transition-fast)',
        }}
      >
        {current?.icon && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              color: current.color ?? 'var(--text-50)',
              flexShrink: 0,
            }}
          >
            {current.icon}
          </span>
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: current ? 'var(--text)' : 'var(--text-30)',
          }}
        >
          {current?.label ?? placeholder}
        </span>
        <CaretDown
          size={size === 'sm' ? 10 : 12}
          weight="bold"
          style={{
            color: 'var(--text-30)',
            flexShrink: 0,
            transition: 'transform var(--transition-fast)',
            transform: open ? 'rotate(180deg)' : undefined,
          }}
        />
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          role="listbox"
          className="sp-popover-enter"
          style={{
            position: 'fixed',
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            visibility: pos ? 'visible' : 'hidden',
            minWidth: (anchorRef.current?.offsetWidth ?? 0) + 'px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--text-15)',
            boxShadow: '0 16px 40px var(--shadow-md), 0 2px 8px var(--shadow-sm)',
            padding: 4,
            zIndex: 500,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {options.map((opt, idx) => {
            const selected = opt.value === value;
            const active = idx === activeIdx;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex items-center"
                style={{
                  gap: 10,
                  padding: '8px 10px',
                  background: active ? 'var(--text-04)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--text)',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                {opt.icon && (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: opt.color ?? 'var(--text-50)',
                      flexShrink: 0,
                    }}
                  >
                    {opt.icon}
                  </span>
                )}
                <span style={{ flex: 1 }}>
                  <span>{opt.label}</span>
                  {opt.description && (
                    <span
                      style={{
                        display: 'block',
                        fontSize: 11,
                        color: 'var(--text-30)',
                        marginTop: 1,
                      }}
                    >
                      {opt.description}
                    </span>
                  )}
                </span>
                {selected && (
                  <Check size={12} weight="bold" style={{ color: 'var(--accent-coral)' }} />
                )}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
