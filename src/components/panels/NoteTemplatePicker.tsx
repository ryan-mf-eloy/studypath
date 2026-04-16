import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { NOTE_TEMPLATES, type NoteTemplate } from '../../data/noteTemplates';

interface NoteTemplatePickerProps {
  open: boolean;
  onSelect: (template: NoteTemplate) => void;
  onClose: () => void;
}

export default function NoteTemplatePicker({
  open,
  onSelect,
  onClose,
}: NoteTemplatePickerProps) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('notes.templateChooseLabel')}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 480,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        backgroundColor: 'var(--bg-backdrop)',
        animation: 'sp-confirm-backdrop-in 180ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 580,
          background: 'var(--bg-surface)',
          border: '1px solid var(--text-15)',
          boxShadow: '0 24px 60px var(--shadow-lg), 0 4px 12px var(--shadow-md)',
          padding: '24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          animation: 'sp-confirm-modal-in 260ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="flex items-center" style={{ gap: 12 }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              color: 'var(--text)',
              margin: 0,
              lineHeight: 1.2,
              flex: 1,
            }}
          >
            {t('notes.newNote')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              background: 'var(--text-08)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-50)',
            }}
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div
          style={{
            fontSize: 12,
            color: 'var(--text-50)',
            marginTop: -14,
          }}
        >
          {t('notes.templateChooseHint')}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          {NOTE_TEMPLATES.map((template) => {
            const TemplateIcon = template.Icon;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelect(template)}
                className="flex items-start"
                style={{
                  gap: 14,
                  padding: '16px 16px',
                  border: '1px solid var(--text-15)',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition:
                    'border-color var(--transition-fast), background-color var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text)';
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-04)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-15)';
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 34,
                    height: 34,
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--text-04)',
                    border: `1px solid ${template.color}33`,
                    color: template.color,
                    marginTop: 1,
                  }}
                >
                  <TemplateIcon size={17} weight="regular" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text)',
                      lineHeight: 1.3,
                    }}
                  >
                    {t(template.nameKey)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-50)',
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {t(template.descriptionKey)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
