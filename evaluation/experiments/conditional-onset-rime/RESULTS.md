# Q17 conditional onset/rime fit: completed evidence

The registered conditional model lowers held-out mean negative log likelihood from 17.012374 to 15.461681 nats per dictionary word, a 9.12% reduction. This measures conditional dictionary prediction under the frozen segmentation and population; generator outputs and human judgments were not measured or changed.

The pinned dictionary yields 117,485 compatible spelling types: 94,058 training, 11,766 development and 11,661 held out. Source selection, all split identities, inferred syllabification and every integer count table independently reconstruct exactly. The model has six class rows, 18 stress/class rows and 64 full edge/stress/class rows. Development selects alpha 64 for both arms from the preregistered eight-value grid. Both choices are at the grid's upper boundary; they are not a claim of globally optimal smoothing, and the grid was not extended after held-out results.

The held-out comparison contains 57,382 constituent events across 11,661 words. Baseline and candidate mean event losses are 3.457204 and 3.142077 nats. Individual word loss improves in 9,864 and worsens in 1,797; all word scores and 83 overlapping strata are retained. Overlapping strata must not be added as independent populations.

## Rare-tail and support tradeoffs

Five strata worsen, including full-context training-frequency counts 0, 1 and 2. The 180 events unseen in full training contexts worsen by 7.727530 nats per event; 166 singleton events worsen by 0.055643 and 149 twice-seen events by 0.068042. The other worsening strata are noninitial/nonfinal stressed diphthong onsets (563 events, +0.006926 nats/event) and initial/final unstressed rhotic onsets (two events, +0.370337). Overall improvement does not establish rare-tail improvement.

All 64 observed-context support diagnostics independently agree. Candidate novel-event mass ranges from 1.0323e-7 to 0.967316, versus baseline 0.000532 to 0.956331. Candidate novel mass increases in two contexts; the ten most probable *observed* events have greater aggregate mass in 45 contexts. This is observed-support concentration, not the global top ten over infinite support, and it does not establish generator diversity. Open-support probabilities are computed in log space without clipping or floors; numerical fixtures include a 1,000-consonant unseen sequence.

## Verification and scope

Independent Python verifies all 16 development trials and both choices, all held-out summaries, every per-word loss, every stratum and direct-complement support calculations. The complete fit artifact is sealed before/after with unchanged tracked source files, actual Node executable, installed loader dependency closure, environment, source bytes and runner hashes. Its raw byte SHA-256 is `485b011ef85afeeb628c06655a84898a2c32fb57f55a27828a78baaaf7602618`; measured commit is `cbf479a1039a7db37333fed8b432d0f51ef686ca`. The original preregistration commit is `a7c6779ccad0151637f062f137d3e8c10ae5c4c8`.

Final checks pass all 23 focused source/model/builder tests, review TypeScript and targeted lint. Generator source and historical scorer/data diffs against `71f5a6f` are empty. Original generator quality and performance gates were not rerun for this offline-only change, and no new gate result or output-throughput claim is made. A later runtime activation requires its own complete output/RNG and distribution evidence.

The native dictionary uses one compatible first pronunciation per spelling, includes names/loans/inflections, and has no token frequencies or family-level split. Syllable boundaries are inferred from training-only initial-onset support; all splits use that frozen inference. Stress labels and broad ARPABET classes are preserved. This is not a dialect-universal syllabification or human wordlikeness model.

`validation-index.json` authenticates all packaged saved bytes and their losslessly decompressed originals. The package retains the complete fit artifact, execution seals, independent tools/results and historical implementation-checkpoint logs, including the early typing failure. `verify-validation.py --repo REPOSITORY` additionally verifies unchanged measured implementation and generator sources. Byte verification is separate from statistical/generalization claims.
