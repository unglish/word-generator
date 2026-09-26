# Q09: complete secondary-stress patterns and rhythm

Read-only design, 2026-09-26. No generator edit or new capture was performed.

## Recommendation

Make Q09a a semantics-preserving complete-pattern and stress-origin foundation on an explicit Q04 + Q08 stack. Then make Q09b a separately measured, initially opt-in **root-domain placement experiment**: jointly sample a complete secondary pattern while preserving the legacy proposal's number of secondary stresses and softly preferring less adjacent prominence. Do not start with a universal no-clash rule or a default disyllable ban.

This is deliberately narrower than a complete English metrical grammar. Its testable hypothesis is that some clashes are artifacts of independent placement decisions and can be reduced without obtaining an apparent win by deleting secondary stresses. Disyllables with one primary and one secondary stress have no alternative placement: they remain unresolved by this hypothesis. Changing how often a disyllable receives secondary stress is a distinct, data-dependent question. Do not silently sell the proposed placement experiment as fixing the current ~40% disyllabic rate.

Default activation should follow separate review of the frozen experiment and the lapse/reduction guardrails below. The initial optional policy is a modeling experiment, not a claim that the numerical penalty estimates English speakers' grammar.

## Source state and dependency control

Read these exact states, rather than assuming any worktree still contains an earlier branch:

- Q04 / #309, `codex/final-lexical-stress`, `d1d518920e96cfb69515ebe5f41672be269c1364`: lexical root, assembled lexical form and one surface realization. Relevant files are `src/core/generate.ts`, `pronounce.ts`, `morphology/attach.ts`, `lexical.ts`, `trace.ts`, `types.ts`, and `docs/lexical-realization.md`.
- Q08a / #319, `dd957d4713baa1838bd461e8b19d420741a0cce0`: shared weight plus the full control evidence; runtime foundation was `82b9152`.
- Q08b / #322, `70290d06b9b99fe9e4c1c3da33cae0c2b2c8b5dc`: partial quantity activation; archived generator digest `45143bfa5b4b1c6c249b5d14c92cfccc90f32da4298eb25857d9e4978acff276`. Its quantity observer remains frozen at `0fae63827768edc4d4c27dc8a3bef45a46ead5ef2a5829633a50437ef25c5911`.

These are independent branches, not an already measured combined runtime. Resolve the overlapping `applyStress` implementation deliberately: retain Q04's internal primary on monosyllables, Q08's single shared analysis and detached quantity data, and the correct trace domain. Do not recreate Q08's old `selectedIndex: null` convention in the integrated lexical pipeline merely to satisfy old fixtures. Update the new observer's contract; never relabel old observations.

**Composition prerequisite found during this review:** Q04 `cloneSyllables` uses shallow `{ ...phoneme }` copies. With Q08 nested `nuclearQuantity`, those copies alias the quantity object across root/assembled/surface forms. Deep-copy structured phoneme metadata and test mutations between all three forms and config. If Q07 is included, cover `nucleusWordPosition` as well. This is an integration correction before the dependency-control capture, not part of rhythm tuning. Keep Q06 resolved morphology when it is part of the integration base; otherwise declare that dependency separately rather than inadvertently reintroducing planned-affix reconstruction.

Freeze one full 200,000-word integrated dependency control before Q09 behavior. Its outcomes cannot be inferred by adding the separate #309 and #322 deltas. Preserve #307's original baseline, each independent PR's archive, the new immediate control, and later the Q09 candidate. Q09a must show exact complete-word, legacy-trace and RNG parity against this integrated base after removing only its additive trace field. Do not run this capture before composition review.

## What the current code actually does

`src/core/pronounce.ts:193–346` on Q08b:

1. Compute shared weight once, then choose primary stress. OT evaluates primary positions only; its WSP is not a whole-pattern secondary-stress objective.
2. `applySecondaryStress` considers the first three root syllables (or every nonprimary syllable under a custom option), excluding only the primary index. Each candidate gets heavy/light weight 70/30. It draws a candidate, then applies it with 40% probability. A disyllable has one candidate, necessarily adjacent to primary.
3. `applyRhythmicStress` scans interior syllables left to right. An unmarked syllable is considered only if both current neighbors are unmarked under the default setting; it receives secondary stress with 40% probability. Earlier insertions change later eligibility. The pass cannot remove a clash introduced by step 2 and never inserts stress at a word edge.
4. Q08 `trace.stressWeight` is written **before** the rhythmic pass. Its `secondary` record is the explicit secondary selection, not the entire resulting pattern.

Q04 retains this root procedure, then `prepareMorphology` applies affix effects. An attracting/primary suffix demotes previous primary to secondary; a secondary affix supplies another mark. No subsequent whole-pattern reconciliation occurs. `word.lexical.root`, `word.lexical.syllables` and `word.syllables` are three different observational domains. Root indices require `rootSyllableStart` to locate the assembled syllable.

Reduction is separate. The English config allows reduction under secondary stress with a 30% multiplier. It also skips tense vowels. Thus surface secondary-stressed schwa does not by itself prove that a weak vowel received lexical stress, nor does a full vowel prove secondary stress. Do not infer underlying identity or a missing stress label from vowel quality. The generated IPA is not an acoustic model of duration, pitch accent or sentence rhythm.

## Existing measured evidence

These samples use 50,000 words per profile; the two candidate columns are independent experiments, not a combined treatment:

| Final disyllabic adjacent primary/secondary labels | Original | Q04 #309 | Q08b #322 |
| --- | ---: | ---: | ---: |
| lexicon-default | 4,467 / 21,065 (21.206%) | 8,778 / 20,947 (41.906%) | 4,453 / 21,086 (21.118%) |
| lexicon-bare | 9,320 / 22,919 (40.665%) | 9,428 / 23,122 (40.775%) | 9,252 / 22,848 (40.494%) |
| text-default | 2,453 / 17,103 (14.343%) | 7,584 / 17,040 (44.507%) | 2,464 / 17,181 (14.341%) |

Q04 restores missing primary stress, exposing many previously uncountable primary/secondary adjacencies. Treating the lower original aggregate as intrinsically better would reward a known missing-primary defect.

The Q08b observer separately records pre-rhythm root primary/secondary decision clashes: 10,769 / 31,089 multisyllabic roots in lexicon-default; 14,712 / 43,464 in lexicon-bare; 4,326 / 12,474 in text-default. These are not the same metric or denominator as final disyllabic clashes. The baseline control counts are 10,731 / 31,205; 14,755 / 43,577; and 4,336 / 12,489.

Q08b's unknown quantities remain explicit (107,688 / 340,282 root nuclei); its operational fallback is not known linguistic weight. Its final default monosyllabic-schwa regression (+1.013 pp) and unchanged failing rare-`ugh` gate remain disclosed. Neither may be erased from the record by choosing a newer comparison only.

Historical availability:

- Original: final labels are observable; precise earlier root decisions and rhythmic provenance are unavailable.
- Q08a/b: primary and explicit secondary decisions are observable; separate rhythm provenance is unavailable. Affixed final labels do not recover the root pattern.
- Q04: root, assembled lexical and surface labels plus stress-bearing stage snapshots are observable; individual mark origins are not fully attributed.
- Q09a: add explicit origins and complete stage patterns; do not fabricate them for earlier archives.

## Linguistic constraints on the design

English secondary stress is not determined by one categorical anti-clash rule. Pater's analysis documents interactions among weight, position and base-stress preservation, including surviving adjacent stresses and lexically conditioned variation. Its examples distinguish initial from medial pretonic environments. This supports recording morphology and direction; it does not license assigning an invented lexical exception class to arbitrary generated roots. [Pater (2000), §§1.2, 2](https://people.umass.edu/pater/pater-2000.pdf).

Acoustic prominence must also be distinguished from lexical annotation. Plag, Kunter and Schramm's experiment finds a strong role for pitch accent in the primary/secondary contrast and much weaker acoustic separation in unaccented words. A printed primary/secondary sequence is therefore not a complete model of perceived rhythm. [Plag, Kunter & Schramm (2011)](https://www.anglistik3.hhu.de/fileadmin/redaktion/Fakultaeten/Philosophische_Fakultaet/Anglistik_und_Amerikanistik/Ang3_Linguistics/Dateien/Detailseiten/Plag/2020/Acoustic_correlates_of_primary_and_secondary_stress_in_North_American_English.pdf).

Q08's named quantity analysis remains a separate assumption. English weight effects and final-vowel behavior do not justify identifying quantity with the legacy tense flag. [Moore-Cantwell (2021)](https://www.cambridge.org/core/journals/phonology/article/weight-and-final-vowels-in-the-english-stress-system/30EDBFA90E382F68C400EEFCFC0DA31D).

These sources motivate distinctions and soft preferences. They do not supply a calibrated penalty, a universal disyllable target, a dictionary-wide desired stress rate, or a reason to assume that every generated root is a noun, verb, compound or monomorphemic English lexeme.

## Q09a: typed complete-pattern observation, no behavior change

Add a reusable pattern analysis and a detached trace record, without mutating stress or consuming RNG. Represent marks as typed syllable observations; distinguish known unmarked from unavailable. Keep source/domain, primary coordinates and optional secondary coordinates explicit. Do not encode morphology classes by spelling heuristics.

Suggested trace domains:

- `root-after-primary`
- `root-after-explicit-secondary`
- `root-after-rhythmic`
- `assembled-after-morphology`
- `final-lexical-before-realization`
- `surface-after-realization`

Record actual secondary candidate weights, selected index, gate result, and each rhythmic iteration's eligibility, neighbor marks at that iteration, roll when one was executed, and resulting mark. Keep old Q08 fields for compatibility. A snapshot does not invent a draw for an ineligible syllable. Record affix stress events with planned/resolved affix identity, root/full coordinates, prior mark and origin, resulting mark and cause. Distinguish generated root secondary stress, rhythmic insertion, explicit affix secondary stress, and demoted root primary. Retain provenance links through later overwrites rather than a single ambiguous last-cause string.

Provide pure analyses for complete patterns: primary count, secondary count, adjacent marked pairs broken down as primary-before-secondary, secondary-before-primary, secondary-secondary; maximal unmarked runs, edge runs versus internal gaps; distance from primary; and known/unknown operational weight strata. “Clash” and “lapse” must name these exact proxies, not imply that every counted case is ungrammatical. Keep auditory/metrical-foot interpretations outside the data type.

A new observer may calculate descriptive full patterns from Q04 archives, but must mark absent event provenance as unavailable. Source checks, full shard/hash/coordinate validation, aggregate reconciliation and exclusive report creation should follow the established frozen probes.

## Q09b: one minimal placement hypothesis

Keep primary choice, quantity, morphology, repair, reduction and spelling rules fixed. Target the **entire root secondary pattern**, combining the two present placement mechanisms. Do not run a second rhythm sampler on the assembled word in this PR.

Let `q(P | x)` be the complete-pattern law induced by the current explicit-secondary and left-to-right rhythmic procedures for a fixed root input `x`, fixed primary position and current configuration. Preserve their candidate window, 70/30 weights, 40% gates, position restrictions and legal support. Multiple histories yielding the same final pattern contribute summed probability. The zero-total-weight fallback, disabled flags and probabilities 0/100 are part of the actual contract, not opportunities to approximate the prior.

Draw a legacy proposal in a temporary structure and record its secondary count `K`. That proposal uses real RNG decisions and is explicitly labeled as a proposal, not as applied stress. Then sample a complete pattern within the same count:

`q_lambda(P | x,K) = q(P | x,K) * exp(-lambda*C(P)) / Z(x,K)`

where `C(P)` is the number of adjacent marked syllable pairs (primary-secondary and secondary-secondary counted separately in diagnostics). Use a named experimental policy with a finite configurable penalty; the first preregistered test value can be `lambda = ln(2)` (each additional adjacency halves conditional mass). This value is a transparent experimental choice, **not** a literature-derived English estimate. Freeze it before outcomes. Do not search several penalties and select one against the existing quality gate.

Only apply the selected pattern to the root once. Every applied pattern preserves the actual proposal's secondary count exactly. Every pattern with positive prior probability retains positive probability. A two-syllable `K=1` pattern cannot improve its placement and is unchanged. For a four-syllable input with primary at index 2, secondary at index 1 clashes while index 0 does not; the joint sampler can redistribute that mass if both placements have prior support. Quantity preferences remain in the prior, while the new soft preference can trade off against them. Measure that tradeoff explicitly.

The proposal makes the count-preservation guarantee literal even for supplied deterministic RNG functions. New policy RNG consumption need not match legacy; the legacy policy path must retain exact output/RNG parity. Do not pad draws to retain lucky gate outcomes. A chosen pattern's origin is `root-pattern-sampler`; analytically contributing legacy paths are model support, not falsely reported executed historical events.

Implement the complete law without silently truncating candidates. A direct enumeration is useful as a small-input reference, but custom configurations and naturally generated longer roots need an exact dynamic program or equally exact method. Track the legacy proposal branch and local neighbor state, secondary count, and clash cost; use stable log-space normalization and backward sampling. Trace bounded witnesses and mass summaries rather than exponentially large candidate dumps. An exponential cap followed by an undocumented fallback is not acceptable.

The initial behavioral scope preserves the legacy proposal's support and may retain its directional bias. It does not introduce a new foot theory, repair all stress windows, or claim a final assembled metrical grammar. Moving the policy after morphology would additionally require a decision about preserving stem stress, protected affix marks, and optional root stress under derivation; that is Q09c, after its own protocol. Q04 final snapshots let us measure those residuals without erasing legitimate morphological prominence.

## Preregistered targets and guardrails

Before candidate generation, pin the integrated control source/evaluator/config, Q09 observer, active penalty, sampling schedule, availability rules and metric definitions. Retain the existing 4 profiles × 5 distinct streams × 10,000 words development schedule; reserve validation seeds for a frozen candidate. Do not claim stream independence or pair later words by draw number.

Mechanism target (fixed decision input, not final-word proxy): conditional expected adjacency under the active law must be no greater than the legacy conditional expectation for every observed `(x,K)`, and strictly lower wherever adjacency varies among supported patterns. Independently recompute the masses/costs in the observer. Report eligible count, strict-improvement count, unchanged support-only cases, and the magnitude of expected reduction. Also report observed excess adjacency above the minimum available at the same `(x,K)`; never use aggregate zero clashes as a target.

Hard structural guardrails:

- Exactly preserve proposal `K`, fixed primary position, input segments, shared quantity observations and all explicit morphology stress operations.
- No missing/multiple final lexical primary; no primary-stressed reduced vowel introduced; no protected affix/demoted-primary deletion. Apply these only where the integrated control's contract supplies the evidence.
- Positive-support preservation, normalized finite mass, deterministic seeded output, observational trace-on/off parity, legacy-policy exact word/trace/RNG parity, and detached snapshots.
- Keep unknown quantity, unknown class/compound status, and unavailable historical origins visible.

Broader empirical guardrails (report all, do not silently optimize them):

- Distribution of secondary count and actual proposal/application equality; the corresponding distribution after morphology may differ because marks can be overwritten.
- Long unmarked runs: maximum length, internal pairs and triples, initial/final runs. Quantify exact conditional expected changes as well as sampled changes. Lower clashes accompanied by longer lapses is a tradeoff, not an unqualified improvement.
- Secondary position relative to primary and root edges; weight and unknown/fallback strata; loss of heavy-syllable prominence; first-three support and primary-window defects.
- Root versus final lexical versus surface stress patterns, actual morphology and origin-specific boundary adjacencies. Preserve affix-induced cases as visible residuals.
- Lexical vowel identity versus surface reduction, especially secondarily marked schwa and full vowels without secondary marks. These are descriptive with current reduction rules, not automatic violations.
- Every frozen core diagnostic, full phoneme/trigram counts, rejection/length composition and bounded complete traces. Disclose any increased default monosyllabic schwa, open checked rimes, missing stress or rare-`ugh` failures under the same thresholds.

Do not select a favorable subset of profiles. A production-default proposal needs an explicit review decision if lapse, vowel realization or conditional weight behavior worsens; preserve the failed/tradeoff candidate and preregister any revised hypothesis separately. Blinded read-aloud/stress judgments are needed before claiming perceived English rhythm improves. CMU stress-code patterns from Q15a can offer descriptive matched-length/primary-position comparisons, but unknown morphological class, names/loans and transcription conventions prevent treating its aggregate clash rate as a universal target.

## Meaningful public-API fixtures and verification

Generate all words through public APIs. Test pure pattern analysis directly only as an exported analysis helper; do not test internal generation routines.

- Fixed-primary custom inventories with 2, 3, 4 and longer roots; supports containing both clashing and nonclashing placements; invariant count and positive surviving clash probability.
- Single-support disyllables: unchanged conditional pattern, explicitly not an alleged English ban.
- Secondary/rhythm independently disabled; probability 0/100; all-nonprimary versus first-three; zero weights matching legacy fallback; all-unmarked opportunities before/after sequential insertions; different histories collapsing into one pattern.
- Small-root exhaustive independent reference versus exact sampler masses, normalization and deterministic boundary cases; longer custom roots without truncation or hidden fallback.
- Morphology `none`, `primary`, `attract-preceding`, and explicit `secondary`, including a promoted syllable next to a demoted root primary. Preserve origin and full/root coordinates; observe residual clash without deleting the anchor.
- Unknown quantity/custom inventories, nested-metadata mutations, trace-on/off RNG parity, and reduction enabled/disabled while lexical marks remain distinguishable.
- Sampling test of the declared conditional pattern probabilities, with preregistered statistical tolerance; not an implementation-mirroring assertion or a lowered existing quality threshold.

After source review: unit/quality/types/touched lint, scoped simplification, isolated performance, source freeze, full candidate capture and independent archived observer. The frozen #307 evaluator remains untouched. Package sources, exact schedule/protocol, all metrics, unfiltered review samples, full witnesses and availability flags before default-activation review.

## Explicitly deferred

Universal disyllabic secondary-stress suppression; inferred noun/verb/compound or lexical-stratum labels; trained English secondary-count priors; final assembled refooting; lexical exceptions; changed reduction probabilities; acoustic timing/pitch accent; primary stress-window/WSP redesign; and quantity/dialect expansion. These require their own evidence and dependencies. The recommended first pair of PRs supplies complete honest observation and one falsifiable placement intervention while preserving these unresolved questions.
