# Q13c: preserve phone units at adjacent-letter collisions

Status: read-only design for review, 2026-09-26. No runtime, branch, gate,
configuration, or corpus changes. The measurements below are exploratory
descriptions of the existing archive, not preregistered candidate results.

## Recommendation

Replace the two unconditional character deletions with a **local atomic
commit-or-retain decision at their existing application points**. The only
shortening proposal in the first experiment is the current proposal: remove the
first code unit of the later realization. Accept it only as a certified
replacement of that *complete* later phone unit with a nonempty, positively
supported, context-complete realization. Otherwise retain the original cells and
record the reason. Do not reinterpret an erased phone as sharing the preceding
letter. Do not move these decisions past regexes or retry the writer.

This is not a general replacement search or a prohibition of repeated letters.
It preserves a bounded useful operation—whole-unit respelling such as /d/ ed→d
when its actual context licenses d—while removing the unsupported inference that
equal adjacent letters make either phone redundant. It leaves unsupported
phonological sequences visible for Q11 and joint spelling constructions for
Q13b. A local realization certificate must remain distinct from Q13's
counterfactual whole-sequence selection certificate.

## Frozen evidence and exact scope

- Published behavior: #328. Its immutable archive is
  `/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/memory/quality-runs/spelling-coverage-candidate`.
- Archived generator source: `f0a9da1fa95cb7f0d8901b82567d94f1b565a36a83c58d404f7c8b0528a79666`.
- Current source is #331, head `569adf516a7fa03a77124d3515c9e1a17a8f71ac`;
  its existing 800,000-call study establishes exact archive/output/trace/RNG
  parity. The new behavior should stack on #331 and disclose #328's dependencies.
- Frozen protocol: `451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862`;
  evaluator: `ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007`.
- This audit checked the manifest envelope, pinned protocol/source, exact regular
  shard set, every artifact byte hash before and after, all 200,000 scheduled
  coordinates, and exact cell/edit/certificate-replacement structure replay.
  It reused the frozen independent Python structural replay; it did not
  reimplement or rerun the probability/reading verifier. Those licenses were
  already verified in Q13/#331. No generator API was called in this investigation.
- Ledger ownership concerns the root before morphology (or the bare gap-spelling
  scope). Final written words in examples may contain affixes. The source phones
  are observations at the actual writer boundary, not a new claim about final
  surface-phone or full-affix ownership.

Files retained in `/private/tmp`:

- `q13c-dedup-audit.py`, `q13c-dedup-audit-v1.json`: full counts by profile,
  stream and resolved-morphology stratum, all 7,712 events with pre-edit cells,
  unit/phone identities, and all 31 partial-th coordinates.
- `q13c-witness-extract.py`, `q13c-full-witnesses-v1.json.gz`: 64 complete archived
  word/trace records covering 65 named mechanisms, including every partial-th
  witness. These are extracted original records, not regenerated examples.
- `q13c-dedup-witnesses-v1.json.gz`: first audit's smaller witness selection.
- `q13c-design-artifacts.json`: hashes for the final scratch package.

## What the code actually does

`write.ts` first calls `appendChoice`, creating a distinct unit for each phone and
cells for the complete after-doubling form. It stores `prevGraphemeForm` before
deduplication. Within a syllable it compares the end of the immediately preceding
emitted array entry with the first character of the new form, then deletes the
new form's first cell (`deduplicateAdjacentLetters`). Empty preceding entries
are not skipped. This is not an internal ff→f or ss→s normalizer.

The join rule runs after the new syllable's regex rules. It compares the last
character of the preceding clean part with the first character of the rewritten
new part and deletes the latter (`deduplicateSyllableJoin`). That character may
be adjacent to an unresolved regex output. The resulting part also supplies the
hyphenated output. Silent-e, junction repair, cap planning, whole-word rules,
morphology and final reconstruction remain later operations.

Neither rule checks unit identity, phone identity, multiplicity, candidate
legality, doubling support, reading obligations or a declared shared construction.
Both use case-sensitive UTF-16 code-unit comparisons, which custom fixtures must
preserve at the proposal boundary.

## Observed denominators and categories

The archive has 200,000 words, 1,009,447 phone/unit occurrences, 668,826 ordered
within-syllable adjacent-unit slots and 140,621 syllable boundaries. The latter
two are structural denominators, not claims that every runtime comparison had
nonempty text. There are 17,581 choices whose after-doubling form differs from
the selected form and 23,953 single-phone repeated-letter units. None of the
7,712 deletions removes a cell from a *doubling-transformed* later unit.

| Observation | Within syllable | Syllable join | Total |
|---|---:|---:|---:|
| Actual deletion events | 7,154 | 558 | 7,712 |
| Entire later unit erased | 7,075 | 323 | 7,398 |
| Later unit partially cut | 79 | 235 | 314 |
| Distinct phones, same recorded sound | 5,925 | 1 | 5,926 |
| Distinct phones, different recorded sounds | 1,229 | 476 | 1,705 |
| Unresolved preceding rewrite ownership | 0 | 81 | 81 |
| Same exact unit on both sides | 0 | 0 | 0 |

There are 7,697 distinct affected words (3.8485%). All 7,398 fully erased units
still have no surviving lineage at the final base-ledger boundary. The 314
partial cuts are event-time facts, not a claim that all final readings are wrong.
They comprise 52 ee units and 262 other multiletter units. All 81 unresolved
events have a rewritten *left* cell and an exact selected right cell; ancestry
of the left cell does not establish its reading.

| Profile (50,000 words each) | Units | Dedup words | Events | Final no-lineage units | Selected th | Final partial th |
|---|---:|---:|---:|---:|---:|---:|
| lexicon-default | 241,196 | 740 | 743 | 651 | 832 | 12 |
| lexicon-bare | 317,246 | 1,082 | 1,089 | 952 | 1,291 | 16 |
| monosyllables-bare | 264,007 | 5,440 | 5,440 | 5,407 | 834 | 0 |
| text-default | 186,998 | 435 | 440 | 388 | 695 | 3 |

The 31 final partial-th units are in 31 words out of 3,652 selected-th units
(1,599 selected onset-th units). Every case is exact coda /t/→t followed by
onset /θ/→th (17) or /ð/→th (14). The join deletes the second unit's t and leaves
its h. None is an uncertain regex attribution, an internal doubled form, or a
certified shared construction.

Of the same-sound cases, 5,925 are separate /s/ phones in one coda; the remaining
case is /ʌ/ across two nuclei. They must not be silently treated as one phone.
For example, `bangets` retains /ss/ in pronunciation while writing one s; its
structural trace includes finalS. Q11 owns upstream duplicate-phone policy.

Inventory lookup alone finds a matching complete remainder for only 112 partial
cuts: 30 ed→d, 27 lk→k, 3 lm→m and 52 ee→e. The first three have a configured
single-phone target reading. Bare /i:/→e has an open/split-marker obligation.
These are **upper bounds before condition, position, weight, doubling, neighbor
and ownership validation**, not estimated successes. In particular, different k
entries have different conditions; a form-string match is insufficient.

## Representative full-trace witnesses

Coordinates are `(profile, stream seed, zero-based drawIndex)` and require the
whole scheduled stream to reproduce. A seed alone does not identify the draw.

| Written output; base surface if different | Coordinate | Actual mechanism |
|---|---|---|
| hatharrer; base hathar | lexicon-default / 69212153 / 5789 | /t/ t + /θ/ th → t + h; /ˈhæt.θər.ɚ/ remains |
| unpathameen | lexicon-default / 101601885 / 8666 | /t/ t + /ð/ th → t + h |
| mochimtees | lexicon-default / 69212153 / 198 | /k/ c + /tʃ/ ch → c + h; affricate unit is cut |
| vachocee | lexicon-default / 69212153 / 7456 | /tʃ/ ch + /h/ h → ch; later /h/ loses all cells |
| nacing | lexicon-default / 69212153 / 1700 | /k/ c + /s/ c → c; same letter, different phones |
| unurone; base urone | lexicon-default / 69212153 / 73 | /ɚ/ ur + /r/ r → ur; separate coda phone disappears from ownership |
| bangets | lexicon-default / 69212153 / 85 | two coda /s/ units → one written s; no shared license |
| ydes; base yde | lexicon-default / 69212153 / 2434 | /ɛ/ e + /d/ ed → e + d; possible whole-unit normalization, followed by a separate magic-e issue |
| solkeme | lexicon-default / 3921817393 / 1221 | /l/ l + /k/ lk → l + k; requires actual k-entry eligibility |
| frolms | monosyllables-bare / 62358955 / 3053 | /l/ l + /m/ lm → l + m; candidate self-contained normalization |
| igerly; base iger | lexicon-default / 69212153 / 33 | silent-e rewrite of ie+g leaves unresolved e, then cuts /ɚ/ er |
| adgeetly; base adgeet | lexicon-default / 69212153 / 6155 | /dʒ/ dge + /i:/ ee → dge + e; no automatic permission to donate a marker |

The ydes example also makes the claim boundary concrete: a licensed local ed→d
operation would not certify the later base spelling yde for /jɛd/. Q14a still
owns the consonantal-y/silent-e problem. This proposal must not label a whole word
pronunciation-safe merely because one normalization certificate is valid.

## Linguistic distinctions that the representation must preserve

One /f/ written ff and two adjacent /f/ occurrences are different structures.
Official spelling guidance explicitly treats ff, ll, ss, zz and ck as spellings
of single sounds, and describes doubling that preserves the preceding short
vowel. It also retains ordinary compound spellings and gives `misspell` and
`plainness` as boundary examples. Letter count is not phone multiplicity.
[DfE English Appendix 1](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/239784/English_Appendix_1_-_Spelling.pdf).

Adjacent identical consonants at morphological boundaries can have phonetic
duration and boundary behavior different from singletons. The experimental
findings do not license a universal string-level coalescence rule, nor decide
the generator's phonemic representation automatically.
[Oh & Redford, 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3352589/).

There are genuine special shared spellings: Cambridge lists *eighth* as /eɪtθ/.
Representing its final spelling for /t,θ/ requires a joint or overlapping
construction, not pretending that one of those phones vanished. That lexical
ordinal example does not license every generated t|th boundary.
[Cambridge: eighth](https://dictionary.cambridge.org/pronunciation/english/eighth).
Conversely, *withhold* retains th+h and both /ð,h/ (with /θ,h/ also listed):
equal adjacent letters can belong to different phones and must remain.
[Cambridge: withhold](https://dictionary.cambridge.org/us/dictionary/english/withhold).

The proposed contract certifies configured correspondences and retained phone
identities. It does not prove unique English decoding or human reading agreement.
In particular, preserving two /s/ units as s+s makes the upstream duplicate
visible in the model; it does not establish that readers will articulate /ss/.

## Narrow typed API and lifecycle

Use the existing explicit preserve-phones policy; an omitted custom policy keeps
legacy behavior and exact RNG/trace semantics. At each existing site, construct
an exact boundary proposal from live cells, including the complete later unit,
its part, original selection and after-doubling form. Retain original historical
selection states for later selections; emitted normalization is a separate layer.

Suggested discriminated contract (names provisional):

```ts
type DedupSite = "adjacent-choice" | "syllable-join";
type UnitNormalizationOutcome =
  | { status: "normalized"; certificateId: number; unitId: number }
  | { status: "retained"; reason:
      | "would-erase-phone" | "no-legal-remainder"
      | "unresolved-ownership" | "unknown-reading"
      | "construction-obligation" | "context-unavailable"
      | "unsupported-shared-construction" };
```

The decision must:

1. Verify actual equal boundary code units, exact intact right-unit coverage,
   full ordered phone IDs and current part identity. A nonempty remainder is
   mandatory. Never delete a whole unit or attach its phone ID to a neighbor.
2. Resolve the remainder against positive eligible inventory entries under the
   actual **pre-unit** selection/quota state, including allowed doubling
   outcomes. Use the existing hard/fallback/soft-quota policy without widening
   its pools. A forced 100% doubled outcome cannot license an undoubled form.
   Do not sample again. If identical remainder forms have multiple licenses,
   choose stable inventory/outcome order; there is no quality-tuned objective.
3. For the initial slice, admit only target readings whose obligations are
   fully checkable at the site. A single-phone target plus certified unchanged
   neighboring readings is the useful conservative core. Bare long vowels,
   donated split markers and missing/custom reading metadata are refusals until
   their actual context is complete and explicitly supported. No blanket
   inference from a positive weight or spelling suffix is allowed.
4. Revalidate any earlier neighbor whose reading depends on the changed first
   letter, including a soft-c/g condition. Retain unresolved cells; do not call
   source ancestry exact ownership. At joins, a matching string after a regex
   is not proof of an intact unit. Current/future context unavailable at the
   existing operation is a refusal, not a deferred optimistic success.
5. Validate before advancing IDs or modifying cells. Commit a replacement of
   the *entire* right-unit span as one operation and certificate, preserving its
   exact nonempty ordered phone IDs. Update clean/emitted and hyphenated parts
   through the same result. Generic `edit()` would mark the replacement
   unresolved and is not a substitute for a typed commit.

The certificate should be a new **local emitted-normalization** family, with a
versioned ledger capability, separate from the existing whole-sequence coverage
certificate. It records original unit/input cell IDs, before/after, site, actual
selection-history position, detached authoritative boundary context, supported
alternative inventory/doubling identity, and reading dependencies checked at
that point. Historical v1/v2 traces remain supported; missing episodes are
unavailable. Unknown future versions fail verification.

Do not claim a counterfactual full-word sampling probability: future selection,
quota and `prevGraphemeForm` retain the original sampled pre-cleanup history,
exactly as they do today. This distinction avoids both rerolling and falsely
describing ed→d as a retrospectively selected d. Independent review supports
this separation, provided alternate support uses the real pre-unit state.

**Cap-planner integration needs an explicit conservative boundary.** Its current
`choice.form` and whole-sequence verifier assume selected/after-doubling forms,
not a separately normalized live form. It must not silently resample a
normalized unit or certify under stale reading metadata. Freeze normalized
spans, and if a cap plan would require reasoning through the new realization
state, return a distinct `normalization-context-unavailable` refusal. If the
current whole-word certificate cannot exclude that dependency, refuse that
over-budget word conservatively for this first slice. Preserve numeric caps and
the 8,192 search semantics; report every added refusal. Extending cap search to
replay local normalizations under counterfactual choices is a subsequent
hypothesis, not an implicit refactor. This boundary needs parent approval before
implementation.

Later generic edits remain separately traced. A local normalization license
does not certify their output or final morphological realization. Never
turn that limited claim into an all-word quality flag.

## PR boundaries and files

First Q13c behavior PR, stacked on exact #331:

- new bounded normalization module/types;
- two existing `write.ts` decision sites, without reordering surrounding rules;
- typed `BaseSpelling` atomic commit and snapshot capability;
- evidence verifier for the new certificate family and legacy-version handling;
- conservative cap-planner boundary for normalized live state;
- focused public-API fixtures, nested preregistered observer, compact evidence
  and contract documentation.

Do not edit grapheme weights/reading inventory, phoneme generation, stress,
root repair, regex rules, morphology, thresholds, budgets or the search bound.
Any common-helper extraction should first prove complete parity independently;
do not bundle a broad representation refactor to make the local rule easier.

Q13b separately introduces true multi-phone/shared constructions with ordered
phone coverage and an actual construction license (including lexical/morphology
conditions where required). It cannot merely expand `sourceUnitIds` on a generic
rewrite. Q14a handles split-marker and silent-e interpretation. Q11 handles
duplicate codas. Final affix ownership remains Q02/Q06 work.

## Pre-register before implementing behavior

Primary endpoints, applied identically to saved control and candidate:

- dedup-attributed partial source units, including all digraphs and th;
- dedup-attributed units with no surviving lineage;
- actual atomic normalization count and independently replayed ordered phone
  multiplicity; an unlicensed normalization must be zero;
- unique affected words plus event/unit counts, explicitly different units.

Mechanical acceptance requires zero uncertified deletions at either protected
dedup site, zero lost/reordered/duplicated phone IDs in every accepted operation,
zero dedup-attributed final partial-th/no-lineage units, and 100% replay of the new
certificates. All 31 archived th mechanisms must pass controlled regression
fixtures without deleting either phone. At least one controlled positive
normalization fixture must succeed; no minimum sampled normalization count is
imposed. Unknowns and refusals cannot satisfy a certification endpoint. Existing
cap-attributed coverage defects must remain zero. Full existing gate outcomes
and newly added normalization-context refusals are reported independently of
these mechanical targets; a failed quality/performance gate keeps the result a
failing draft, not an excuse to adjust the gate.

Retain both event-time and final-base measures so later generic repairs cannot
hide a destructive operation. Count target opportunities at each actual site;
historical missing prospective episodes remain unavailable. Retain the common
structural denominators above, selected-unit denominators, all profiles/20
streams/resolved morphology strata, and complete witnesses.

Secondary/guardrail reporting must include reason-specific retained outcomes,
same-sound vs different-sound collisions, unresolved inputs, full single-phone
doubling preservation, upstream duplicate phones, later rewrite interactions,
normalization-related cap refusals, all existing quality/distribution/diversity
and written-length diagnostics. Keep the five inherited unit failures, quality
failure and original Q13 limitations visible; new failures are new failures.
Existing gates remain unchanged even if preserved phone coverage creates longer
or less familiar spelling runs. No reader preference improvement is implied.

Tests must include:

- all 31 frozen th witnesses as archived regression anchors plus public-API
  controlled t|th fixtures for both /θ/ and /ð/;
- c|ch, s|sh, ch|h, ph|h, c|c for /k,s/, y|y for /j,i:/ and ur|r;
- distinct coda s|s and distinct nuclei o|o, with phone count/order unchanged;
- single-phone ff/ss/ee/ck retained intact, and a custom supported doubled-unit
  shortening with p=0/p=100/quota/conditional positive-support checks;
- a successful context-complete ed→d, lk→k or lm→m normalization, not merely
  fixtures that prove all proposals are refused;
- zero/singleton-zero pools, missing reading metadata, unresolved rewrite input,
  marker-bearing neighbors, open-vowel obligations and custom conditional forms;
- exact old empty-entry behavior, case, UTF-16 offsets, three consecutive units,
  multiple collisions, clean/hyphenated agreement and immutable snapshots;
- tampered context/features/part/phone IDs/input cells/inventory/doubling support,
  future certificate versions and failed validation without ID advancement;
- candidate trace on/off equality and no normalization RNG calls; complete
  omitted-policy output/trace/RNG parity against #331, including between-call
  mutable configuration behavior.

Candidate active-policy streams need not preserve the old full RNG trajectory:
retaining text changes inputs to existing probabilistic spelling rules. Do not
call such downstream changes nondeterminism or claim exact old-stream phone
parity. Verify phone identity/multiplicity at each controlled writer operation,
preserve the candidate's own seed/trace-on/off determinism, and report the
actual distribution consequences in the fixed 200,000-word study. Analyze the
same immutable control; no baseline regeneration or validation-set tuning.

After source/certificate review and frozen fingerprints, run the full suite,
quality, fixed development capture and independent raw recount/ledger replay.
Arrange a quiet paired timing window against #331, with fixed alternating order
and unchanged gates. Local normalization should add no unbounded search; avoid
repeated large snapshots at every ordinary noncollision. Performance claims
must come from isolated timing, not this archive audit.

## Review conclusion

The 31 th defects are a clean, fully owned subset of a broader many-to-many
alignment problem. Their fix should be a generic typed boundary decision, not
a th exception. The first safe experiment can preserve exact phone identities
and keep only demonstrably legal whole-unit shortenings. It should refuse
unknown/shared constructions honestly and expose the upstream duplicate-phone
and downstream magic-e problems instead of hiding either in cleaner strings.
