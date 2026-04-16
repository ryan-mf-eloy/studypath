import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { CaretDown, Check, MagnifyingGlass, Plus, Trash } from '@phosphor-icons/react';
import { usePopoverPosition } from './usePopoverPosition';

interface CategoryOption {
  value: string;
  label: string;
  color?: string;
}

interface CategorySelectProps {
  value: string;
  builtIn: CategoryOption[];
  custom: string[];
  onChange: (next: string) => void;
  /** Chamado quando o usuário clica no trash de uma categoria custom. */
  onDelete?: (value: string) => void | Promise<void>;
  ariaLabel?: string;
  placeholder?: string;
}

/**
 * Dropdown de categoria para focos — built-ins fixos + categorias custom
 * coletadas dinamicamente do roadmap. Tem busca e suporte a criar uma nova
 * categoria via "Criar «texto»" quando nada dá match. Sem ícones.
 */
export function CategorySelect({
  value,
  builtIn,
  custom,
  onChange,
  onDelete,
  ariaLabel,
  placeholder,
}: CategorySelectProps) {
  const { t } = useTranslation();
  const resolvedAriaLabel = ariaLabel ?? t('settings.structure.category');
  const resolvedPlaceholder = placeholder ?? t('settings.structure.categoryPlaceholder');
  const builtInValues = useMemo(() => new Set(builtIn.map((b) => b.value)), [builtIn]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const pos = usePopoverPosition({ open, anchorRef, popoverRef, align: 'start' });

  const currentBuiltIn = builtIn.find((o) => o.value === value);
  const currentLabel = currentBuiltIn?.label ?? value ?? resolvedPlaceholder;
  const currentColor = currentBuiltIn?.color ?? 'var(--text-50)';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all: CategoryOption[] = [
      ...builtIn,
      ...custom
        .filter((c) => !builtIn.some((b) => b.value === c))
        .map((c) => ({ value: c, label: c })),
    ];
    if (!q) return all;
    return all.filter((o) => o.label.toLowerCase().includes(q));
  }, [builtIn, custom, query]);

  const canCreate =
    query.trim().length > 0 &&
    !filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

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
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const commit = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  const createFromQuery = () => {
    const next = query.trim();
    if (!next) return;
    commit(next);
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={resolvedAriaLabel}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center"
        style={{
          gap: 8,
          padding: '8px 12px',
          background: open ? 'var(--text-04)' : 'var(--bg-surface)',
          border: `1px solid ${open ? 'var(--text-30)' : 'var(--text-15)'}`,
          color: 'var(--text)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 500,
          minWidth: 180,
          transition:
            'background-color var(--transition-fast), border-color var(--transition-fast)',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: currentColor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {currentLabel}
        </span>
        <CaretDown
          size={12}
          weight="bold"
          style={{
            color: 'var(--text-30)',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : undefined,
            transition: 'transform var(--transition-fast)',
          }}
        />
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          role="listbox"
          aria-label={resolvedAriaLabel}
          className="sp-popover-enter"
          style={{
            position: 'fixed',
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            visibility: pos ? 'visible' : 'hidden',
            width: 280,
            background: 'var(--bg-surface)',
            border: '1px solid var(--text-15)',
            boxShadow: '0 16px 40px var(--shadow-md), 0 2px 8px var(--shadow-sm)',
            padding: 4,
            zIndex: 500,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            className="flex items-center"
            style={{
              gap: 8,
              padding: '8px 10px',
              borderBottom: '1px solid var(--text-08)',
              margin: -4,
              marginBottom: 4,
            }}
          >
            <MagnifyingGlass size={13} style={{ color: 'var(--text-30)', flexShrink: 0 }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (canCreate) createFromQuery();
                  else if (filtered[0]) commit(filtered[0].value);
                }
              }}
              placeholder={t('settings.structure.searchOrCreate')}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
              }}
            />
          </div>

          <div style={{ maxHeight: 280, overflowY: 'auto', padding: 4 }}>
            {filtered.map((opt) => {
              const selected = opt.value === value;
              const isCustom = !builtInValues.has(opt.value);
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={selected}
                  className="flex items-center sp-category-row"
                  style={{
                    padding: '2px 4px 2px 0',
                    background: 'transparent',
                    transition: 'background-color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--text-04)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <button
                    type="button"
                    onClick={() => commit(opt.value)}
                    className="flex items-center"
                    style={{
                      flex: 1,
                      gap: 10,
                      padding: '8px 10px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 13,
                      color: 'var(--text)',
                      textAlign: 'left',
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: opt.color ?? 'var(--text-30)',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {opt.label}
                    </span>
                    {selected && (
                      <Check size={12} weight="bold" style={{ color: 'var(--accent-coral)' }} />
                    )}
                  </button>
                  {isCustom && onDelete && (
                    <button
                      type="button"
                      aria-label={`${t('common.delete')} ${opt.label}`}
                      title={t('common.delete')}
                      onClick={(e) => {
                        e.stopPropagation();
                        void onDelete(opt.value);
                      }}
                      className="flex items-center justify-center"
                      style={{
                        width: 24,
                        height: 24,
                        padding: 0,
                        marginLeft: 4,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-30)',
                        cursor: 'pointer',
                        flexShrink: 0,
                        opacity: 0.6,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-coral)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.opacity = '0.6';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-30)';
                      }}
                    >
                      <Trash size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && !canCreate && (
              <div
                style={{
                  padding: '14px 10px',
                  textAlign: 'center',
                  fontSize: 11,
                  color: 'var(--text-30)',
                }}
              >
                {t('settings.structure.noCategoriesFound')}
              </div>
            )}

            {canCreate && (
              <button
                type="button"
                onClick={createFromQuery}
                className="flex items-center"
                style={{
                  gap: 10,
                  padding: '10px 10px',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderTop: filtered.length > 0 ? '1px solid var(--text-08)' : 'none',
                  marginTop: filtered.length > 0 ? 4 : 0,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  color: 'var(--text-50)',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-04)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
                }}
              >
                <Plus size={12} weight="bold" style={{ flexShrink: 0 }} />
                <span>
                  <strong style={{ color: 'var(--text)' }}>{t('settings.structure.createNew', { name: query.trim() })}</strong>
                </span>
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
