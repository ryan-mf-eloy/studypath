import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createReactBlockSpec } from '@blocknote/react';
import { LinkSimple, Globe } from '@phosphor-icons/react';
import { LinkPreviewSkeleton } from './LinkPreviewSkeleton';
import { normalizeUrl } from '../../lib/utils';

interface OgData {
  title?: string;
  description?: string;
  image?: string;
  publisher?: string;
  url?: string;
}

/**
 * Cache de metadados OG em memória (persistido no bloco via props).
 */
const ogCache = new Map<string, OgData>();

/**
 * Fetch Open Graph via microlink.io (API pública free tier).
 * CORS-friendly, sem auth.
 */
async function fetchOgData(url: string): Promise<OgData | null> {
  if (ogCache.has(url)) return ogCache.get(url)!;

  try {
    const response = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}&audio=false&video=false&iframe=false`,
    );
    if (!response.ok) return null;
    const json = await response.json();
    if (json.status !== 'success' || !json.data) return null;

    const data: OgData = {
      title: json.data.title,
      description: json.data.description,
      image: json.data.image?.url,
      publisher: json.data.publisher,
      url: json.data.url || url,
    };
    ogCache.set(url, data);
    return data;
  } catch {
    return null;
  }
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const linkPreviewBlock = createReactBlockSpec(
  {
    type: 'linkPreview' as const,
    propSchema: {
      url: { default: '' as const },
      title: { default: '' as const },
      description: { default: '' as const },
      image: { default: '' as const },
      publisher: { default: '' as const },
    },
    content: 'none' as const,
  },
  {
    render: ({ block, editor }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { t } = useTranslation();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [input, setInput] = useState('');
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [loading, setLoading] = useState(false);
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const fetchedRef = useRef<string | null>(null);

      const { url, title, description, image, publisher } = block.props;

      // Lazy fetch if URL is set but metadata is missing
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        if (!url || title || fetchedRef.current === url) return;
        fetchedRef.current = url;
        setLoading(true);
        fetchOgData(url).then((data) => {
          setLoading(false);
          if (data) {
            editor.updateBlock(block, {
              props: {
                url,
                title: data.title ?? '',
                description: data.description ?? '',
                image: data.image ?? '',
                publisher: data.publisher ?? getHostname(url),
              },
            });
          } else {
            // Fallback — just mark as "fetched" so we don't loop
            editor.updateBlock(block, {
              props: {
                url,
                title: getHostname(url),
                description: '',
                image: '',
                publisher: getHostname(url),
              },
            });
          }
        });
      }, [url, title, editor, block]);

      async function handleSubmit() {
        const trimmed = input.trim();
        if (!trimmed) return;
        const normalized = normalizeUrl(trimmed) ?? trimmed;
        editor.updateBlock(block, { props: { url: normalized } });
      }

      // Empty state — URL input
      if (!url) {
        return (
          <div
            style={{
              width: '100%',
              border: '1px dashed var(--text-15)',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--text-50)',
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}
            >
              <Globe size={14} />
              {t('editor.linkPreview')}
            </div>
            <input
              type="url"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={t('editor.pasteUrl')}
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                color: 'var(--text)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--text-15)',
                outline: 'none',
                borderRadius: 0,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleSubmit}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--bg-surface)',
                  background: 'var(--accent-coral, var(--text))',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 0,
                }}
              >
                {t('editor.fetch')}
              </button>
            </div>
          </div>
        );
      }

      if (loading && !title) {
        return <LinkPreviewSkeleton hostname={getHostname(url)} />;
      }

      // Card rendered
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          contentEditable={false}
          style={{
            display: 'flex',
            width: '100%',
            border: '1px solid var(--text-15)',
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            textDecoration: 'none',
            overflow: 'hidden',
            transition: 'border-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--text-30)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--text-15)';
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text)',
                lineHeight: 1.35,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {title || getHostname(url)}
            </div>
            {description && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-50)',
                  lineHeight: 1.45,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {description}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 2,
                fontSize: 11,
                color: 'var(--text-30)',
                letterSpacing: 0.2,
              }}
            >
              <LinkSimple size={11} />
              {publisher || getHostname(url)}
            </div>
          </div>
          {image && (
            <div
              style={{
                width: 140,
                flexShrink: 0,
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderLeft: '1px solid var(--text-08)',
              }}
            />
          )}
        </a>
      );
    },
  },
);
