# PR #516 evidence: consonant doubling conditioned on stress and vowel (#513)

- `main-20k.txt` / `pr-20k.txt`: `measure.mts` output, seeds 5000000–5019999, main 07845fce vs 19714cdf.
  Rows: root-final syllable stress × nucleus class, eligible (letter shape) vs doubled.
- `*-rows.json.gz`: per-word rows (seed, word, IPA, base root, attached root, suffix, stress, nucleus, doubled).
- `comparison.md` / `comparison.json`: `npm run quality:pr -- --base origin/main` (development cohort).

Run: `npx tsx measure.mts <repoRoot> <outPrefix>`.
