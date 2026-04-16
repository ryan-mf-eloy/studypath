import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { MagnifyingGlass, ArrowCounterClockwise } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { ICONS, ICON_KEYS } from '../../lib/iconRegistry';
import { BRAND_COLORS } from './ColorPicker';
import { usePopoverPosition } from './usePopoverPosition';

interface AppearanceButtonProps {
  /** Currently selected icon key (from iconRegistry). Undefined → fallback. */
  icon?: string;
  /** Currently selected color hex. Undefined → fallback. */
  color?: string;
  /** Icon component to show when `icon` is undefined. */
  fallbackIcon: Icon;
  /** Color to use when `color` is undefined. */
  fallbackColor: string;
  /** Render size of the main glyph. */
  size?: number;
  onChangeIcon: (next: string | undefined) => void;
  onChangeColor: (next: string | undefined) => void;
  ariaLabel?: string;
}

/**
 * Botão único que exibe o ícone resolvido em sua cor atual e abre um popover
 * com grade de ícones + paleta de cores + botão de "restaurar padrão". Mesmo
 * pattern dos emojis das notas — clica direto no ícone pra editar.
 */
export default function AppearanceButton({
  icon,
  color,
  fallbackIcon: FallbackIcon,
  fallbackColor,
  size = 28,
  onChangeIcon,
  onChangeColor,
  ariaLabel,
}: AppearanceButtonProps) {
  const { t } = useTranslation();
  const resolvedAriaLabel = ariaLabel ?? t('appearance.title');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const pos = usePopoverPosition({ open, anchorRef, popoverRef });

  const ResolvedIcon = icon && ICONS[icon] ? ICONS[icon] : FallbackIcon;
  const resolvedColor = color ?? fallbackColor;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_KEYS;
    return ICON_KEYS.filter((k) => k.toLowerCase().includes(q));
  }, [query]);

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

  const restoreDefaults = () => {
    onChangeIcon(undefined);
    onChangeColor(undefined);
    setQuery('');
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={resolvedAriaLabel}
        title={ariaLabel}
        className="flex items-center justify-center"
        style={{
          width: size + 16,
          height: size + 16,
          flexShrink: 0,
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: resolvedColor,
          cursor: 'pointer',
          borderRadius: 6,
          transition: 'background-color var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-04)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
        }}
      >
        <ResolvedIcon size={size} weight="regular" />
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={resolvedAriaLabel}
          className="sp-popover-enter"
          style={{
            position: 'fixed',
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            visibility: pos ? 'visible' : 'hidden',
            width: 340,
            background: 'var(--bg-surface)',
            border: '1px solid var(--text-15)',
            boxShadow: '0 16px 40px var(--shadow-md), 0 2px 8px var(--shadow-sm)',
            zIndex: 500,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Color palette */}
          <div
            style={{
              padding: '12px 12px 10px',
              borderBottom: '1px solid var(--text-08)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: 'var(--text-30)',
                marginBottom: 8,
              }}
            >
              {t('colorPicker.color')}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 6,
              }}
            >
              {BRAND_COLORS.map((hex) => {
                const isActive = hex === color;
                return (
                  <button
                    key={hex}
                    type="button"
                    aria-label={hex}
                    title={hex}
                    onClick={() => onChangeColor(hex)}
                    style={{
                      width: 28,
                      height: 28,
                      padding: 0,
                      borderRadius: '50%',
                      background: hex,
                      border: `2px solid ${isActive ? 'var(--text)' : 'transparent'}`,
                      outline: '1px solid var(--text-15)',
                      outlineOffset: -2,
                      cursor: 'pointer',
                      transition: 'transform var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Icon search */}
          <div
            className="flex items-center"
            style={{
              gap: 8,
              padding: '10px 12px',
              borderBottom: '1px solid var(--text-08)',
            }}
          >
            <MagnifyingGlass size={13} style={{ color: 'var(--text-30)', flexShrink: 0 }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('iconPicker.searchPlaceholder')}
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

          {/* Icon grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 2,
              maxHeight: 260,
              overflowY: 'auto',
              padding: 10,
            }}
          >
            {filtered.map((key) => {
              const IconComp = ICONS[key];
              const isActive = key === icon;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={key}
                  title={key}
                  onClick={() => onChangeIcon(key)}
                  className="flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    padding: 0,
                    background: 'transparent',
                    border: 'none',
                    color: isActive ? resolvedColor : 'var(--text-50)',
                    cursor: 'pointer',
                    transition: 'color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
                    }
                  }}
                >
                  <IconComp size={21} weight="regular" />
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div
              style={{
                padding: '14px 10px',
                textAlign: 'center',
                fontSize: 11,
                color: 'var(--text-30)',
              }}
            >
              {t('iconPicker.empty')}
            </div>
          )}

          {/* Footer */}
          {(icon || color) && (
            <button
              type="button"
              onClick={restoreDefaults}
              className="flex items-center"
              style={{
                gap: 6,
                padding: '10px 14px',
                borderTop: '1px solid var(--text-08)',
                background: 'transparent',
                border: 'none',
                borderTopWidth: 1,
                borderTopStyle: 'solid',
                borderTopColor: 'var(--text-08)',
                color: 'var(--text-50)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                textAlign: 'left',
                transition: 'color var(--transition-fast), background-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-coral)';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-04)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              <ArrowCounterClockwise size={11} weight="bold" />
              {t('appearance.restoreDefault')}
            </button>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
