# Q16a: phoneme identity observations

This additive contract measures distinctions in the original development archive.
It changes no generator path, weights, phoneme/grapheme inventory, old mapping,
output fields or RNG use. There is no candidate generation run and no claim of
improved human wordlikeness.

`identity-original.json.gz` contains the full observer report, separate source
fingerprint, original provenance, profile/seed/stratum counts and trace witnesses.
`independent-check.json` records a second implementation's agreement with every
raw-symbol, nucleus-stress and coarse-preimage count in all 20 original shards.
`verify_identity_counts.py` imports no generator or TypeScript observer; its
inventory and old mapping are read from the pinned original generator source.

| Profile | Words | Segments | Ambiguous `ɜ` segments | Unmapped symbols |
| --- | ---: | ---: | ---: | ---: |
| Default lexicon | 50,000 | 323,611 | 852 | 0 |
| Bare lexicon | 50,000 | 317,625 | 1,112 | 0 |
| Bare monosyllables | 50,000 | 264,100 | 785 | 0 |
| Default text | 50,000 | 241,270 | 707 | 0 |
| Total | 200,000 | 1,146,606 | 3,456 | 0 |

The complete source-identity accounting is 1,143,150 resolved + 3,456 ambiguous
and 0 unknown = 1,146,606 segments. This is a source-interpretation distinction,
not a phonotactic acceptability judgment.

The legacy coarse projection merges these observed source counts:

- AH: 79,995 `ə` + 18,834 `ʌ` = 98,829.
- ER: 25,842 `ɚ` + 3,456 `ɜ` = 29,298.

It also erases 46,810 recorded aspiration realizations. There are 394,269 nucleus
segments; 25,930 have `reduced: true`. None has a recovered underlying identity
in this observer. Missing reduction flags remain unknown, not false.

All 50,000 forced monosyllables are unmarked for stress under the legacy output
contract. Consequently their explicit-stress completeness is zero. This is
missing representational evidence, not 50,000 stress errors. Likewise, the
200,000 supported syllable structures establish slot compatibility only, not
legal rimes, plausible words or an implemented General American dialect.

Reproduction requires the original raw archives and the pinned #307 evaluator
documented in `docs/phoneme-identity.md`; the committed compressed report is not
a replacement for the archives. The observer protocol was fixed before this run.

```sh
npx vitest run --config vitest.identity.config.ts
npx tsc -p tsconfig.identity.json
node --import tsx evaluation/quality/probes/phoneme-identity.ts \
  --run /path/to/2026-09-26-development-standalone \
  --out /new/path/identity-original.json
python3 evaluation/experiments/phoneme-identity/verify_identity_counts.py \
  /path/to/2026-09-26-development-standalone \
  /new/path/identity-original.json /new/path/independent-check.json
```

The observer checks full archive integrity before and after processing; it
requires pinned source contents, their generator digest, exact expected/pinned/
filesystem shard sets, and matching summary/measured profile and seed schedules.
It never regenerates words or overwrites an existing result.

Verification: 25 observer tests; 19 archive-integrity fixtures; full unit suite
422 passed/1 skipped; quality suite 12 passed; strict runtime and observer/probe
typechecks passed; touched-file lint passed. Full repository lint retains 11
pre-existing errors in unchanged `language.test.ts`, `generate.ts` and `write.ts`.
The 2,000-word public-API fixture verifies unchanged words, trace-on/off parity,
RNG-call equality and the next RNG value, including when observations are mutated.

Observer fingerprint:
`476aeca7b45c1b7c9fc8bdd6481354c1c05543fd3b1f72c6726123cbbe3408f6`.
Original manifest digest:
`a23414ae34d3611c4367d07ad677afb99e7d89a4be7886e6ed95018c2ff3f3da`.
Uncompressed report SHA-256:
`0e8367a1193d8700129e4b8f82548bbfaab270523433e344a722a653a30ec292`.
