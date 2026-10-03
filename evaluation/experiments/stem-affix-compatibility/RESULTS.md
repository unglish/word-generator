# Q18: opt-in stem and affix category compatibility

The registered category model enforces its declared transitions across the complete candidate sample, but every enabled profile loses spelling diversity and moves farther from both phone and written-trigram references. Morphological hiatus fallback also increases in the text profiles. These measurements do not support enabling the model by default or claiming better reader judgments.

Measured implementation: `11bdf6a90ed28e1aba09c40b3901c54c6308437f`; immediate control: `1159465fe6c10f55a97e8c5851e8a75c604450e7`. This is a composed control with prior phonological, stress and spelling changes; comparisons must use that exact source rather than the current root checkout.

The optional `MorphologyConfig.categories` gives generated stems weighted categories and affixes weighted senses with explicit input/output transitions. The existing template is selected first, then a compatible complete path is sampled jointly. A forced short both-affix plan can lose its prefix: the retained suffix path is recomputed from the original stem before sampling. Empty eligibility fails explicitly. The trace retains requested and retained templates, path identities, intermediate categories, sampling masses and excluded projections.

The experimental inventory has four stem categories, 33 configured affixes, 45 senses and 61 transitions. Uniform stem priors and equal sense shares are authored assumptions. Generated category assignments are not observed meanings, inflectional agreement, productivity estimates or an exhaustive English derivational grammar. A control without category assignments cannot be retrospectively counted as violating them.

## Full registered corpus and mechanism checks

Both arms contain 400,000 words: two spelling policies, four profiles, five fixed development seeds and 10,000 words per stream. All 400,000 candidate words and complete traces pass frozen public-API replay and independent Python reconstruction of categories, path eligibility/weights/projections, structural cells and phones. Independent mechanism agreement verifies the declared contract; it does not establish empirical linguistic adequacy.

Omitting the feature preserves full output, trace and RNG state across 10,000 public comparisons, 938,653 RNG draws and 40 next-state probes. Enabled trace/plain parity passes 10,000 comparisons, 953,155 draws and 40 probes. Across both policies, all 200,000 bare-profile word/trace archives are byte-identical to the control. Changing RNG consumption in enabled profiles can change subsequent words; same-seed samples are distribution comparisons, not paired independent words.

Each row below describes 50,000 draws per arm. These Jensen–Shannon divergences use the original common evaluator and are in bits, unlike Q19's separately implemented natural-log distances.

| Spelling policy / enabled profile | Unique control → candidate | Phone JSD control → candidate | Trigram JSD control → candidate |
| --- | ---: | ---: | ---: |
| Default / lexicon | 44,348 → 43,875 | 0.006110303 → 0.007517990 | 0.155364510 → 0.158428977 |
| Default / text | 30,075 → 29,692 | 0.009757251 → 0.011843921 | 0.179775583 → 0.182358249 |
| Active / lexicon | 44,411 → 43,904 | 0.006451428 → 0.007553439 | 0.173941511 → 0.174704710 |
| Active / text | 30,257 → 29,959 | 0.009781080 → 0.011899707 | 0.199389186 → 0.200572979 |

Text-profile morphological hiatus fallback increases from 4,503/22,402 affixed words (20.101%) to 5,421/22,356 (24.249%) under default spelling, and from 4,457/22,392 (19.904%) to 5,369/22,482 (23.881%) under active spelling. Full counters, denominators, distributions, strata and seed deltas remain in the paired reports. Some individual diagnostics improve; these mixed results must not be compressed into an overall quality score. Seed ranges are descriptive and are not confidence intervals.

## Gates and publication status

The original unit and quality checks fail in both arms. Both compilations, original two-million-word trigram analyses and original 50,000-word trace audits pass. The original quality reports are byte-identical: 73 five-consecutive-consonant words fail the existing ceiling in each arm. The explicitly configured candidate sample has 46 such words versus 73 in its configured control and still fails the unchanged gate.

Original unit outcomes are 18 failed / 1,065 passed / 4 skipped tests in the control and 19 failed / 1,073 passed / 4 skipped in the candidate. The extra candidate failure is the original 60-second grapheme-selection timeout. A timeout is not evidence of a category-contract failure. Shared failures, the extra timeout and all logs remain recorded.

All twelve native performance runs fail the unchanged 4,500 words/second floor. All 24 configured runs also fail the unchanged floor. All 48 registered commands have completed: six pass and 42 fail. Configured timing includes the matched public single-word loop; original native timing is measured separately. No timeout, sample, seed, warmup, variance bound, speed floor or heap limit is relaxed. Execution/provenance completion markers must not be confused with passing individual gates.

Nine focused category tests, strict review TypeScript and touched lint passed before capture. Whole-repository lint fails with seven quote-rule errors in each arm. The entire diagnostics are identical after replacing checkout paths, and the affected test file is unchanged. Final packaging/source verification and draft-PR publication remain required. No real human responses have been collected.


All six rounded performance observations are retained below. Shared baseline failures prevent a passing performance claim; the configured candidate lexicon observations are generally slower in this run, without isolating a cause or claiming a population speed estimate.

| Mode | Control words/second | Candidate words/second |
| --- | --- | --- |
| Native default | 3145, 3089, 2891, 3110, 3079, 3169 | 2586, 3124, 3019, 3160, 3103, 3166 |
| Configured lexicon | 3181, 3105, 2643, 3202, 3046, 3068 | 1639, 955, 2423, 2516, 2312, 2420 |
| Configured text | 2365, 1903, 2906, 3609, 3646, 1993 | 2718, 2530, 2973, 2846, 2950, 2417 |


The publication package preserves every gate outcome and original log. `validation-index.json` identifies original and saved bytes plus the measured source pins. `retained-local-index.json` identifies all 80 locally retained full word/trace archives; they are not bundled in the compact PR. The manifest/source/summary/witness/distribution artifacts, independent audits and measurement operators are bundled. Operators record workstation paths and require deliberate relocation before a rerun.

Run `python3 -B verify-validation.py --repo /path/to/checkout` from the package directory to authenticate packaged bytes and measured source identity. Add `--local-archive /path/to/retained-local-v1` to authenticate the owner's full trace archive. Integrity checks do not rerun the corpus or establish linguistic efficacy. The separately retained CMU notice applies to captured CMU-derived reference material; code remains under the repository code license.
