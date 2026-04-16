import { createCodeBlockSpec } from '@blocknote/core';
import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

/**
 * Code block com Shiki syntax highlighting.
 *
 * Usamos `shiki/core` com imports dinâmicos para tree-shake agressivo.
 * Cada linguagem é um chunk lazy separado carregado pelo Vite quando o
 * editor é montado pela primeira vez. Tema: github-light (warm minimalism).
 */
export const codeBlockWithHighlight = createCodeBlockSpec({
  indentLineWithTab: true,
  defaultLanguage: 'typescript',
  supportedLanguages: {
    text: { name: 'Texto', aliases: ['plaintext', 'txt'] },
    typescript: { name: 'TypeScript', aliases: ['ts'] },
    javascript: { name: 'JavaScript', aliases: ['js'] },
    tsx: { name: 'TSX', aliases: [] },
    jsx: { name: 'JSX', aliases: [] },
    python: { name: 'Python', aliases: ['py'] },
    go: { name: 'Go', aliases: ['golang'] },
    rust: { name: 'Rust', aliases: ['rs'] },
    java: { name: 'Java', aliases: [] },
    kotlin: { name: 'Kotlin', aliases: ['kt'] },
    swift: { name: 'Swift', aliases: [] },
    c: { name: 'C', aliases: [] },
    cpp: { name: 'C++', aliases: ['c++'] },
    csharp: { name: 'C#', aliases: ['cs'] },
    ruby: { name: 'Ruby', aliases: ['rb'] },
    php: { name: 'PHP', aliases: [] },
    sql: { name: 'SQL', aliases: [] },
    bash: { name: 'Bash', aliases: ['sh', 'shell'] },
    json: { name: 'JSON', aliases: [] },
    yaml: { name: 'YAML', aliases: ['yml'] },
    toml: { name: 'TOML', aliases: [] },
    html: { name: 'HTML', aliases: [] },
    css: { name: 'CSS', aliases: [] },
    scss: { name: 'SCSS', aliases: ['sass'] },
    markdown: { name: 'Markdown', aliases: ['md'] },
    docker: { name: 'Dockerfile', aliases: ['dockerfile'] },
    graphql: { name: 'GraphQL', aliases: ['gql'] },
    diff: { name: 'Diff', aliases: [] },
  },
  // Linguagens são carregadas como chunks separados (lazy) pelo Vite.
  // Passamos tudo via thunks — createHighlighterCore resolve on-demand.
  createHighlighter: () =>
    createHighlighterCore({
      themes: [import('@shikijs/themes/github-light')],
      langs: [
        import('@shikijs/langs/typescript'),
        import('@shikijs/langs/javascript'),
        import('@shikijs/langs/tsx'),
        import('@shikijs/langs/jsx'),
        import('@shikijs/langs/python'),
        import('@shikijs/langs/go'),
        import('@shikijs/langs/rust'),
        import('@shikijs/langs/java'),
        import('@shikijs/langs/kotlin'),
        import('@shikijs/langs/swift'),
        import('@shikijs/langs/c'),
        import('@shikijs/langs/cpp'),
        import('@shikijs/langs/csharp'),
        import('@shikijs/langs/ruby'),
        import('@shikijs/langs/php'),
        import('@shikijs/langs/sql'),
        import('@shikijs/langs/bash'),
        import('@shikijs/langs/json'),
        import('@shikijs/langs/yaml'),
        import('@shikijs/langs/toml'),
        import('@shikijs/langs/html'),
        import('@shikijs/langs/css'),
        import('@shikijs/langs/scss'),
        import('@shikijs/langs/markdown'),
        import('@shikijs/langs/docker'),
        import('@shikijs/langs/graphql'),
        import('@shikijs/langs/diff'),
      ],
      engine: createOnigurumaEngine(import('shiki/wasm')),
    }),
});
