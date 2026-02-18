## Lessons

### 2026-02-18 — Prefer explicit simplification decisions
- When proposing architecture with optional compatibility layers, explicitly ask whether we should keep or drop them before implementation.
- If user confirms simplification (e.g., drop resolver/fallback), update the plan immediately and keep implementation single-path.
