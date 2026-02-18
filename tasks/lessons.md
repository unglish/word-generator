## Lessons

### 2026-02-18 — Prefer explicit simplification decisions
- When proposing architecture with optional compatibility layers, explicitly ask whether we should keep or drop them before implementation.
- If user confirms simplification (e.g., drop resolver/fallback), update the plan immediately and keep implementation single-path.

### 2026-02-18 — Keep CI performance/test headroom after architecture shifts
- After major generation-path changes, re-check perf/test assumptions against slower CI hardware, not just local runs.
- Prefer explicit per-test timeouts for heavy statistical loops.
- Keep perf floor conservative enough for CI variance while still catching regressions.
