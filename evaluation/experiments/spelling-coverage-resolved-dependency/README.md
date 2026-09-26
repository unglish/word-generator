# Resolved-morphology spelling coverage control

This freezes Q06/#315 resolved written parts before Q13 cap behavior. It is a
prerequisite control, not a Q13 result. Runtime commit
`875e8328b65556d194c729d3d16364922d5522be` adds the named Q06 dependency after
Q02a/#317, Q12a/#310 and the separately parity-verified resolver extraction.
Every earlier archive remains immutable.

## Attribution and verification

All 200,000 development draws pass the paired integration verifier. Exactly 260
returned spellings change: 188 of 50,000 lexicon-default words and 72 of 50,000
text-default words. Both 50,000-word bare profiles have zero written changes.
Every change is the previously selected `in` → `im` allomorph before a bilabial:
260/260 source-derived eligible words previously emitted `in`; now 260/260 emit
`im`. The detector retains its original definition and unknown classifications.

For each affixed word, the verifier independently reconstructs the old planned-
affix slicing and new resolved-part cleanup with the unchanged legacy cap function.
It verifies ordered assembled/emitted parts and permits only that proven written
change plus the additive `morphology.realization` field. All other complete draw
fields are equal. All 200,000 base ledgers are byte-for-byte equivalent as JSON
values and each replays with exact input/output IDs, positions and lineage.
The 57,451 affixed words contain 63,927 checked affix selections with zero recorded
selection, assembly, emitted-output or part-role mismatches. Fifty-seven words
have later cleanup changes; these are recorded rather than mistaken for Q06 loss.

A separate public-API check covers 20,000 default draws, 1,600 custom doubling
draws and 800 post-construction config-mutation draws (84,800 API calls). It verifies
trace-on/off equivalence, every RNG boundary and the next random value. Thirty-two
default spellings change, all by the same Q06 mechanism; every other legacy field
is equal. Default streams retain distinct original/candidate full-trace digests.

All 46 captured runtime files equal their committed bytes. The Q06 generator,
attachment and realization modules equal #315 `a27f7fe` byte-for-byte. Generator
digest: `c499e71d9ba9d6fe6ce9bbca9ea08fdfcd321480e3f2f8c856475e592ae67aed`.
The frozen evaluator remains
`ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007`;
protocol/reference and all gates are unchanged. The raw archive is
`memory/quality-runs/spelling-coverage-resolved-dependency`. The comparison includes
both the immutable original and the preceding Q12a/Q02a dependency control.

## Unchanged cap denominators and limitations

The base mechanism counts exactly match the preceding control: 1,009,637 selected
units, 4,465 cap-affected words, 4,701 cap edits, 126 cap-attributed partial `th`
units, 35 separate join-deduplication partial `th` units, and 1,700 cap-attributed
units with no surviving lineage. Thirty cap-input cells already have unresolved
rewrite ownership. These are cell-loss observations, not pronunciation certification.
The Q06 handoff gives exact morphological text boundaries, not full affix phone
ownership. Future Q13 refusals at that boundary must remain separately scoped.

## Validation

Full unit suite: 443 pass, one skip, two declared dependency failures. The Q12a
`ex` share is 0.0155307585 versus the unchanged 0.0215 minimum. The Q06 reachability
sample selects `im` exactly 30 times against the unchanged strict `>30` floor.
Neither threshold, seed, nor sample size was changed to make a gate pass.
The focused allomorph suite has 25 passing cases and that same one floor failure;
all fixed-root/custom fixtures pass. Separate quality suite: 12/12. Strict runtime
and verifier typechecks and touched-file lint pass. Isolated performance has not
been measured for this dependency integration; capture timings are not benchmarks.

The old standalone Q06 fixture (seed 167, `immamsed`) and the combined dependency
fixture (seed 435, `inmorn` → `immorn`) retain full trace evidence in
`witnesses.json.gz`. The replacement fixture exercises the same `in` before /m/
mechanism on the changed selection stream; it does not relax a distribution gate.

## Reproduction and evidence

The verifier depends on the unchanged #307 harness and accepts its verified
manifest schedule. Materialize the previous control's complete generator source
bundle as a TypeScript runtime, with the existing dependencies available, then run:

```sh
node --import tsx evaluation/experiments/spelling-coverage-resolved-dependency/verify.ts memory/quality-runs/spelling-coverage-dependency memory/quality-runs/spelling-coverage-resolved-dependency /path/to/previous-runtime verification.json
node --import tsx evaluation/quality/probes/spelling-coverage/morphology-integration-parity.ts /path/to/previous-runtime . parity.json
```

`control-sources.json.gz` retains the complete captured generator/evaluator inputs;
`source-check.json` pins committed source equivalence. The compressed manifests,
summary, full comparison, verifier/parity/allomorph reports and test logs are
hashed by `artifacts.json`. Probe sources are under
`evaluation/quality/probes/spelling-coverage`; the allomorph probe is the unchanged
`evaluation/quality/probes/resolved-allomorphs` dependency. No Q13 budget policy is
active in this control.
