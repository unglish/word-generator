# Issue #463 — Ban tense vowels/diphthongs before /ŋ/ in roots

## Plan

- [x] Check CMU baselines for /i: u eɪ aɪ aʊ əʊ ɔɪ ɜ ʊ/ + /ŋ/
- [x] Add bannedNucleusCodaCombinations entries in english.ts
- [x] Bump /ŋ/ coda weight 44→88 to keep CMU share after the ban
- [x] Update docs/root-rime-compatibility.md
- [x] Add seeded regression + distribution tests
- [x] Capture before/after counts on seeds 1000000–1019999
- [x] Regenerate golden fixture
- [x] Run npm run check, build, quality:pr
- [ ] Commit, push, run outsource verification runner

## Review

- Status: Implementation complete; committing next.
- CMU ARPABET bigrams: IY/UW/EY/AY/AW/OW/OY/ER/UH before NG each ≤0.4% of NG (UH=4/0.04%); included /ʊ/.
- Before/after (lexical root syllables, seeds 1e6–1019999): banned hits 775→0; /ŋ/ codas 1484→1464; nucleus mix before /ŋ/ is only ɛ ɪ ə ɑ æ ʌ ɔ.
- Letter side effects: ayng 31→0, eyng 14→0, iing 81→2; ing-like 1133→1138.
- Thresholds: no phoneme/ngram threshold files loosened; search/soft bounds adjusted for RNG shift in illegal-join and cluster-weights tests.
