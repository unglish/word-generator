# PR #478 (#475): coda-conditioned /ɪ/ → /ə/ reduction — evidence

Probe scripts and outputs behind the PR description. Not part of the branch.
Local checkout paths are replaced with `<scratch>`; point the imports at a
`main` checkout (81df038c) and the PR checkout to rerun them with `npx tsx`.

- `compare.ts`: baseline-vs-PR diff and classification (outputs
  `compare-default.txt`, `compare-bare.txt`, `compare-text.txt`).
- `ih.ts`, `ih2.ts`, `ih-before-after.md`: /ɪ/ share of /ɪ/+/ə/ by coda vs
  CMU (`evaluation/review/wordlikeness/artifacts/reference-v1.json`).
- `cmu-first.ts`: CMU shares grouped by first coda consonant.
- `kl.ts`, `kl.md`: per-context KL of generated vs CMU constituents.
- `resid.ts`: residual `-ing` /əŋ/ words.
- `examples.txt`: traced before/after examples.
- `quality-pr/`: `npm run quality:pr` comparison (captured at 48d58d08, whose
  output is identical to the PR head).
- `check-summary.txt`: `npm run check` and `npm run build` at 41fb40a2
  (code-identical to the published head; later amends were docs whitespace).
