# Contributing

Thanks for contributing to `@unglish/word-generator`.

## Scope

This repository is the word-generation engine only. Keep changes focused on
phonological generation, diagnostics, and library ergonomics.

## Setup

```bash
npm install
npm test
```

## Development Workflow

1. Create a focused branch.
2. Make small, reviewable commits.
3. Add or update tests with every behavior change.
4. Run required checks before opening/updating a PR.
5. Update docs when public behavior changes.

## Required Checks

```bash
npm run check
```

This runs lint, typecheck, the test suite, and the review app's unit tests: the
core of what CI runs on every pull request. CI additionally runs
`npm run build` and `npm run test:diagnostics` (the analyzer-sampling checks
under `scripts/lib/`); run those locally if you touch `scripts/` or the build.
Expect one to two minutes; nearly all of it is `npm test`. While iterating, use
`npm run test:watch` or `npx vitest run <file>`, and run the full `check`
before pushing.

Recommended for tuning and diagnostics:

```bash
npm run test:perf
npm run analyze:trigrams
npm run audit:trace
```

For distribution or quality claims, capture and compare against the frozen
baselines ([`docs/quality-baselines.md`](./docs/quality-baselines.md)) and
include the comparison in the PR.

## Continuous Integration

- **Pull requests** (`.github/workflows/ci.yml`): build; lint + typecheck +
  `npm test` + `test:diagnostics` (the `test` job, which is the required merge
  check); and the review app's unit tests. Kept fast and deterministic.
- **Review end-to-end** (`.github/workflows/review-e2e.yml`): Playwright,
  Supabase, database, and smoke tests for the review app. Runs on PRs only when
  review code or dependencies change, and on every push to `main`. To run it
  locally (Docker required), follow the Verification section of
  [`docs/human-review.md`](./docs/human-review.md).
- **Main** (`.github/workflows/main.yml`): re-runs the PR checks, the review
  end-to-end suite, and the performance regression gate, then deploys the demo
  to GitHub Pages only if all pass. Runs are serialised, so back-to-back merges
  may show an intermediate run as cancelled; the newest commit still deploys.
  If a gate flakes, use *Re-run failed jobs* on the newest `main` run only.
  Dispatch the workflow manually on `main` to redeploy without a new commit; a
  dispatch from any other branch skips `deploy`.

Heavier diagnostics (`npm run quality:pr`, `npm run quality:capture`,
`npx vitest bench --run`) are run locally, on demand.

## Coding Guidelines

- Use modern TypeScript with strict typing.
- Prefer composable, pure functions where practical.
- Keep dependencies minimal.
- Preserve deterministic behavior for seeded generation.
- Prefer named exports for new modules/APIs.

Agent-specific implementation constraints live in
[`agents.md`](./agents.md).

## Boundary Policy API (0.6.0)

Boundary-drop tuning now lives under:

- `generationWeights.boundaryPolicy.equalSonorityDrop`
- `generationWeights.boundaryPolicy.risingCodaDrop`

`generationWeights.probability.boundaryDrop` is removed and should not be used
in new or updated configs.

## Writing Tests Against Generated Words

Any change to how many random draws the generator makes moves every later word,
so tests must not pin a seed or draw index to a particular word.

- **Find your example.** A behavior test describes the word it needs and
  searches for it with `findExample(predicate, { property, limit, ... })` from
  `src/test-support/find-example.ts`. It scans consecutive seeds through the
  public API and returns the first traced word that matches. Then assert the
  behavior on that word, not its spelling. When no word matches within `limit`,
  the test fails with `No example of <property> within N words`. Treat that as
  a sign the behavior became unreachable or much rarer, not as a seed to
  re-pick. Keep `limit` a few times the expected gap. If the property is rare
  under English weights, build a narrower config with `createGenerator`.
- **Prefer relative invariants to counts.** For RNG consumption, compare traced
  and untraced runs on identical streams instead of asserting a draw count.
- **Exact output lives in one place.** `src/core/golden-output.test.ts` checks
  the first 40 words (spelling, hyphenation, pronunciation and RNG draws) of a
  few seed/mode/morphology cases against `src/core/golden-output.json`. When a
  change is meant to alter output, run `npm run golden:update` and review the
  fixture diff in the PR.

## Diagnostics Rule (Important)

For n-gram anomalies and output outliers, use `trace: true` and ground claims in
`WordTrace` evidence. Do not diagnose from surface strings alone.

Reference: [`docs/word-trace-diagnostics.md`](./docs/word-trace-diagnostics.md)

## PR Expectations

Include:

- What changed.
- Why it changed.
- How it was validated (tests, diagnostics, sample size/seed when relevant).
- Any expected distribution shifts or compatibility impact.
