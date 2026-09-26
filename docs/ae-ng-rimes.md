# Restoring /æŋ/ rimes

The default English configuration now permits nucleus /æ/ with /ŋ/ in its coda,
including continuations such as /æŋz/. The runtime change removes one exclusion
from `codaConstraints.bannedNucleusCodaCombinations`. Weights and gate thresholds
are unchanged. Custom exclusions keep their existing meaning: every listed
nucleus sound is incompatible with every listed coda sound. The remaining
/ɚ,ɝ/+ŋ exclusion is unchanged.

This restores a documented English pattern, rather than selecting an optimal
frequency. The [pinned CMU dictionary](https://raw.githubusercontent.com/cmusphinx/cmudict/74790861f652b15e4ac49015a90074ad62a27690/cmudict.dict)
contains *bang*, *hang* and *sang*. Ladefoged's
[American stressed-vowel distribution table](https://www.phonetics.ucla.edu/course/chapter4/4vowels.html)
also illustrates /æ/ before /ŋ/ with *hang*.

The unchanged [PR #304 reference model](https://github.com/unglish/word-generator/pull/304),
pinned at commit `820f80dd72edac7d69ffc7c4e03212f2e2399a2f`, contains these observations:

| Rime context | All rimes | AE with NG in its coda | Exact AE NG |
| --- | ---: | ---: | ---: |
| Final, stressed | 36,632 | 223 | 59 |
| Final, unstressed | 80,853 | 14 | 9 |
| Medial, stressed | 110,343 | 594 | 542 |
| Medial, unstressed | 61,447 | 21 | 19 |
| Total | 289,275 | 852 | 629 |

Its stressed category includes primary and secondary stress. These are
word-type counts after its documented filtering and onset-maximizing
syllabification, including names, loans, compounds and inflections. They support
availability of the rime, not a target proportion or new hard bans on other
vowels. The exact model/file/source hashes and extraction counts are preserved
in [reference evidence](../evaluation/experiments/ae-ng-rimes/reference-evidence.json).

## Measurement contract

The [preregistered protocol](../evaluation/quality/probes/ae-ng-rimes-protocol.json)
and its observer were frozen before candidate capture. Each source revision has
200,000 development outputs across four profiles and five streams. The observer
reads the complete existing archives without generation. Original archives
remain unchanged.

Three layers are counted separately:

- `generateSyllables.after`: selected initial bases, including boundary changes
  inside generation, before later stress repair.
- `generateWrittenForm.before`: selected bases after structure and stress repair,
  before spelling, reduction and morphology in these source revisions.
- Final `word.syllables`: surface words after morphology and pronunciation.

Counts include all syllables, nuclei containing /æ/, closed /æ/ syllables, codas
containing /ŋ/, exact /æŋ/ rimes, and extended codas. The denominator describes
selected outputs. Historical traces cannot supply unrecorded rejected proposals
or planned-coda opportunities. Stage stress is unavailable because the original
snapshots omit stress marks; final unmarked stress is recorded separately from
primary and secondary stress.

The observer counts pairs introduced or removed between comparable root stages,
including stress repair, rather than treating every final /æŋ/ as evidence that
it was available during initial coda sampling. Missing stages remain unavailable;
duplicate matching stages are rejected. It does not infer root-to-surface
identity through affixation.

## Frozen sample results

All 20 candidate streams contain initial /æŋ/ pairs. Counts below are syllables
containing the pair; all profiles contain 50,000 selected words per source.

| Profile | Initial pairs, original→candidate | All initial syllables, original→candidate | Prepared pairs, original→candidate | Final surface pairs, original→candidate |
| --- | ---: | ---: | ---: | ---: |
| Lexicon, default morphology | 0→249 | 97,665→97,866 | 3→251 | 3→206 |
| Lexicon, bare | 0→223 | 123,213→122,831 | 5→229 | 5→212 |
| Forced bare monosyllables | 0→763 | 50,000→50,000 | 0→763 | 0→763 |
| Text, default morphology | 0→429 | 69,962→70,349 | 1→431 | 1→411 |

The original nine prepared pairs all arose during later stress repair. The
candidate has 1,664 initial pairs (683 exact and 981 extended), with 16 further
introductions and six removals before spelling, yielding 1,674 prepared pairs.
Its 1,592 final surface pairs are a different layer; the report does not assume
that morphology preserves syllable ownership. Both complete archives pass the
independent Python recount, including every replicate and stratum.

The [full comparison](../evaluation/experiments/ae-ng-rimes/comparison.md)
retains mixed outcomes. Trigram divergence rises in all four profiles. In forced
monosyllables, adjacent duplicate-coda words increase from 5,429 to 5,539 and
final-open-checked-vowel words from 218 to 242. In bare lexicon outputs,
final-open-checked-vowel words fall from 1,391 to 1,343. Changed RNG paths and
composition mean these are sample changes, not paired-word causal estimates or
confidence intervals.

The seed-42 `ang` witnesses also show why spelling counts cannot substitute for
rime evidence. The first three matching draws (`antimangs`, `wolcang`,
`pacteang`) have schwa or FLEECE nuclei in the relevant generated syllables.
Later traced `angless`, `unangs` and `wang` do have generated /æŋ/, with /æ/→a
and /ŋ/→ng decisions in the same root syllable. In `angless`, later reduction
changes surface /æ/ to schwa. The saved six full traces illustrate these paths;
they do not attribute every `ang` occurrence to a single cause.

Validation: 11 public-API fixtures and 24 observer/archive fixtures pass; strict
TypeScript and touched-file lint pass; the quality suite passes all 12 tests.
The full unit suite has 407 passes, one skip and the one `ang` gate failure.
Repository-wide lint retains 11 pre-existing errors in untouched files; its log
is included with the compact evidence. The runtime diff is only the exclusion
removal, and the same frozen evaluator/probe scores both archives. The isolated performance
checks pass at 7,624 words/second (4,500 floor), with median batch variance
1.29× (3× ceiling). This is a threshold check, not a paired throughput-improvement
claim.

## Reproduction

The archive observer requires the frozen top-level evaluator from
[PR #307](https://github.com/unglish/word-generator/pull/307), commit
`5a4ff2e72b3cb81e563f174f52f115eec9057ca6`, with evaluator fingerprint
`ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007`.
The locally copied tooling is not part of this PR. Restore its top-level
`evaluation/quality/*.ts` and `protocol.json` unchanged, or use that foundation
once integrated. The probe checks the pinned source archive, generator digest,
foundation bytes, exact shard set, all draw identities/order, summary schedule
and every archived checksum before and after observation.

```sh
npx vitest run src/core/ae-ng-rimes.test.ts
npx vitest run --config vitest.rimes.config.ts
npx tsc -p tsconfig.rimes.json
node --import tsx evaluation/quality/probes/ae-ng-rimes.ts --run ORIGINAL_RUN --out original-rimes.json
node --import tsx evaluation/quality/probes/ae-ng-rimes.ts --run CANDIDATE_RUN --out candidate-rimes.json
python3 evaluation/quality/probes/verify-ae-ng-rimes.py ORIGINAL_RUN original-rimes.json original-check.json
python3 evaluation/quality/probes/verify-ae-ng-rimes.py CANDIDATE_RUN candidate-rimes.json candidate-check.json
```

The independent Python implementation imports neither the generator nor the
TypeScript observer. It recounts every layer, transition and stratum from raw
draws and compares every profile/replicate count.

## Limits

This change does not repair nucleus/coda incompatibilities introduced by later
stress replacement, reduction or morphology. It does not change final-open
checked-vowel behavior. Those require separate contracts and measurements.
Current public generation hardcodes a single nucleus segment; the observer
still accounts for multi-segment archived nuclei, and fixtures preserve the
custom configuration's list cross-product semantics without pretending to
generate unsupported nucleus structures.

The existing seed-42 trigram gate fails on `ang`: 3.3229955624× against a 3.21×
threshold. The threshold and generator weights remain unchanged. This candidate
therefore has a demonstrated availability correction and a distribution
regression; it does not establish a general output-quality or human-preference
improvement.
