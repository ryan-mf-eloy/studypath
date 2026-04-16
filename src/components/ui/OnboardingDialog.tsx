import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkle,
  MagnifyingGlass,
  Brain,
  Flame,
  ArrowRight,
} from '@phosphor-icons/react';

const STORAGE_KEY = 'studypath-onboarding-seen';

interface Step {
  title: string;
  body: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: 'Bem-vindo ao StudyPath',
    body:
      'Seu parceiro pessoal de estudos. 15 meses de roadmap estruturado com notas ricas, revisão espaçada e sessões cronometradas — tudo salvo só no seu navegador.',
    icon: <Sparkle size={22} weight="regular" style={{ color: 'var(--accent-coral)' }} />,
  },
  {
    title: 'Busca rápida',
    body:
      'Pressione ⌘K (ou Ctrl+K) pra procurar qualquer tópico, nota, matéria, marco ou mês. Use ? pra ver todos os atalhos.',
    icon: <MagnifyingGlass size={22} weight="regular" style={{ color: 'var(--accent-blue)' }} />,
  },
  {
    title: 'Revisão espaçada',
    body:
      'Toda vez que você marca um tópico, o app agenda uma revisão em 3 dias, depois 7, 21, 60, 180 — assim o que você aprende realmente fica.',
    icon: <Brain size={22} weight="regular" style={{ color: 'var(--accent-coral)' }} />,
  },
  {
    title: 'Streak e hábito',
    body:
      'Estude um pouco todo dia e mantenha seu streak aceso 🔥. A constância vence talento em 15 meses.',
    icon: <Flame size={22} weight="fill" style={{ color: 'var(--accent-coral)' }} />,
  },
];

export default function OnboardingDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        // Small delay to avoid flash on very first paint
        const t = setTimeout(() => setOpen(true), 400);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bem-vindo ao StudyPath"
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 550,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        backgroundColor: 'var(--bg-backdrop)',
        animation: 'sp-confirm-backdrop-in 200ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--bg-surface)',
          border: '1px solid var(--text-15)',
          boxShadow: '0 24px 60px var(--shadow-lg), 0 4px 12px var(--shadow-md)',
          padding: '32px 32px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          animation: 'sp-confirm-modal-in 300ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 46,
            height: 46,
            border: '1px solid var(--text-15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {current.icon}
        </div>

        {/* Title + body */}
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 26,
              color: 'var(--text)',
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            {current.title}
          </h2>
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-50)',
              lineHeight: 1.6,
              margin: '12px 0 0',
            }}
          >
            {current.body}
          </p>
        </div>

        {/* Footer: step indicators + button */}
        <div
          className="flex items-center"
          style={{
            gap: 14,
            marginTop: 8,
            paddingTop: 16,
            borderTop: '1px solid var(--text-08)',
          }}
        >
          <div className="flex items-center" style={{ gap: 5 }}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                aria-hidden
                style={{
                  width: i === step ? 16 : 6,
                  height: 6,
                  backgroundColor:
                    i === step ? 'var(--text)' : 'var(--text-15)',
                  transition:
                    'width var(--transition-base), background-color var(--transition-base)',
                }}
              />
            ))}
          </div>

          {!isLast ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center"
              style={{
                marginLeft: 'auto',
                gap: 8,
                padding: '10px 18px',
                border: '1px solid var(--text)',
                background: 'var(--text)',
                color: 'var(--bg-surface)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Próximo
              <ArrowRight size={13} weight="bold" />
            </button>
          ) : (
            <button
              type="button"
              onClick={close}
              className="flex items-center"
              style={{
                marginLeft: 'auto',
                gap: 8,
                padding: '10px 18px',
                border: '1px solid var(--accent-coral)',
                background: 'var(--accent-coral)',
                color: '#FFFFFF',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Começar
              <ArrowRight size={13} weight="bold" />
            </button>
          )}

          <button
            type="button"
            onClick={close}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--text-30)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Pular
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
