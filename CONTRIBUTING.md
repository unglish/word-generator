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

This runs lint, typecheck, both bounded models, and the generator and review
test suites.
**It is the pre-merge test gate:** CI does not run tests on pull requests, only
lint, typecheck and build. Tests run after merge, on `main`, before the demo
deploys. A PR that skips `check` can turn `main` red for everyone. Also run
`npm run test:diagnostics` (the analyzer-sampling checks under `scripts/lib/`)
if you touch `scripts/`. Expect one to two minutes; nearly all of it is
`npm test`. While iterating, use `npm run test:watch` or
`npx vitest run <file>`, and run the full `check` before pushing.

Recommended for tuning and diagnostics:

```bash
npm run test:perf                              # local words/sec floor
npm run perf:compare -- --base <other-checkout>  # paired slowdown check
npm run analyze:trigrams
npm run audit:trace
```

For distribution or quality claims, capture and compare against the frozen
baselines ([`docs/quality-baselines.md`](./docs/quality-baselines.md)) and
include the comparison in the PR description. Measurement output is not
committed to `main`: keep full evidence packets in an `archive/pr-<number>` tag
([`docs/experiments.md`](./docs/experiments.md#where-evidence-lives)).

Lexicon changes are checked against two references. Bare roots use the audited
root phoneme counts, and finished words use full CMU phoneme and syllable counts.
Run `npm run calibrate:phonemes -- --stage roots` or pass `--stage fullCmu`
when a change justifies recalibrating a stage. See
[the stage reference](./docs/cmu-root-reference.md#lexicon-stage-references-phase-2)
for the corpus inputs and reproduction steps.

## Continuous Integration

- **Pull requests** (`.github/workflows/ci.yml`): one `verify` job (lint,
  typecheck, build), which is the required merge check. About a minute. PRs
  need not be up to date with `main` to merge.
- **Tests** (`.github/workflows/tests.yml`): the generator and review test
  suites, both bounded models, and `test:diagnostics`. It repeats lint and
  typecheck because PR checks may have run against older bases. It runs on
  every push to `main`. To run it on a branch before merging, dispatch the
  *Tests* workflow on that
  branch (`gh workflow run tests.yml --ref <branch>`).
- **Review end-to-end** (`.github/workflows/review-e2e.yml`): Playwright,
  Supabase, database, and smoke tests for the review app. Runs on every push
  to `main`, and on a branch by manual dispatch. To run it locally (Docker
  required), follow the Verification section of
  [`docs/human-review.md`](./docs/human-review.md).
- **Main** (`.github/workflows/main.yml`): the pre-release gate. Runs the
  Tests and review end-to-end workflows, then deploys the demo to GitHub Pages
  once both pass. If `main` goes red, fix or revert before merging more. It
  also runs the paired performance gate (`npm run perf:compare`), which times
  the previous `main` commit and the new one back to back on the same runner
  and fails on a median slowdown above 5%. It is advisory: a red result does
  not block the deploy. The fixed words/sec floor (`npm run test:perf`) is
  local-only, because absolute speed varies about 3x between CI runners.
  Runs are serialised, so back-to-back merges
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

Each generation stage draws from its own stream
([Per-stage random streams](docs/stage-random-streams.md)), so a change to how
a stage draws moves that stage's later choices in many words, and a new
derivation scheme moves every word. Tests must therefore not pin a seed or draw
index to a particular word.

- **Find your example.** A behavior test describes the word it needs and
  searches for it with `findExample(predicate, { property, limit, ... })` from
  `src/test-support/find-example.ts`. It scans consecutive seeds through the
  public API and returns the first traced word that matches. Then assert the
  behavior on that word, not its spelling. Select examples from recorded inputs,
  such as selected graphemes. Keep the expected output out of the predicate so
  partial regressions cannot disappear from the search. Cover relevant spelling
  variants separately. When no word matches within `limit`, the test fails with
  `No example of <property> within N words`. Treat that as
  a sign the behavior became unreachable or much rarer, not as a seed to
  re-pick. Keep `limit` a few times the expected gap. If the property is rare
  under English weights, build a narrower config with `createGenerator`.
- **Compare stage draws, not caller draws.** To show that a change draws
  nothing, generate each word with and without it from the same seed, and
  require identical words and identical per-stage draw counts with
  `expectSameWordsAndDraws` from `src/test-support/expect-same-draws.ts`. Identical
  words alone do not show it: a draw added at the end of a stage's stream
  changes no word. Counting the caller's draws shows nothing either, since
  every word takes exactly two.
- **Exact output lives in one place.** `src/core/golden-output.test.ts` checks
  the first 40 words (spelling, hyphenation and pronunciation) of a
  few seed/mode/morphology cases against `src/core/golden-output.json`, and each
  case's `stageDraws`: every stage's draws on the words' first root attempt.
  When a change is meant to alter output or how a stage draws, run
  `npm run golden:update` and review the fixture diff in the PR. A change that
  adds a draw to one stage moves only that stage's count, and the stages that
  run after it in the same word. A count that moves in a stage that runs before
  the changed one means a draw landed in the wrong stream
  ([Per-stage random streams](docs/stage-random-streams.md#guarantees-and-tests)).

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
- Evidence for distribution or quality claims in the description, with any
  full packet in an `archive/pr-<number>` tag rather than in the diff.
