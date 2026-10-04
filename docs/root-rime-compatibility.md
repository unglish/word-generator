# Root nucleus/coda compatibility (Q10b1)

Nucleus replacement must preserve the configured compatibility of the coda already selected for that syllable. Previously, stress repair could replace an allowed vowel with one excluded before the retained coda. This change applies the same pair predicate during original coda selection, stress replacement, edge replacement, and the final lexical-root check before spelling.

This branch depends on Q07's realized nucleus edges (#314) and Q11's coda-extension checks (#313). Commit `13c2524dccabd58d37f5a8ec675eeffe1181df95` combines only those dependencies and is the incremental control. Q10a's removal of the default `/æ/ + /ŋ/` exclusion (#320) is **not** included. The active rules and all sampling weights remain unchanged; satisfying a configured exclusion is not a claim that the exclusion itself is linguistically justified.

## Contract and boundaries

A configured `bannedNucleusCodaCombinations` entry excludes the Cartesian product of its nucleus and coda sounds anywhere within one syllable. It is neither an adjacency rule nor an exact-rime template. Custom configurations supply the rule set; no implicit English exclusions are added.

Stress repair retains its existing trigger: only the first nucleus segment of a primary-marked syllable, when that sound belongs to `stressedNucleusBan`. Its eligible alternatives retain nucleus-only relative weights (`nucleus ?? 1`) and Q07's explicit edge eligibility. It does not start repairing later stressed nucleus segments or apply legacy positional multipliers to the stress-repick weights. Edge repair retains Q07's per-segment trigger and nucleus-times-realized-position weighting, including its legacy positional fallback.

Both existing replacement paths exclude alternatives that conflict with any retained coda segment. Individual weights must be finite and positive. An invoked repair with no eligible candidates, or an overflowing total weight, throws before the selection draw; an untouched nucleus does not trigger this check. Selection keeps the existing pool order and one RNG draw, including singleton pools. No additional repair sampler or coda deletion is introduced.

An assertion checks **every nucleus segment against every coda segment of every lexical-root syllable** before `generateWrittenForm`. The domain is the base root before later vowel reduction and affix assembly. Later custom reduction can introduce a configured pair, and a public API fixture demonstrates this boundary. This PR does not promise final assembled-word legality or coherent final morphological stress; those require their own changes and measurements.

Public generation currently hardcodes one nucleus segment, despite the existing `maxNucleusLength` setting. Multi-segment predicate, postcondition, and replacement tests use hand-built repair inputs and do not claim public multi-segment generation. The exposed-edge fixture with a retained coda also uses a hand-built input. Existing public Q07 fixtures exercise actual coda-loss edge repair; no edge repairs were observed in the dependency control's 200,000 returned words.

## Trace and measurement

Changed nucleus repair events gain an optional `nucleusReplacement` record with root coordinates, the retained coda, simultaneous initial/final edge flags, the weighting policy, eligible entry count, positive candidates excluded by pair rules, and remaining total weight. Array/object fields are detached snapshots. Other repairs keep their existing shape. The record describes sound-changing repairs; historical absent detail remains unknown.

The frozen observer reconciles repair events with the observed stage differences. Historical records must match the count and before/after sound-pair multiset; detailed candidate records must additionally form a bijection with changed nucleus coordinates. Missing, duplicated, or incompatible records fail validation. Onset, coda, nucleus length, and syllable count must remain unchanged during a nucleus-repair stage.

The registered primary endpoint is zero configured excluded segment pairs at `generateWrittenForm.before` across the candidate's selected returned lexical roots. Sampling-stage pairs, stress-created pairs, edge-stage transitions, later output pairs, morphology strata, root positions, and pool exclusions are reported separately. These traces cover the selected attempt, not all rejected proposals. The control introduced 22 pairs during stress repair: 5 in lexicon-default, 10 in lexicon-bare, 0 in monosyllables-bare, and 7 in text-default. Its initial and structural stages had none. Candidate results and all frozen metric tradeoffs are recorded with the experiment evidence.

The observer/protocol source fingerprint was frozen before the control target counts and before Q10b1 runtime changes: `a236febc098e021cea0a29209b0fce379cc3dc5091a618007ed1622f1bcb3a21`. The 200,000-word control source digest is `3c0d23e51161b5946cc9f947569bb2d649695f15446d842299944f5ed0ce43d1`; all 44 captured source files were independently checked against the dependency-only commit.

A separate unchanged-case replay clears only the configured pair exclusions identically in control and candidate. Across four profiles, five streams, and 1,000 returned words each (20,000 total), full output values, RNG call counts, and next RNG values match exactly. This is conditional parity evidence, not a claim that default outputs remain unchanged after a behavior correction. Trace-on/off parity is tested separately.

## Observed result

Each profile contains 50,000 selected returned words. The primary pair counts at the prepared root are:

| Profile | Original baseline | Dependency control | Candidate | Candidate nucleus × coda pairs | Candidate stress repairs with pair exclusions |
|---|---:|---:|---:|---:|---:|
| Lexicon default | 4 | 5 | 0 | 67,379 | 51 |
| Lexicon bare | 12 | 10 | 0 | 91,244 | 79 |
| Monosyllables bare | 0 | 0 | 0 | 112,033 | 0 |
| Text default | 2 | 7 | 0 | 56,301 | 34 |

The incremental result is **22/327,029 → 0/326,957** configured segment-pair violations. All candidate sampling, structural, stress-repair, edge-repair and final-output layers also have zero observed violations. Final-output zeros describe this sample and do not expand the root contract. All 19,300 candidate changed stress nuclei have bijectively reconciled replacement details; 164 repairs exclude 328 positive candidate entries. Neither control nor candidate has an observed edge repair, so that path's evidence is fixture-based. The five monosyllable raw shard hashes match the control exactly (50,000 traced outputs).

All three archives were independently counted in Python (600,000 draws total), matching every layer's counts and denominators and the repair-event totals. The candidate's 45 captured source files match the frozen files and current source exactly: `c6c6e85c0664ae237cd4df38b3b1d485d9b1b55658456d11b1920e557f10ac1f`.

The [full comparison](../evaluation/experiments/root-rime-compatibility/comparison.md) retains every frozen diagnostic and both references. Against the dependency control, unique spelling counts change by −10/−22/0/−9 across the four profiles. Trigram Jensen–Shannon divergence changes by +0.000201/−0.000528/0/+0.0000667 bits. Lexicon-bare open-final checked-vowel observations rise from 1,260 to 1,277; text-default missing-primary-stress observations rise from 9,992 to 10,007, with changing denominators. These mixed shifts are retained rather than treated as a single quality score. The original-to-candidate differences also include Q07 and Q11 and cannot be attributed to Q10b1.

Validation: 453 unit tests pass (one existing skip), 12 unchanged quality tests pass, 21 focused contract fixtures and 19 observer/archive fixtures pass, and strict types/lint pass. The isolated performance run passes both existing gates: 6,101 words/second against the 4,500 floor and 1.40× median batch variance against the 3.0× limit. This is an observed gate result, not a controlled estimate of performance improvement.

The earlier Q11 dependency remains a draft with an `ugh` gate failure in its recorded history. This run passes the unchanged gate (`ugh` ratio 0.0110 against floor 0.0062), but Q10b1 does not claim to repair that gate. The separate unchanged-generator study (#321) observed `ugh` failures in 12 of 20 predefined streams; no gate threshold is changed here.

## Reproduce

The probe requires the frozen Q00 evaluator from #307: the top-level `evaluation/quality/*.ts` files and `protocol.json` with evaluator fingerprint `ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007`. It is not standalone tooling. Copied evaluator files and `node_modules` are not part of this branch's changes. The baseline and candidate must use the same evaluator, reference files, environment, and development schedule.

```sh
node --import tsx evaluation/quality/cli.ts capture --id root-rime-candidate --cohort development --out memory/quality-runs/root-rime-candidate
node --import tsx evaluation/quality/cli.ts verify --run memory/quality-runs/root-rime-candidate
node --import tsx evaluation/quality/probes/root-rime-compatibility/analyze.ts candidate memory/quality-runs/root-rime-candidate memory/root-rime-candidate-observation.json
node --import tsx evaluation/quality/cli.ts compare --baseline memory/quality-runs/root-rime-control --candidate memory/quality-runs/root-rime-candidate --out memory/quality-comparisons/root-rime-compatibility
```

Use observer modes `control` and `original` for the dependency archive and the original standalone baseline. Each archive is verified before analysis: source, evaluator and reference digests; exact pinned and filesystem shard sets; artifact sizes/hashes; summary schedule; profile, seed and draw order; counts; and unchanged sources during observation. Corrupt, omitted, extra, duplicate, and reordered records have rejection fixtures. Never overwrite an archive or substitute a later evaluator silently.

Passing these contracts establishes a measured implementation correction. It does not establish listener judgments, human wordlikeness, or an optimal rate for any English rime.
