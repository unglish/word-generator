# Ordinary e before /t/

The /ɛ/ → e entry previously excluded a following /t/, including across syllable
boundaries. Every observed eligible choice in the original 200,000-word development
archive selected ea. Removing that condition restores the ordinary et family while
retaining ea. The source change deletes only the condition: e keeps frequency 100
and positional weights 10/10/5; ea keeps frequency 140 and weights 0/10/5.

English supports both spellings: Cambridge records [wet](https://dictionary.cambridge.org/pronunciation/english/wet)
and [sweat](https://dictionary.cambridge.org/pronunciation/english/sweat) with the same
vowel and final /t/. Cambridge writes this vowel /e/; the generator labels it /ɛ/.
These examples establish that a categorical ban on e is wrong. They do not establish
a corpus ratio for e versus ea. The existing weights remain provisional, and no
trigram target or quality threshold is changed.

## Scope and interpretation

The condition reads the next phoneme in the flattened spelling input. It therefore
suppressed e both in a nucleus+coda rime and when t begins the next syllable. The
change restores the choice in both environments. Position weights still use the
existing syllable-based semantics: ea is excluded in initial and isolated syllables
when e survives, while noninitial syllables can retain both. The separate legal
positive-weight selection change is not part of this branch.

The conditioned denominator is /ɛ/ at the spelling stage. Subsequent pronunciation
reduction can change that vowel, and repairs can change the selected written unit.
Cross-syllable adjacency is not evidence that the generator's open-vowel structure
or stress assignment is linguistically correct. Those issues require their own
changes. This change does not introduce lexical knowledge of exceptional words,
fit spelling frequencies, or establish a human wordlikeness improvement.

The [preregistered supplementary probe](../evaluation/quality/probes/ordinary-et/README.md)
is separate from the frozen quality evaluator. It measures eligible decisions,
selection, surviving traced letter ownership, and raw versus attributable ea/eat
occurrences by adjacency, base-word position, actual morphology, and final syllable
count. Original and candidate captures use the same immutable development protocol.
Affix assembly can leave historical ownership stale; the probe marks final
attribution unavailable unless the traced surface exactly matches the final word.
Ownership remains the existing trace's alignment inference, not a new alignment
algorithm. Legacy singleton weights are synthetic 1s, so a positive traced weight
alone cannot prove their actual inventory weight was positive.

Recorded string repairs are identified by the writer/gap-spelling rule families;
pre-spelling phonological repairs are excluded. A string repair elsewhere in an
eligible word is contextual evidence, not proof that it changed the /ɛt/ pair.
Some existing writer transformations have no repair event: duplicate deletion at
syllable joins, boundary u insertion, and the post-join vowel cap. Absence of an event
therefore does not mean absence of a rewrite. For example, original archive
lexicon-bare/1304238451 draw 963 emits cageeatsaps, writes cageatsaps, and records no
repair; the second e belonged to the eligible ea unit after ge. The probe separately
records changes to the pair's owned letters and retains full traces with archive
draw coordinates, without inventing the missing event provenance. Shorter spellings can change length rejection
and RNG consumption, so equal stream indices are not matched lexical candidates.

## Reproducible public-API checks

Use `generateWord({ seed, morphology: false, trace: true })`:

| Seed | Choice | Adjacency | Evidence |
|---|---|---|---|
| 46 | e | Across syllables | e survives condition and position filters |
| 301 | e | Within a rime | e survives; a later no-final-i repair changes another unit |
| 879 | ea | Within a rime | Unchanged weights: e 500, ea 52.5 |
| 3035 | ea | Across syllables | Unchanged weights: e 1000, ea 1400 |

The continuous 10,000-word bare seed-42 fixture checks all eligible decisions for
e availability, verifies both adjacency types select e and ea, and checks a broad
selection bound derived from the unchanged 100:140 weights rather than a fitted
trigram target. Dedicated probe checks distinguish raw substrings, traced ownership,
missing final alignment, and pre-spelling versus string repairs.

## Isolated development result

The verified original and candidate archives each contain 200,000 words (four
profiles, five distinct seed streams, 10,000 continuous draws each). The primary
availability criterion passes: e survives both condition and position filtering for
all 2,632 candidate /ɛ/+t choices, versus 0 of 2,917 original choices.

| Adjacency | Original eligible / e / ea | Candidate eligible / e / ea |
|---|---|---|
| Within rime | 1,249 / 0 / 1,249 | 1,162 / 1,082 / 80 |
| Across syllables | 1,668 / 0 / 1,668 | 1,470 / 1,388 / 82 |
| Total | 2,917 / 0 / 2,917 | 2,632 / 2,470 / 162 |

| Profile (50,000 words each) | Original eligible pairs | Candidate eligible / e / ea |
|---|---|---|
| Lexicon, morphology enabled | 842 | 851 / 796 / 55 |
| Lexicon, bare | 1,385 | 1,180 / 1,099 / 81 |
| Monosyllables, bare | 172 | 174 / 174 / 0 |
| Text, morphology enabled | 518 | 427 / 401 / 26 |

Raw final eat occurrences fall from 3,288 to 580. In traced base surfaces, eligible
/ɛ/+t choices account for 2,880 of 3,165 eat occurrences originally and 157 of 457
in the candidate. Among final outputs whose ownership surface matches the output,
the attributed counts are 2,340/2,583 and 128/378. Final attribution is unavailable
for 546 original and 603 candidate eligible pairs; those cases are not counted as
unaffected. Eligible-pair ea contributions to all base ea occurrences are
2,880/15,111 and 157/12,308. These are occurrence counts, not lexical type frequencies.

The frozen comparison records small mixed distribution changes. Trigram
Jensen–Shannon divergence decreases in all four profiles (about 0.00059–0.00161
bits), but missing-reference trigram mass increases by 0.00303 in bare lexicon and
0.00087 in text mode. Unique spellings change by +157, +54, −7, and −53 respectively.
Mean letter length decreases by 0.00334–0.02368. All other frozen diagnostics and
morphology/length strata remain visible in the comparison artifacts; these changes
do not establish a general quality gain.

## Exploratory blocker for leaving draft

The primary spelling correction exposes an existing downstream defect. The
character-only magic-e rule in `src/config/english.ts` matches
`([aiouy])e([bcdfghjklmnpqrstvwxyz])$` with 95% probability. It can treat /j/ → y as a
vowel and rewrite yet → yte. The named supplementary measure
`exploratory:consonantalYMagicE` requires the actual /j/, /ɛ/, /t/ choices, their
same-syllable positions, and the recorded repair. It observes 0/2,917 eligible
original pairs versus 13/2,632 candidate pairs (0.494%): five bare lexicon, seven
morphological lexicon, and one text-mode case. A raw yet → yte string count is 19;
the other six do not establish the same consonantal-y error, illustrating why the
phoneme-role condition matters.

Reproduction: lexicon-bare seed stream 1304238451, zero-based draw 354, produces
**ytecose**; its first syllable has /j ɛ t/, emits yet, and records
`spellingRule:magic-e`, yet → yte. The focused test and archived witness retain this
case. This detector was added after inspecting the candidate and is explicitly
exploratory, not a changed preregistered success criterion.

Keep this PR in draft until Q13/Q14a resolves the dependent spelling repair using
aligned grapheme/phoneme roles. A special y ban or tuning e's weight would hide the
underlying error. The isolated source change stays limited to restoring e.

Validation: the full suite passed 404 tests with one skip; the subsequent focused
behavior/probe suite passed 11 tests. Quality passed 12/12. Quiet performance passed
at 7,750 words/sec (floor 4,500), with 1.39× median batch variance (limit 3×). Source
and probe typechecks and touched-file lint pass. Repository-wide lint retains 11
errors in untouched files from origin/main. The focused simplification review
kept the three-line runtime change and did not broaden the repair work.

The compact capture, full comparison, and both supplemental probe reports are
committed under `evaluation/experiments/ordinary-et-spelling/`. The manifest pins
the complete local raw archives; raw word shards are not included in Git.
