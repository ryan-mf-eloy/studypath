# /check-build — Verify the project compiles and runs

Run a full build health check on the StudyPath app.

## Steps

1. Run TypeScript check:
   ```bash
   cd study-app && npx tsc --noEmit
   ```
   Expected: zero errors. If errors appear, fix them before proceeding.

2. Run the dev server and verify it starts:
   ```bash
   cd study-app && npm run dev
   ```
   Expected: "VITE ready" message with a local URL.

3. Check for common issues:
   - Missing imports (types, components, stores)
   - CSS variable typos (compare against `src/styles/tokens.css`)
   - Orphan Phosphor icon imports that don't exist
   - Props passed to components that don't match their TypeScript types

4. Report: list any errors found and whether they were fixed.
