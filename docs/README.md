# Docs Index

This directory contains design notes, diagnostics workflows, and tuning docs.

- [`human-review.md`](./human-review.md): anonymous written-plausibility studies,
  private Supabase setup, owner exports, and pilot interpretation.
- [`quality-baselines.md`](./quality-baselines.md): frozen linguistic quality
  baselines, and how to capture and compare a change against them.
- [`word-trace-diagnostics.md`](./word-trace-diagnostics.md): how to diagnose
  generation behavior with `trace: true`.
- [`morphological-hiatus.md`](./morphological-hiatus.md): preserved vowel boundaries,
  insertion policy, and measured tradeoffs.
- [`phonotactic-scoring.md`](./phonotactic-scoring.md): scoring heuristics used
  to evaluate phonotactic quality.
- [`design-grapheme-conditioning.md`](./design-grapheme-conditioning.md):
  rationale for grapheme context rules and conditioning.
- [`design-rng-and-quality-dx.md`](./design-rng-and-quality-dx.md): RNG and
  quality tooling design decisions.
- [`attested-codas.md`](./attested-codas.md): attested coda cluster references.
- [`experiments.md`](./experiments.md): where PR evidence lives (PR descriptions
  and `archive/pr-<number>` tags, not `main`), and experiments closed without
  merging with their measured outcomes.
- [`spelling-coverage-policy.md`](./spelling-coverage-policy.md): phone-preserving
  spelling budgets, licensed respellings and `trace.spellingBudgets`.
- [`resolved-allomorphs.md`](./resolved-allomorphs.md): selected affix forms,
  explicit morphology parts, and planned/resolved trace provenance.
- [`pronunciation-config-migration.md`](./pronunciation-config-migration.md):
  current stress/aspiration pronunciation schema reference.
- [`narrow-ipa.md`](./narrow-ipa.md): Chimera Speak export lens (`r→ɹ`,
  `əʊ→oʊ`, `ɜ→ɝ`); projection ≠ identity resolution.
- [`phoneme-identity.md`](./phoneme-identity.md): observational identities and
  scoring projections for the legacy inventory.

- [`coda-extensions.md`](./coda-extensions.md): optional root coda validation.
