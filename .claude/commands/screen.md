# /screen — Implement a screen

Implement the screen named `$ARGUMENTS` for the StudyPath app.

## Steps

1. Read the Stitch reference:
   - Find the matching folder in `docs/stitch/` (e.g., `studypath_overview/` for "overview")
   - Read `code.html` to understand layout structure
   - Note the component hierarchy, spacing, and data displayed

2. Read the design spec section for this screen in `docs/superpowers/specs/2026-04-11-study-app-design.md`

3. Read the implementation plan step for this screen in `docs/superpowers/plans/2026-04-11-study-app-implementation.md`

4. Read relevant existing files:
   - `src/types/index.ts` — available types
   - `src/lib/utils.ts` — available helpers
   - `src/store/useProgressStore.ts` — progress store API
   - `src/store/useNotesStore.ts` — notes store API
   - `src/data/roadmap.ts` — roadmap data structure

5. Implement the screen:
   - Create/update `src/pages/[ScreenName].tsx`
   - Create any new UI components in `src/components/ui/` as needed
   - Use CSS variables from `src/styles/tokens.css` — no hardcoded hex
   - Use Phosphor icons (not Material Symbols from Stitch reference)
   - All labels/text in Brazilian Portuguese
   - Wire up Zustand stores for live data

6. Verify:
   - No TypeScript errors (`tsc --noEmit`)
   - Screen renders correctly at 1280px+ width
   - Interactive elements (checkboxes, accordions, nav) work correctly
   - Progress reflects store state

## Screen → file mapping

| Argument | Page file | Stitch folder |
|---|---|---|
| overview | `src/pages/Overview.tsx` | `studypath_overview/` |
| roadmap | `src/pages/Roadmap.tsx` | `studypath_roadmap/` + `studypath_notes_panel/` |
| materias | `src/pages/Materias.tsx` | `studypath_subjects_library/` |
| notas | `src/pages/Notas.tsx` | `studypath_notes_library/` |
| milestones | `src/pages/Milestones.tsx` | `studypath_milestones_tracker/` |
