interface LogoProps {
  size?: number;
  monochrome?: boolean;
}

/* ── Anthropic — Claude asterisk mark ─────────────────────── */
export function AnthropicLogo({ size = 20, monochrome }: LogoProps) {
  const color = monochrome ? 'currentColor' : '#CC785C';
  return (
    <svg width={size} height={size} viewBox="4 4 32 32" fill="none">
      <g stroke={color} strokeWidth="3.2" strokeLinecap="round">
        <line x1="20" y1="7" x2="20" y2="33" />
        <line x1="7" y1="20" x2="33" y2="20" />
        <line x1="10.8" y1="10.8" x2="29.2" y2="29.2" />
        <line x1="29.2" y1="10.8" x2="10.8" y2="29.2" />
      </g>
    </svg>
  );
}

/* ── OpenAI — interwoven knot mark ─────────────────────────── */
export function OpenAILogo({ size = 20, monochrome }: LogoProps) {
  const color = monochrome ? 'currentColor' : '#0A0A0A';
  return (
    <svg width={size} height={size} viewBox="-2 -2 28 28" fill={color}>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.182a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .511 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.998-2.9 6.056 6.056 0 0 0-.748-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.08 4.779-2.758a.78.78 0 0 0 .392-.681v-6.737l2.02 1.168a.07.07 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.493zM3.602 18.31a4.47 4.47 0 0 1-.535-3.014l.142.086 4.783 2.758a.77.77 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.499 4.499 0 0 1-6.138-1.64zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.814 3.354-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.596 3.856-5.833-3.388 2.016-1.164a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.104v-5.677a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.41 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.499 4.499 0 0 1 6.68 4.66zM8.307 12.863l-2.02-1.164a.08.08 0 0 1-.039-.057V6.074A4.499 4.499 0 0 1 13.626 2.62l-.142.08L8.704 5.46a.78.78 0 0 0-.393.681zm1.098-2.366 2.602-1.5 2.607 1.5v3l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

/* ── Google Gemini — four-point sparkle with brand gradient ── */
export function GeminiLogo({ size = 20, monochrome }: LogoProps) {
  if (monochrome) {
    return (
      <svg width={size} height={size} viewBox="-2 -2 28 28" fill="currentColor">
        <path d="M12 0c0 6.627-5.373 12-12 12 6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" />
      </svg>
    );
  }
  const gradId = `gemini-grad-${size}`;
  return (
    <svg width={size} height={size} viewBox="-2 -2 28 28" fill="none">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4796E3" />
          <stop offset="50%" stopColor="#9168C0" />
          <stop offset="100%" stopColor="#E94B63" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradId})`}
        d="M12 0c0 6.627-5.373 12-12 12 6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z"
      />
    </svg>
  );
}

/* ── xAI — bold X glyph ────────────────────────────────────── */
export function XAILogo({ size = 20, monochrome }: LogoProps) {
  const color = monochrome ? 'currentColor' : '#0A0A0A';
  return (
    <svg width={size} height={size} viewBox="-2 -2 28 28" fill={color}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932zM17.61 20.644h2.039L6.486 3.24H4.298z" />
    </svg>
  );
}

/* ── DeepSeek — stylized outline mark ──────────────────────── */
export function DeepSeekLogo({ size = 20, monochrome }: LogoProps) {
  const color = monochrome ? 'currentColor' : '#4D6BFE';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 0 1-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 0 0-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 0 1-.465.137 9.597 9.597 0 0 0-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 0 0 1.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 0 1 1.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 0 1 .415-.287.302.302 0 0 1 .2.288.306.306 0 0 1-.31.307.303.303 0 0 1-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 0 1-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 0 1 .016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 0 1-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" />
    </svg>
  );
}

/* ── Mistral AI — stacked tricolor bars ────────────────────── */
export function MistralLogo({ size = 20, monochrome }: LogoProps) {
  if (monochrome) {
    return (
      <svg width={size} height={size} viewBox="1 1 22 22" fill="currentColor">
        <path d="M3 3h3v3H3zm15 0h3v3h-3zM3 6h3v3H3zm6 0h3v3H9zm9 0h3v3h-3zM3 9h3v3H3zm6 0h3v3H9zm6 0h3v3h-3zm3 0h3v3h-3zM3 12h3v3H3zm12 0h3v3h-3zM3 15h3v3H3zm3 0h3v3H6zm9 0h3v3h-3zm3 0h3v3h-3zM3 18h3v3H3zm15 0h3v3h-3z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="1 1 22 22">
      <rect x="3" y="3" width="3" height="3" fill="#FFD800" />
      <rect x="18" y="3" width="3" height="3" fill="#FFD800" />
      <rect x="3" y="6" width="3" height="3" fill="#FFAF00" />
      <rect x="9" y="6" width="3" height="3" fill="#FFAF00" />
      <rect x="18" y="6" width="3" height="3" fill="#FFAF00" />
      <rect x="3" y="9" width="3" height="3" fill="#FF8205" />
      <rect x="9" y="9" width="3" height="3" fill="#FF8205" />
      <rect x="15" y="9" width="3" height="3" fill="#FF8205" />
      <rect x="18" y="9" width="3" height="3" fill="#FF8205" />
      <rect x="3" y="12" width="3" height="3" fill="#FA500F" />
      <rect x="15" y="12" width="3" height="3" fill="#FA500F" />
      <rect x="3" y="15" width="3" height="3" fill="#E10500" />
      <rect x="6" y="15" width="3" height="3" fill="#E10500" />
      <rect x="15" y="15" width="3" height="3" fill="#E10500" />
      <rect x="18" y="15" width="3" height="3" fill="#E10500" />
      <rect x="3" y="18" width="3" height="3" fill="#E10500" />
      <rect x="18" y="18" width="3" height="3" fill="#E10500" />
    </svg>
  );
}

/* ── Groq — stylized G mark ─────────────────────────────────── */
export function GroqLogo({ size = 20, monochrome }: LogoProps) {
  const color = monochrome ? 'currentColor' : '#F55036';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.4" />
      <path
        d="M12 7v5.5a2.5 2.5 0 1 1-2.5-2.5"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Ollama — minimalist llama silhouette ──────────────────── */
export function OllamaLogo({ size = 20, monochrome }: LogoProps) {
  const color = monochrome ? 'currentColor' : '#0A0A0A';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3.2c-.9 0-1.6.9-1.6 2v3.2" />
      <path d="M17 3.2c.9 0 1.6.9 1.6 2v3.2" />
      <path d="M5.4 9c-1.3 1.2-2.1 3-2.1 5 0 2.1.8 4 2.1 5.2v1.3c0 .2.2.3.3.3h2.1c.2 0 .3-.1.3-.3v-.8c1.2.4 2.5.6 3.9.6s2.7-.2 3.9-.6v.8c0 .2.2.3.3.3h2.1c.2 0 .3-.1.3-.3v-1.3c1.3-1.2 2.1-3.1 2.1-5.2 0-2-.8-3.8-2.1-5" />
      <circle cx="9" cy="13.2" r=".9" fill={color} stroke="none" />
      <circle cx="15" cy="13.2" r=".9" fill={color} stroke="none" />
    </svg>
  );
}
