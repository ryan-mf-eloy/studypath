// Preload — runs in the renderer context with limited Node access.
// Kept intentionally empty: the renderer talks to the backend via fetch,
// so there's no bridge to expose beyond what Electron provides by default.

export {};
