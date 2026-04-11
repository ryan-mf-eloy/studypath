# StudyPath — CLAUDE.md

## What this app is

Desktop web app for Ryan Eloy to track a 15-month technical study roadmap (April 2026 – June 2027). Five screens: Overview, Roadmap, Matérias, Notas, Milestones. All UI in Brazilian Portuguese.

**Source of truth:**
- Design spec: `docs/superpowers/specs/2026-04-11-study-app-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-11-study-app-implementation.md`
- Roadmap data: `src/data/roadmap.ts` (transcribed from `roadmap_estudos_2026_2027.md`)
- Screen references: `docs/stitch/` — one folder per screen with `screen.png` + `code.html`

---

## Stack

| Layer | Tech |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build | Vite + `@tailwindcss/vite` |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Icons | `@phosphor-icons/react` |
| Routing | React Router v6 |
| State | Zustand + `persist` middleware |
| Notes editor | `@uiw/react-md-editor` |
| Persistence | `localStorage` (keys: `studypath-progress`, `studypath-notes`) |
| Font | Plus Jakarta Sans via `@fontsource/plus-jakarta-sans` |

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
