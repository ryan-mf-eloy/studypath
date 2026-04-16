# StudyPath — CLAUDE.md

## What this app is

Cross-platform native desktop app (Electron) for Ryan Eloy to track a 15-month technical study roadmap (April 2026 – June 2027). Runs the full stack (React renderer + Hono backend + SQLite) inside a single process. Five screens: Overview, Roadmap, Matérias, Notas, Milestones. All UI in Brazilian Portuguese.

**Source of truth:**
- Design spec: `docs/superpowers/specs/2026-04-11-study-app-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-11-study-app-implementation.md`
- Roadmap data: `src/data/roadmap.ts` (transcribed from `roadmap_estudos_2026_2027.md`)
- Screen references: `docs/stitch/` — one folder per screen with `screen.png` + `code.html`

---

## Stack

| Layer | Tech |
|---|---|
| Desktop shell | Electron 41 + electron-vite + electron-builder |
| Framework | React 19 + TypeScript |
| Build | Vite + `@tailwindcss/vite` |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Icons | `@phosphor-icons/react` |
| State (in-memory cache) | Zustand |
| Notes editor | BlockNote |
| Backend | Hono + `@hono/node-server` embedded in the Electron main process |
| Persistence | SQLite via `better-sqlite3` — `~/Library/Application Support/StudyPath/studypath.db` (macOS) |
| Client ↔ Server | `src/lib/api.ts` + write-through retry queue in `src/lib/serverSync.ts` |
| UI-only localStorage | theme, note prefs, AI provider keys |

## Backend architecture

- Server lives in `server/` (TypeScript). Routes under `server/routes/`:
  - `state` — one-shot hydrate bundle for the client on boot
  - `progress`, `sessions`, `reviews`, `notes`, `subtopics`, `milestones`, `reflections` — CRUD
  - `metrics` — SQL-aggregated `/api/metrics/{progress,pace/:monthId,streak,time,reviews/due,overview}`
  - `migrate/from-local` — idempotent import of legacy localStorage dumps
  - `admin/reset` — wipe all tables
- Schema lives as an inline template literal in `server/schema.ts` (so it bundles cleanly into `dist-electron/main/main.js`). Applied on startup by `server/db.ts` via `runSchema()` inside `startServer()`. `better-sqlite3` is opened lazily via a Proxy so `STUDYPATH_DB_PATH` set by the Electron main process is honored before the first DB access.
- The Hono server also serves the built Vite renderer statically; in the packaged app the BrowserWindow loads `http://127.0.0.1:<random-port>/` so `/api` and the renderer share an origin (no CORS, no `file://`).
- Client hydrates once on mount via `src/hooks/useServerSync.ts` (gate in `src/components/ui/HydrationGate.tsx`).
- Each persisted store (`useProgressStore`, `useSessionsStore`, `useReviewStore`, `useNotesStore`, `useSubtopicsStore`, `useMilestonesStore`, `useJournalStore`) updates Zustand optimistically and calls `enqueueWrite(...)` — writes are retried until the server is reachable.
- `npm run smoke:api` runs the end-to-end endpoint smoke test (`scripts/smoke-api.mjs`).

---

## Desktop (Electron) architecture

Main process lives in `electron/main.ts`. At startup it:

1. Sets `STUDYPATH_DB_PATH = app.getPath('userData') + '/studypath.db'`
2. Calls `startServer()` from `server/index.ts` — the Hono app binds to a random port on `127.0.0.1`
3. Creates the BrowserWindow (`hiddenInset` titlebar on macOS, cream background matching the design tokens)
4. Loads `http://127.0.0.1:<port>/` (production) or Vite's HMR URL (electron-vite dev)
5. Builds a native menu (File / Edit / View / Window / Help)
6. Builds a system tray with "Abrir StudyPath" + "Sair"

electron-vite bundles `electron/main.ts` + the transitively-imported `server/**` into `dist-electron/main/main.js`. `better-sqlite3` and `electron` stay external (runtime requires). The native `.node` binary ships outside the asar archive via `asarUnpack` in `electron-builder.yml`.

**Native module ABI toggle**
Since `better-sqlite3` is compiled once per runtime, the project has two scripts:
- `npm run rebuild:node` — after cloning or before `npm run smoke:api` / `npm run dev` (web mode)
- `npm run rebuild:electron` — before `npm run pack*` or running the packaged app from source

`electron-builder` runs `@electron/rebuild` automatically during packaging, so the final DMG/NSIS/AppImage contain the correct ABI.

## Desktop build workflow

```
# 1. Initial install
npm install --legacy-peer-deps

# 2. Generate app icons (once, or when design changes)
npm run icon:generate      # writes build/icon.icns + build/icon.png + build/tray-icon.png

# 3a. Web dev (browser + proxied Hono server)
npm run dev                # server:3001 + vite HMR (no Electron)
npm run rebuild:node       # if ABI was toggled to Electron

# 3b. Electron dev (HMR main + renderer + server)
npm run rebuild:electron   # rebuild better-sqlite3 for Electron ABI
npm run dev:electron       # launches electron-vite dev

# 4. Build + package
npm run pack:mac           # → release/StudyPath-0.1.0{,-arm64}.dmg (x64 + arm64)
npm run pack:win           # → release/StudyPath Setup 0.1.0.exe
npm run pack:linux         # → release/StudyPath-0.1.0.AppImage + .deb
npm run pack               # all platforms supported by the current host
```

Build artifacts land in `release/`. The DB always lives in Electron's `userData` dir per-user (never inside the app bundle).

---

## File structure

```
src/
├── main.tsx                  # Entry point — imports globals.css
├── App.tsx                   # BrowserRouter + Layout + Routes
├── styles/
│   ├── globals.css           # @import tokens.css + font + Tailwind + reset
│   └── tokens.css            # ALL CSS custom properties (source of truth)
├── data/
│   └── roadmap.ts            # Full roadmap data (RoadmapData) — do not edit casually
├── types/
│   └── index.ts              # All TypeScript interfaces and enums
├── lib/
│   └── utils.ts              # Pure utility functions (date, color, nanoid)
├── store/
│   ├── useProgressStore.ts   # Zustand — checkedTopics, toggle, progress calcs
│   └── useNotesStore.ts      # Zustand — notes CRUD + queries
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx       # Fixed left nav (240px)
│   │   └── TopBar.tsx        # Greeting + date + current phase badge
│   ├── ui/                   # Reusable leaf components
│   └── panels/
│       └── NotePanel.tsx     # Slide-in note panel (triggered from Roadmap)
└── pages/
    ├── Overview.tsx
    ├── Roadmap.tsx
    ├── Materias.tsx
    ├── Notas.tsx
    └── Milestones.tsx
```

---

## Design tokens

**All colors and spacing come from CSS custom properties in `src/styles/tokens.css`.** Never hardcode hex values in components.

### Background
| Variable | Value | Use |
|---|---|---|
| `--bg-primary` | `#F4F0E6` | Page background (off-white/cream) |
| `--bg-surface` | `#FFFFFF` | Cards, panels |
| `--bg-sidebar` | `#EDE8DC` | Left sidebar |
| `--border-subtle` | `#E8E2D4` | Card borders, dividers |

### Focus type accents
| Type | Color var | Value | Background var |
|---|---|---|---|
| `main` | `--focus-main` | `#E84F3C` (coral) | `--focus-main-bg` `#FDF0EE` |
| `secondary` | `--focus-sec` | `#2B6CB0` (blue) | `--focus-sec-bg` `#EEF4FB` |
| `continuous` | `--focus-cont` | `#3D9E6B` (green) | `--focus-cont-bg` `#EDF7F2` |

### Milestones
| Variable | Value |
|---|---|
| `--milestone` | `#A855F7` (lilac) |
| `--milestone-bg` | `#F5EDFF` |

### Text
| Variable | Value | Use |
|---|---|---|
| `--text-primary` | `#1A1A1A` | Body text |
| `--text-muted` | `#7A746A` | Secondary text, labels |
| `--text-disabled` | `#BEBAB3` | Completed/inactive |

### Helpers in `src/lib/utils.ts`
- `focusColor(type)` → returns `var(--focus-*)` string
- `focusBg(type)` → returns `var(--focus-*-bg)` string
- `focusLabel(type)` → returns `"Principal" | "Secundário" | "Contínuo"`

---

## TypeScript types (src/types/index.ts)

```
Phase → months[]
Month → focuses[]  (id format: "YYYY-MM")
Focus → topics[], type: FocusType, masteryNote
Topic → label, focusId
```

**ID conventions:**
- Phase: `phase-1` through `phase-5`
- Month: `"2026-04"` (matches getCurrentMonth() logic)
- Focus: `"2026-04-main"`, `"2026-04-secondary"`, `"2026-04-continuous"`
- Topic: `"2026-04-main-slug"` (kebab-case of label)
- Note: generated with `nanoid('note')`
- Milestone: `"ms-1"` through `"ms-8"`

**Never pass raw roadmap data as props.** Import `roadmap` from `src/data/roadmap.ts` and read from it in stores/hooks.

---

## Progress store pattern

```typescript
// In components, always call with the roadmap:
const { getFocusProgress } = useProgressStore();
const progress = getFocusProgress(focus.id, roadmap);
// → { focusId, done, total, pct }
```

All progress is computed on the fly from `checkedTopics`. No derived state stored.

---

## Icons

The project uses **`@phosphor-icons/react`**. The Stitch HTML reference files use Material Symbols — map them:

| Material Symbol (Stitch) | Phosphor equivalent | Import |
|---|---|---|
| `home` | `<House>` | `@phosphor-icons/react` |
| `map` | `<MapTrifold>` | `@phosphor-icons/react` |
| `school` / `menu_book` | `<BookOpenText>` | `@phosphor-icons/react` |
| `notes` / `note_alt` | `<NotePencil>` | `@phosphor-icons/react` |
| `flag` / `emoji_events` | `<Trophy>` | `@phosphor-icons/react` |
| `check_circle` | `<CheckCircle>` | `@phosphor-icons/react` |
| `radio_button_unchecked` | `<Circle>` | `@phosphor-icons/react` |
| `expand_more` | `<CaretDown>` | `@phosphor-icons/react` |
| `add` | `<Plus>` | `@phosphor-icons/react` |
| `search` | `<MagnifyingGlass>` | `@phosphor-icons/react` |
| `close` | `<X>` | `@phosphor-icons/react` |
| `edit` / `edit_note` | `<PencilSimple>` | `@phosphor-icons/react` |
| `delete` | `<Trash>` | `@phosphor-icons/react` |
| `link` | `<Link>` | `@phosphor-icons/react` |
| `format_bold` | `<TextBolder>` | `@phosphor-icons/react` |
| `format_italic` | `<TextItalic>` | `@phosphor-icons/react` |
| `format_list_bulleted` | `<ListBullets>` | `@phosphor-icons/react` |
| `format_list_numbered` | `<ListNumbers>` | `@phosphor-icons/react` |
| `code` | `<Code>` | `@phosphor-icons/react` |

Default icon weight: `regular`. Use `weight="bold"` for active/selected states.

---

## Stitch screen references

Each screen has a reference in `docs/stitch/`:

| Screen | Folder | Route |
|---|---|---|
| Overview | `studypath_overview/` | `/` |
| Roadmap | `studypath_roadmap/` | `/roadmap` |
| Roadmap + Note panel | `studypath_notes_panel/` | `/roadmap` (panel open) |
| Matérias | `studypath_subjects_library/` | `/materias` |
| Notas | `studypath_notes_library/` | `/notas` |
| Milestones | `studypath_milestones_tracker/` | `/milestones` |

**How to use references:**
- Read `code.html` to understand layout structure, spacing decisions, and component hierarchy
- View `screen.png` to see the visual intent
- Adapt to our stack: replace Material Symbols with Phosphor, replace hardcoded hex with CSS vars, use our TypeScript data instead of static strings
- Do NOT copy Stitch CSS wholesale — it uses Material Design tokens that conflict with our system

---

## Layout

```
┌─────────────────────────────────────────────────────┐
│ Sidebar (240px fixed)  │ TopBar (72px fixed top)    │
│                        ├────────────────────────────┤
│ • studypath logo       │ Page content area           │
│ • Nav items (5)        │ (overflow-y: auto)          │
│ • User row (bottom)    │ max-width: 1100px centered  │
└────────────────────────┴────────────────────────────┘
```

**Sidebar nav items (in order):**
1. House → "Início" → `/`
2. MapTrifold → "Roadmap" → `/roadmap`
3. BookOpenText → "Matérias" → `/materias`
4. NotePencil → "Notas" → `/notas`
5. Trophy → "Marcos" → `/milestones`

Active nav item: left border `3px solid var(--focus-main)`, background `var(--focus-main-bg)`.

---

## Coding rules

1. **CSS variables only** — no raw hex in JSX/TSX
2. **Portuguese UI** — all labels, buttons, empty states, and error messages in pt-BR
3. **No prop drilling beyond 2 levels** — use Zustand stores
4. **Tailwind for layout/spacing** — use `gap-*`, `p-*`, `grid-cols-*` etc. For color/border use CSS vars with `style` prop or custom classes
5. **Component props are typed** — no `any`, no untyped props
6. **No duplicate roadmap traversal** — use store helpers (`getFocusProgress`, etc.) not inline `.flatMap`
7. **Persist keys** — `studypath-progress` and `studypath-notes` — do not change them or localStorage data will be lost
8. **Responsive target** — desktop-first, minimum 1280px wide. No mobile layout needed.

---

## Current implementation status

See `docs/superpowers/plans/2026-04-11-study-app-implementation.md` for the full phased plan.

**Completed (infrastructure):**
- [x] Project scaffold (Vite + React + TS)
- [x] All deps installed
- [x] `src/styles/tokens.css` — all CSS variables
- [x] `src/styles/globals.css` — font imports, reset, Tailwind
- [x] `src/types/index.ts` — all interfaces
- [x] `src/lib/utils.ts` — date/color/id helpers
- [x] `src/store/useProgressStore.ts`
- [x] `src/store/useNotesStore.ts`
- [x] `src/data/roadmap.ts` — full data seed

**Next: Layout (App.tsx, Sidebar, TopBar) → then screens one by one**

---

## Slash commands

`.claude/commands/` contains custom commands for this project:

- `/screen [name]` — starts implementation of a screen using Stitch reference
- `/check-build` — runs TypeScript check and dev server smoke test
