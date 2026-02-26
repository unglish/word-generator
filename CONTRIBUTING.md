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
npm test
npm run lint
```

Recommended for tuning and diagnostics:

```bash
npm run test:quality
npm run test:perf
npm run analyze:trigrams
npm run audit:trace
```

## Coding Guidelines

- Use modern TypeScript with strict typing.
- Prefer composable, pure functions where practical.
- Keep dependencies minimal.
- Preserve deterministic behavior for seeded generation.
- Prefer named exports for new modules/APIs.

Agent-specific implementation constraints live in
[`agents.md`](./agents.md).

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
