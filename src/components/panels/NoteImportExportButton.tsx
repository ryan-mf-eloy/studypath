import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Upload,
  FileText,
  FileDoc,
  FilePdf,
  FileMd,
} from '@phosphor-icons/react';

interface MenuItemConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface NoteImportExportButtonProps {
  onExportTxt: () => void;
  onExportMarkdown: () => void;
  onExportDocx: () => void;
  onExportPdf: () => void;
  onImport: (accept: string, kind: 'txt' | 'md' | 'docx') => void;
}

export default function NoteImportExportButton({
  onExportTxt,
  onExportMarkdown,
  onExportDocx,
  onExportPdf,
  onImport,
}: NoteImportExportButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const exportItems: MenuItemConfig[] = [
    { key: 'txt',  label: t('notes.formatTxt'),      icon: <FileText size={14} />, onClick: run(onExportTxt) },
    { key: 'md',   label: t('notes.formatMarkdown'), icon: <FileMd size={14} />,   onClick: run(onExportMarkdown) },
    { key: 'docx', label: t('notes.formatWord'),     icon: <FileDoc size={14} />,  onClick: run(onExportDocx) },
    { key: 'pdf',  label: t('notes.formatPdf'),      icon: <FilePdf size={14} />,  onClick: run(onExportPdf) },
  ];

  const importItems: MenuItemConfig[] = [
    { key: 'txt',  label: t('notes.formatTxt'),      icon: <FileText size={14} />, onClick: run(() => onImport('.txt', 'txt')) },
    { key: 'md',   label: t('notes.formatMarkdown'), icon: <FileMd size={14} />,   onClick: run(() => onImport('.md,.markdown', 'md')) },
    { key: 'docx', label: t('notes.formatWord'),     icon: <FileDoc size={14} />,  onClick: run(() => onImport('.docx', 'docx')) },
  ];

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={t('notes.importExportAria')}
        aria-expanded={open}
        title={t('notes.importExportTitle')}
        className="flex items-center justify-center"
        style={{
          padding: 4,
          color: open ? 'var(--text)' : 'var(--text-50)',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
        }}
        onMouseEnter={(e) => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
        }}
        onMouseLeave={(e) => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
        }}
      >
        <Download size={18} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('notes.importExportAria')}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 10,
            width: 240,
            background: 'var(--bg-surface)',
            border: '1px solid var(--text-15)',
            boxShadow: '0 16px 40px var(--shadow-md), 0 2px 8px var(--shadow-sm)',
            padding: '14px 16px 16px',
            zIndex: 210,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Group
            label={t('notes.exportSection')}
            labelIcon={<Download size={11} />}
            items={exportItems}
          />
          <Group
            label={t('notes.importSection')}
            labelIcon={<Upload size={11} />}
            items={importItems}
          />
        </div>
      )}
    </div>
  );
}

interface GroupProps {
  label: string;
  labelIcon: React.ReactNode;
  items: MenuItemConfig[];
}

function Group({ label, labelIcon, items }: GroupProps) {
  return (
    <div>
      <div
        className="flex items-center"
        style={{
          gap: 6,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '1.1px',
          textTransform: 'uppercase',
          color: 'var(--text-30)',
          marginBottom: 6,
        }}
      >
        {labelIcon}
        {label}
      </div>

      <div className="flex flex-col" style={{ gap: 1 }}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            onClick={item.onClick}
            className="flex items-center"
            style={{
              gap: 10,
              padding: '8px 8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--text)',
              textAlign: 'left',
              width: '100%',
              transition: 'background-color var(--transition-fast), color var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-04)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ color: 'var(--text-30)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
