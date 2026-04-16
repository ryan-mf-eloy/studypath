import { useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { VideoCamera, LinkSimple } from '@phosphor-icons/react';
import { normalizeUrl } from '../../lib/utils';
import { toEmbedUrl, isDirectVideoUrl } from '../../lib/embedProviders';

export const embedBlock = createReactBlockSpec(
  {
    type: 'embed' as const,
    propSchema: {
      url: { default: '' as const },
    },
    content: 'none' as const,
  },
  {
    render: ({ block, editor }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [input, setInput] = useState('');
      const url = block.props.url;
      const embedUrl = url ? toEmbedUrl(url) : null;
      const isVideo = url && isDirectVideoUrl(url);

      function handleSubmit() {
        const trimmed = input.trim();
        if (!trimmed) return;
        const normalized = normalizeUrl(trimmed) ?? trimmed;
        editor.updateBlock(block, { props: { url: normalized } });
      }

      // Empty state — input form
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
              backgroundColor: 'var(--text-04)',
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
              <VideoCamera size={14} />
              Embed
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
              placeholder="Cole uma URL do YouTube, Vimeo ou vídeo direto"
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
                Inserir
              </button>
            </div>
          </div>
        );
      }

      // Rendered iframe or video
      if (embedUrl) {
        return (
          <div
            style={{
              width: '100%',
              position: 'relative',
              paddingBottom: '56.25%',
              backgroundColor: '#000',
            }}
          >
            <iframe
              src={embedUrl}
              title="Vídeo incorporado"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </div>
        );
      }

      if (isVideo) {
        return (
          <video
            src={url}
            controls
            style={{
              width: '100%',
              display: 'block',
              backgroundColor: '#000',
            }}
          />
        );
      }

      // Fallback — unrecognized URL
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            border: '1px solid var(--text-15)',
            color: 'var(--text)',
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          <LinkSimple size={16} style={{ color: 'var(--text-50)' }} />
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {url}
          </span>
        </a>
      );
    },
  },
);
