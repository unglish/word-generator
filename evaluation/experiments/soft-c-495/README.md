# Soft c and sc before a, o, and u

PR #551 fixes a spelling that cues /k/ for an intended /s/. The comparison uses
the parent of the PR's code commit as the baseline.

| Mode | Seed | Draws per build | Baseline mismatches | Fixed mismatches |
| --- | ---: | ---: | ---: | ---: |
| Lexicon | 20261124 | 20,000 | 281 | 0 |
| Lexicon | 495550 | 10,000 | 153 | 0 |
| Text | 40959 | 10,000 | 100 | 0 |

The audit runs the public generator with tracing. It counts retained root
letters `c` for /s/ followed by a written `a`, `o`, or `u`, including across a
suffix boundary, when the root letter's source is unambiguous. It verifies that
the spelling cells reproduce the base and that the emitted morphology parts
reproduce the final word. Each build starts with the same RNG seed. The choice
of spelling can affect which candidates pass selection, so later draws from
the stream need not contain the same words.

The paired replay uses an independent seed for each draw. It chooses distinct
words with the same intended pronunciation and exactly one targeted respelling.
The 50 examples cover one-letter `c`, a complete `sc`, loss of final `e` at a
suffix boundary, and hard `c` before /eɪ/ and /ɚ/.

From a checkout with `tsx` installed, use the absolute paths to `src/index.ts` in
the baseline and fixed checkouts:

```sh
node --import tsx /absolute/path/to/audit.mjs "$baseline" > baseline-audit.jsonl
node --import tsx /absolute/path/to/audit.mjs "$candidate" > candidate-audit.jsonl
node --import tsx /absolute/path/to/paired.mjs "$baseline" "$candidate" > samples.json
```

The full `npm run check` passed on the fixed code with 1,627 tests.
