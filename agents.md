# AGENTS.md

Operational guidance for human contributors and coding agents working in
`@unglish/word-generator`.

## Non-Negotiables

1. Determinism: same config + same seed/RNG stream => same output.
2. Trace-first diagnostics: for n-gram outliers, use `trace: true` and ground
   claims in `WordTrace` evidence (`stages`, `graphemeSelections`, `structural`,
   `repairs`, `morphology`).
3. Phonological fidelity: preserve plausible English-like phonotactics unless a
   change explicitly introduces a stylized mode.
4. Minimal dependencies: avoid large runtime libraries; prefer native
   TypeScript/JavaScript.
5. Typed, composable APIs: preserve strict TypeScript and reusable functions.

## Implementation Rules

### Logic 

- Prefer small helper functions for classification/filtering rather than inline
  branching.

### Linguistic Modeling

- Model phonological data as structured objects, not ad-hoc string unions.
- Keep onset/nucleus/coda behavior derivable from weighted properties.
- Treat syllable structure and cluster constraints as config-driven behavior.
- When changing repairs or weighting, verify side effects on large samples.

### Testing and Performance

- For generator tuning, include deterministic seed-based checks and a
  distribution-oriented test where practical.
- Use existing scripts for diagnostics:
  - `npm test`
  - `npm run test:quality`
  - `npm run test:perf`
  - `npm run analyze:trigrams`
  - `npm run audit:trace`

## Task Guidance for Agents

1. Generate words through public APIs (`generateWord`, `generateWords`,
   `createGenerator`) only.
2. Add phoneme inventory changes in `src/elements/phonemes.ts` and maintain the
   existing typed object structure.
3. Add grapheme behavior in `src/elements/graphemes/*` with positional/context
   weighting.
4. Add syllable/repair rules in `src/core/*` with tests that validate both
   structure and output behavior.
5. Keep refactors semantics-preserving unless explicitly asked to change output.

## Pull Request Checklist

- Behavior change explained in plain language.
- Tests added/updated and passing locally.
- Trace evidence included for any distribution/outlier claim.
- Docs updated when public behavior or workflows change (`README.md`,
  `CONTRIBUTING.md`, relevant files in `docs/`).

## Cursor Cloud specific instructions

- **Runtime**: Node.js 22 + npm. No external services, Docker, or databases required.
- **Install**: `npm ci` (lockfile present).
- **Dev server**: `npm run dev` starts Vite + tsc watch via `concurrently` on `http://localhost:5173/`.
- **Tests**: `npm test` runs Vitest (~80s). Some quality/statistical tests are compute-heavy; a vitest-worker timeout error ("Timeout calling onTaskUpdate") may appear in CI-like environments without affecting test results.
- **Lint**: `npm run lint` runs ESLint. The codebase has pre-existing lint errors (quote style in `src/config/english.ts`, unused vars in `src/core/quality.test.ts`); these are not regressions.
- **TypeScript**: Use `npx tsx` to run `.ts` files directly (e.g. `npx tsx -e 'import { generateWord } from "./src/index.ts"; ...'`).
- See `README.md` for the full list of available npm scripts (quality, perf, analysis, trace audit).
