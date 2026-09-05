# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner develops a deterministic English-like word generator. Anonymous English readers contribute one-way spelling judgments through a shared review link.

## Product Purpose

Generate convincing individual words and collect evidence about their perceived written plausibility. Real-word matches are allowed. The first study establishes a descriptive baseline before generator refactoring or tuning.

## Operating Context

The existing vanilla web demo is built with Vite and hosted on GitHub Pages. The review page uses private Supabase storage; only the owner can inspect and export judgments. Reviewers have no accounts, history, or results access.

## Capabilities and Constraints

Frozen, traceable samples; anonymous sessions of 20 distinct spellings; a five-point written-plausibility rubric; familiarity and skip controls; durable local submission buffering. Preserve strict TypeScript, public generator APIs, deterministic generation, and minimal runtime dependencies.

## Evidence on Hand

The generator provides complete Word objects and trace diagnostics. Human ratings are not yet collected. Anonymous sessions do not establish distinct people, and pilot coverage does not establish statistical acceptance.

## Accessibility & Inclusion

General English readers need no linguistic training. Support mobile screens, keyboard navigation, visible focus, labeled controls, and explicit pending/error states.
