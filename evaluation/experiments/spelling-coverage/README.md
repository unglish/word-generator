# Q13: phone-preserving spelling budgets

This is a measured draft with failing acceptance gates, not an overall output-quality
pass. English explicitly opts into `preserve-phones`: spelling budgets may select
licensed whole-unit alternatives, but may not clip a grapheme or erase its phone's
spelling. Infeasible and unsupported plans retain the surface and report a reason.
Omitting the policy in a custom configuration preserves the legacy behavior.

## Controls and chronology

The runtime genuinely depends on Q02a/#317, positive legal selection Q12a/#310,
and the resolved morphology handoff Q06/#315. The dependency integrations and
pure resolver extraction have their own controls and parity evidence in the sibling
`spelling-coverage-dependency`, `spelling-coverage-refactor`, and
`spelling-coverage-resolved-dependency` packages. No allomorph restoration or
zero-weight selection improvement is attributed to Q13.

The immediate control is the frozen 200,000-word `spelling-coverage-resolved-dependency`
run from `875e8328b65556d194c729d3d16364922d5522be`. Its generator digest is
`c499e71d9ba9d6fe6ce9bbca9ea08fdfcd321480e3f2f8c856475e592ae67aed`.
The candidate is the frozen 52-source-file `spelling-coverage-candidate` run, digest
`f0a9da1fa95cb7f0d8901b82567d94f1b565a36a83c58d404f7c8b0528a79666`.
Both use four profiles, five continuous seeds per profile and 10,000 draws per
seed. The original development archive remains immutable and is also included
in the unchanged v1 comparison.

The hypothesis, objective, numerical tie convention, search bound and endpoints
were registered before behavior implementation. The supplemental observer's final
implementation was completed after candidate generation began. It was frozen
before scoring and the same implementation was applied to both saved corpora.
`coverage-v1.json.gz` is retained. Revision 2 adds four distinct-word incidence
indicators; every earlier total/profile/stream/morphology-stratum key and value
is unchanged. This is not a claim that the final observer hash preceded generation.

## Main mechanism results

Each corpus contains 200,000 returned words. These are independently generated
continuous streams, not paired word identities: spelling changes can alter
length rejection and subsequent RNG consumption.

| Observed measure | Dependency control | Candidate |
|---|---:|---:|
| Selected units / phones | 1,009,637 | 1,009,447 |
| Selected `th` units | 3,976 | 3,652 |
| Cap-attributed partial `th` | 126 | 0 |
| Cap-attributed units with no surviving lineage | 1,700 | 0 |
| Base cap edit events | 4,701 | 0 |
| All partial `th`, including other causes | 161 | 31 |
| All units with no surviving lineage | 9,076 | 7,398 |
| Words with unresolved rewrite cells | 35,468 | 35,669 |
| Raw five-consonant-letter-run words | 22 | 203 |

The remaining 31 partial `th` units are attributed to syllable-join duplicate
removal, a separate Q13c hypothesis. Lineage is not a pronunciation license;
generic regex/silent-e ownership and later phonological changes remain outside
this certificate's claim.

| Profile (50,000 words each) | Control `th` partial / selected | Candidate `th` partial / selected | Control cap no-lineage / units | Candidate cap no-lineage / units | Certificates |
|---|---:|---:|---:|---:|---:|
| lexicon-default | 15 / 867 | 0 / 832 | 77 / 240,949 | 0 / 241,196 | 185 |
| lexicon-bare | 23 / 1,305 | 0 / 1,291 | 114 / 317,555 | 0 / 317,246 | 279 |
| monosyllables-bare | 74 / 1,103 | 0 / 834 | 1,438 / 264,087 | 0 / 264,007 | 857 |
| text-default | 14 / 701 | 0 / 695 | 71 / 187,046 | 0 / 186,998 | 196 |

All 1,517 certificates replayed successfully, covering 1,549 changed-phone
occurrences in 1,516 distinct words. Exact cell IDs, ordered phone identities,
parts, inventory support, doubling outcomes, normalized probabilities and final
reading obligations were checked against the detached writer-boundary context.
No certificate mismatch or newly lost/reordered/duplicated target phone was
observed. This verifies the declared construction model and recorded edits; it
does not prove that every possible spelling has a unique English reading.

## Outcomes and denominators

The candidate has 500,000 budget episodes: 400,000 base episodes and 100,000 final
morphology episodes. Final morphology includes bare morphology plans, so it must
not be read as a count of affixed words. The report also stratifies by actual
resolved prefix/root/suffix realization.

| Scope | Episodes | Respells | Refusals | Numerically satisfied |
|---|---:|---:|---:|---:|
| Base before word rules | 200,000 | 1,507 | 1,398 | 197,095 |
| Base after word rules | 200,000 | 10 | 1,583 | 198,407 |
| Final morphology | 100,000 | 0 | 3,870 | 96,130 |

There are 8,368 over-budget episodes: 1,517 respells and 6,851 refusals. Refusals
comprise 4,495 unavailable-ownership cases (including the 3,870 final morphology
episodes), 2,287 construction obligations, and 69 completed searches with no supported plan. Search-budget exhaustion, unknown custom readings and invalid
junctions are explicit outcomes, each observed zero times in this English sample;
fixtures exercise those refusal paths. Numerically satisfied means no budget was
exceeded, not a certificate for unchanged spellings.

Distinct candidate words: 6,823 have an over-budget episode, 1,516 a respell,
and 5,317 a refusal. These indicators can overlap and must not be summed.
The control lacks budget episodes: its absent incidence fields are unavailable,
not evidence that no repair was needed. All report tables retain the complete
word/phone/unit denominators, spelling and length histograms, and before/after
budget values. The legacy attempt-index histogram is explicitly the selected
attempt index; Q03 is not integrated and actual attempted work is unavailable.

The independent Python recount agrees with every existing and added count across
both corpora: totals, four profiles, twenty streams and ten morphology strata.
It separately replays every cell edit and certificate replacement/phone structure.
Python does **not** reimplement the probabilistic reading verifier: those licenses
are checked by the frozen production TypeScript verifier using captured contexts
and source. `independent-comparison-v3.json.gz` states this division explicitly;
the earlier v1 comparison and raw recounts are retained. All 200,000 historical
control words lack budget episodes; all candidate words provide them.

## Validation and remaining gates

- Exact omitted-policy parity: 20,000 protocol draws plus 2,400 custom and
  post-construction mutation draws; 84,800 public API calls, full legacy traces,
  outputs and RNG states match the dependency control.
- Active trace-on/off parity: 20,000 paired outputs, 40,000 public API calls,
  exact RNG states and ledger replay; 155 certificates verified in this smaller
  correctness sample before the full archive.
- Full suite: 527 pass, 1 skip, 5 failures. The original assertions are retained:
  `ex` is 0.0160884 versus a 0.0215 floor; `ugh` is 0.00491873 versus 0.0062;
  raw cap integration finds 9/100,000 grapheme overruns, 31/100,000 letter overruns,
  and 36/10,000 overruns with max=3.
- Focused final suites: 106/106 pass, including adversarial certificate contexts,
  exact phone/unit cardinality, inventory identity, detached snapshots, atomicity,
  forced doubling, fallback legality, exhaustive weighted/tied pruning checks,
  and six pure observer fixtures. The observer fixtures ran separately after
  full-suite discovery and were rerun after adding incidence fields.
- Quality suite: 11/12 pass; the unchanged raw-consonant gate finds 62/50,000.
- Strict runtime and probe typechecks and touched lint pass. The staged whitespace
  check reports one extra blank line at the end of the frozen `observe.ts`; its
  measured source bytes are retained. Earlier unstaged checks did not include
  this then-untracked file.

The dependency control failed `ex` and allomorph reachability (count 30 against
a strictly-greater-than-30 floor). The candidate's allomorph floor passes under
the changed stream,
while `ugh` and cap failures are now visible. Unchanged gate definitions do not
mean unchanged observed failures, and the incidental allomorph gate movement is
not a Q13 mechanism claim. Distribution comparisons remain descriptive.

One isolated ordered local timing comparison ran the candidate first, then the
exact dependency runtime with the same existing perf test/config, Node version
and dependencies. Candidate: 4,140.285 words/sec, below the unchanged 4,500 floor;
median variance 1.59× passes. Dependency: about 6,705 words/sec; median variance
1.31×, both pass. This pair has about 38% lower throughput (about 62% more time
per word), a material draft limitation, not a general speed estimate. Both used
the original 50-word warmup and 10,000-word seed-42 batch. Thresholds and the
objective were not changed. Profiling/optimization must be a subsequent measured
revision against this saved candidate.

## Reproduction and boundaries

The top-level evaluator is the unchanged #307 toolchain, digest
`ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007`;
protocol `451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862`;
reference `38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858`.
Its files are an explicit reproduction dependency, not edits bundled into Q13.
The pure observer module has no dependency on the untracked capture harness, so
its committed unit fixtures run in a clean checkout.

The nested `evaluation/quality/probes/spelling-coverage/analyze.ts` verifies each
archive's complete manifest, the pinned protocol, exact regular-file shard set,
draw coordinates, captured runtime file set/content, and the observer source
closure before and after scoring. V1 observations stay historical; no missing
stress, part identity or reading proof is invented. Raw archives are local and
immutable; compact manifests, summaries, source bundles, comparisons, observer
reports and validation logs are retained here with content hashes.
