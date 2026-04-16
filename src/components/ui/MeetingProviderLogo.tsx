import type { MeetingProvider } from '../../types';
import googleMeetIcon from 'simple-icons/icons/googlemeet.svg?raw';
import zoomIcon from 'simple-icons/icons/zoom.svg?raw';
import discordIcon from 'simple-icons/icons/discord.svg?raw';

interface Props {
  provider: MeetingProvider;
  size?: number;
  ariaLabel?: string;
}

/**
 * Brand-colored SVG logos for supported meeting providers.
 *
 * Google Meet, Zoom, and Discord use the official monochrome path data from
 * the CC0-licensed simple-icons project, filled with each brand's official
 * hex color. Microsoft Teams and Slack are not in simple-icons (both brands
 * excluded by request) — we use brand-colored square chips with a neutral
 * mark so we never reproduce their trademarked logos.
 */
export default function MeetingProviderLogo({ provider, size = 16, ariaLabel }: Props) {
  const label = ariaLabel;
  const commonWrap: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    flexShrink: 0,
    lineHeight: 0,
  };

  switch (provider) {
    case 'google-meet':
      return (
        <SimpleIcon
          raw={googleMeetIcon}
          color="#00897B"
          size={size}
          title={label ?? 'Google Meet'}
        />
      );
    case 'zoom':
      return (
        <SimpleIcon
          raw={zoomIcon}
          color="#0B5CFF"
          size={size}
          title={label ?? 'Zoom'}
        />
      );
    case 'discord':
      return (
        <SimpleIcon
          raw={discordIcon}
          color="#5865F2"
          size={size}
          title={label ?? 'Discord'}
        />
      );

    // Microsoft Teams and Slack: brand-colored chip with a neutral glyph.
    // We don't reproduce the official marks — those brands ask third-party
    // icon libraries not to redistribute their logos.
    case 'teams':
      return (
        <span
          role={label ? 'img' : undefined}
          aria-label={label ?? 'Microsoft Teams'}
          style={{
            ...commonWrap,
            borderRadius: Math.round(size * 0.22),
            background: '#4B53BC',
            color: '#FFFFFF',
            fontSize: Math.round(size * 0.65),
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
          }}
        >
          T
        </span>
      );
    case 'slack':
      return (
        <span
          role={label ? 'img' : undefined}
          aria-label={label ?? 'Slack'}
          style={{
            ...commonWrap,
            borderRadius: Math.round(size * 0.22),
            background: '#4A154B',
            color: '#FFFFFF',
            fontSize: Math.round(size * 0.55),
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
          }}
        >
          S
        </span>
      );

    case 'other':
    default:
      return (
        <span
          role={label ? 'img' : undefined}
          aria-label={label ?? 'Link'}
          style={{
            ...commonWrap,
            borderRadius: Math.round(size * 0.22),
            background: 'var(--text-08)',
            color: 'var(--text-50)',
            fontSize: Math.round(size * 0.55),
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
          }}
        >
          ↗
        </span>
      );
  }
}

/* ─── simple-icons renderer ─────────────────────────────────────── */

interface SimpleIconProps {
  raw: string;
  color: string;
  size: number;
  title: string;
}

/**
 * Renders a simple-icons SVG string with a brand color. We inject the raw
 * SVG markup via dangerouslySetInnerHTML on an inline span and size it via
 * CSS so React doesn't have to parse the SVG.
 *
 * The CSS rule `svg { fill: currentColor }` in the parent span takes care of
 * the single-path color — simple-icons ships each icon as one untinted path.
 */
function SimpleIcon({ raw, color, size, title }: SimpleIconProps) {
  // Replace the simple-icons <title> with our localized one and force the
  // rendered size via width/height attributes on the root <svg>.
  const svg = raw
    .replace(/<title>.*?<\/title>/, `<title>${escapeXml(title)}</title>`)
    .replace(
      /^<svg /,
      `<svg width="${size}" height="${size}" style="display:block;fill:currentColor" `,
    );
  return (
    <span
      aria-hidden={false}
      role="img"
      aria-label={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        color,
        flexShrink: 0,
        lineHeight: 0,
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
