# Issue #555 evidence: UCI pair-deficit diagnosis and selector simulation

Analysis behind the tracking issue #555 (phoneme selection rebuild). Not maintained code.

## Inputs

- UCI evidence from `archive/pr-553` (`review-exports/wordlikeness-research-evidence/uci-*.csv.gz`, `uci-coda-*.json`). Extract these into a directory and pass it as `ev`.
- `data/regen.jsonl.gz`: the 45,904 archived draws (seeds 201–246, 1,000 words per seed except 904 for seed 246; lexicon mode, morphology on) regenerated with `trace: true` at `c48d16c1`. The pronunciations match the archive exactly, so the traces can be joined to the UCI percentiles. Produced by `scripts/regen.ts` (run with bun from this directory).

## Scripts

Run with `python3 -I scripts/<name>.py <ev-dir> [regen.jsonl]`.

- `a1.py`: UCI refit check, and pair/single-sound percentiles by phoneme and syllable count.
- `a2.py`: score gap by word position and pair class (CV, VC, CC, VV).
- `a3.py`: regeneration match check, then trace-joined percentiles by repair, morphology template and attempt count.
- `a4.py`: length-matched gap share by slot, and rare-pair rates by slot.
- `a5.py`: pair divergence per slot, before and after matching both marginals to the reference; top under- and over-represented pairs; nucleus marginals.
- `a6.py`: per-pair typicality and rare-pair rate by slot and syllable context.
- `b1.py`: offline selector simulation (independent, joint rime, joint rime + onset given previous phone, whole syllables, phone chain), trained on four folds and scored on the fifth with UCI, a phone trigram model, and the rare-pair, real-word and duplicate rates.

## Caveats

- The UCI refit in the `a*` scripts is in-sample (for attribution only).
- `b1.py` fits on full CMU surface words with a max-onset syllabifier, with no stress, repairs or length targeting. Its numbers are ceilings for a design, not forecasts. #555 refits on audited roots in E2/E3.
