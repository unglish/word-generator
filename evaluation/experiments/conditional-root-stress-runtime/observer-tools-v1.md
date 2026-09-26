# Observer execution and evidence boundary

These tools consume saved raw configured captures. They never regenerate a
corpus. The capture protocol, configurations, sources, source-set discovery,
engine, archive hashes and expected manifest SHA come from the reviewed capture
freeze. A report contains no quality pass/fail threshold chosen from outcomes.

After separate authorization and successful raw capture, run the Node observer:

```sh
node --import tsx evaluation/experiments/conditional-root-stress-runtime/analyze.mjs ROOT ORIGINAL FREEZE FREEZE_SHA control CONTROL_RAW CONTROL_MANIFEST_SHA FRESH_CONTROL_REPORT
node --import tsx evaluation/experiments/conditional-root-stress-runtime/analyze.mjs ROOT ORIGINAL FREEZE FREEZE_SHA active ACTIVE_RAW ACTIVE_MANIFEST_SHA FRESH_ACTIVE_REPORT
```

`q09-runtime-observation-v1` records total/profile/seed-stream/actual-morphology-
and-length groups. All counters are integers. Every snapshot domain records
observed or unavailable words separately; absent v1/v2 phases receive no
invented zero-defect score. Active groups also count actual proposal K, sampled
K, proposal/application patterns and adjacent marked pairs. Context uses are
bound to detached actual input/K analyses. These conditional descriptions do
not pair active and control draws after their RNG streams diverge.

`observe.mjs` replays the actual domains, events, proposal and sampling transcript
on the same pinned engine. `mechanism.mjs` queries every well-formed same-primary
pattern at observed K, including exact zero-support rows. The independent Python
counter reconstructs all active groups and contexts from compressed raw records,
and `verify-mechanism.py` proves every context against the unchanged independent
Fraction history oracle and 100/140-digit Decimal tilted masses.

```sh
python3 evaluation/experiments/conditional-root-stress-runtime/recount-runtime.py --freeze FREEZE --freeze-sha FREEZE_SHA --run ACTIVE_RAW --manifest-sha ACTIVE_MANIFEST_SHA --analysis ACTIVE_REPORT --analysis-sha ACTIVE_REPORT_SHA --out FRESH_INDEPENDENT_PROOF
```

Python assertions must be enabled; optimized execution is rejected. The
independent proof does not repeat primary-strategy selection or the same-engine
sampler/affix event replay. The Node observer supplies those scoped integration
checks. The Python verifier independently pins all declared current source and
archive bytes; exact source-set discovery and RNG-boundary accounting remain
with the Node raw reader. Its own source is in the same reviewed tool closure.

Raw summaries cannot be used for frozen quality comparisons. Separate explicit
rescore operations produce scored summaries with the unchanged #307 evaluator
identity and raw-source provenance. Common scored diagnostics and supplementary
stress observations remain separate evidence, including inherited quality-gate
failures, fixed-K disyllable limitations, unknown quantities, and final-word
morphology effects.

Preflight failures publish no success report. Catchable mid-analysis failures
retain a fresh `passed: false` outcome with the failing coordinate and completed
count; no partial pass is produced. Reports and proofs are exclusive and outside
source/archive inputs. Source bytes remain fixed through successful execution.
