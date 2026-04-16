import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gear, Download, Upload, Trash, Sparkle, SlidersHorizontal } from '@phosphor-icons/react';
import { exportBackup, importBackup, clearAllData } from '../../lib/backup';
import { confirm } from '../../store/useConfirmStore';
import { useUIStore } from '../../store/useUIStore';

export default function AppMenuButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const openReflectionModal = useUIStore(s => s.openReflectionModal);
  const setActivePage = useUIStore(s => s.setActivePage);

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

  const handleExport = async () => {
    setOpen(false);
    try {
      await exportBackup();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      alert('Não foi possível exportar o backup.');
    }
  };

  const handleImport = () => {
    setOpen(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const ok = await confirm({
        title: t('appMenu.restoreBackup') + '?',
        message: t('settings.data.restoreConfirmMessage'),
        confirmLabel: t('common.restore'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await importBackup(file);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        alert('Arquivo inválido. Verifique se é um backup do StudyPath.');
      }
    };
    input.click();
  };

  const handleClear = async () => {
    setOpen(false);
    const ok = await confirm({
      title: t('appMenu.deleteAllData') + '?',
      message: t('appMenu.deleteAllData'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await clearAllData();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      alert('Não foi possível apagar os dados.');
    }
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={t('topbar.appSettings')}
        aria-expanded={open}
        title={t('topbar.appSettings')}
        className="flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          padding: 0,
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
        <Gear size={17} weight="regular" />
      </button>

      {open && (
        <div
          role="menu"
          className="sp-popover-enter"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 10,
            width: 240,
            background: 'var(--bg-surface)',
            border: '1px solid var(--text-15)',
            boxShadow: '0 16px 40px var(--shadow-md), 0 2px 8px var(--shadow-sm)',
            padding: '8px 0',
            zIndex: 220,
            display: 'flex',
            flexDirection: 'column',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '6px 16px 8px',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
              color: 'var(--text-30)',
            }}
          >
            Roadmap
          </div>

          <MenuRow
            icon={<SlidersHorizontal size={14} />}
            label={t('appMenu.configureRoadmap')}
            onClick={() => {
              setOpen(false);
              setActivePage('settings');
            }}
          />

          <div
            style={{
              marginTop: 6,
              marginBottom: 4,
              borderTop: '1px solid var(--text-08)',
            }}
          />

          <div
            style={{
              padding: '6px 16px 8px',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
              color: 'var(--text-30)',
            }}
          >
            Jornal
          </div>

          <MenuRow
            icon={<Sparkle size={14} />}
            label={t('appMenu.weeklyReflection')}
            onClick={() => {
              setOpen(false);
              openReflectionModal();
            }}
          />

          <div
            style={{
              marginTop: 6,
              marginBottom: 4,
              borderTop: '1px solid var(--text-08)',
            }}
          />

          <div
            style={{
              padding: '6px 16px 8px',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
              color: 'var(--text-30)',
            }}
          >
            Dados
          </div>

          <MenuRow
            icon={<Download size={14} />}
            label={t('appMenu.exportBackup')}
            onClick={handleExport}
          />
          <MenuRow
            icon={<Upload size={14} />}
            label={t('appMenu.restoreBackup')}
            onClick={handleImport}
          />

          <div
            style={{
              marginTop: 6,
              marginBottom: 4,
              borderTop: '1px solid var(--text-08)',
            }}
          />

          <MenuRow
            icon={<Trash size={14} />}
            label={t('appMenu.deleteAllData')}
            onClick={handleClear}
            destructive
          />
        </div>
      )}
    </div>
  );
}

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

function MenuRow({ icon, label, onClick, destructive = false }: MenuRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className="flex items-center"
      style={{
        width: '100%',
        padding: '9px 16px',
        gap: 12,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        color: destructive ? 'var(--text-50)' : 'var(--text)',
        textAlign: 'left',
        transition:
          'background-color var(--transition-fast), color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = destructive
          ? 'var(--focus-main-bg)'
          : 'var(--text-04)';
        (e.currentTarget as HTMLButtonElement).style.color = destructive
          ? 'var(--accent-coral)'
          : 'var(--text)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = destructive
          ? 'var(--text-50)'
          : 'var(--text)';
      }}
    >
      <span style={{ color: 'var(--text-30)', display: 'flex', alignItems: 'center' }}>
        {icon}
      </span>
      {label}
    </button>
  );
}
