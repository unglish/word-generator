# Q14a split-vowel experiment — review draft

This opt-in change replaces the two legacy split-vowel formation mechanisms with explicit constructions and completes unresolved vowel spellings using the existing resolver weights. English defaults remain unchanged. The experiment is not ready for promotion.

## Completed measurements

The formal development capture contains 200,000 words. Original baseline and immediate-control comparisons use the same evaluator. Trigram Jensen–Shannon divergence increased in all four profiles relative to the immediate control. Unique spelling counts increased in three profiles and decreased in lexicon-default. These are distribution diagnostics, not human reading judgments.

Six paired performance runs show a median throughput decrease of 63.44%. Both arms fail all six speed gates and pass all six variance gates. Both use the same configured public-generator loop; this differs from the optimized default batch API. The corrected performance runner was prepared after capture, and its failed predecessor is retained separately.

The existing quality benchmark, bound to the opt-in generator with its original seeds, sample sizes, assertions and timeouts, finishes with 10 passes and two failures. Its 50,000-word gate sample contains 82 words with five or more consonant letters and 61 containing owngs. Mode gates pass. These results are distinct from the earlier unchanged-default full-suite results.

## Trace investigation

A separate scan of all 200,000 archived words finds 138 outputs containing owngs. Every matching word also has an ow completion certificate. A complete root-cell attribution pass binds the ow cells of a root owng sequence to a completion certificate in all 138 matching words. Complete matching traces are retained; final-word ownership remains uncertified. The preserved erowngs example has a completion edit from o to ow, followed by suffix s. Its retained completion weights are ow:250 and oe:10. The inventory treats the ow correspondence as single-phone and supplies no hard following-context condition. Compliance with that representation does not establish contextual spelling plausibility.

## Unfinished validation

Candidate structural replay completed all 200,000 words and its output hashes verify. Independent recount completed all 200,000 words and 3,800,019 integer comparisons successfully. Its scope covers arithmetic, structure and final-root checks; semantic eligibility and prior reading licenses remain authenticated by the production verifier. No zero-violation claim, resolved-obligation improvement claim, final-word ownership claim or human-quality claim is made. Keep the validation cohort sealed. Publication and the remaining roadmap work are separate outstanding deliverables.

## Structural totals

The candidate records 7,470 formed and live constructions (2,215 syllable-route, 5,255 word-route), 23,247 completion replacements, 2,855 infeasible completion attempts and 32 unavailable-prefix attempts. It contains 2,887 unresolved final-root vowel obligations versus 29,835 in the control. Final-root unavailable status is 8,051 versus 20,205. Completed alternative spellings can move nuclei into the not-target category; the satisfied-open/split category alone does not count all supported alternatives. All 7,470 constructions lack final assembled-word ownership certification.

The roadmap target of no unresolved obligation is not met. Words with infeasible spelling budgets increase from 8,006 to 8,132. Changed RNG consumption means these aggregate differences are not paired per-word causal estimates. The existing quality failures and 63.44% throughput regression remain reasons against promotion even if structural recount agrees.
