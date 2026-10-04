# Q13b: aligned shared grapheme constructions

Status: control audit and implementation requirements; no runtime changes,
registered candidate capture, quality gain or PR yet. The exact control is #338
at b2373ca, using its frozen 200,000-word development archive. Reusing that
control isolates this work from inherited doubling and normalization changes.

## What the code and archived traces establish

`SpellingUnit` initially owns one phone. `SpellingCellOrigin` can identify one
licensed unit or unresolved ancestry from multiple units; it cannot currently
license one spelling for an ordered sequence of phones. String rules operate
without those sounds. Coverage and normalization also assume singular cell
ownership. Merely assigning a rewrite to its first source unit would be wrong.

The exploratory scripts verify every archive artifact before and after scanning
all twenty streams. They retain complete first witnesses, exact event locations,
source units, and distinct categories for whole initial selections versus partial
or previously edited inputs. They do not reconstruct failed random trials or
rule eligibility from final strings. Their self-consistency checks are not an
independent second implementation or a pronunciation proof.

| Retained applied rule | Events |
|---|---:|
| ks→x | 1,170 |
| cx→x | 311 |
| gz→x | 44 |
| cw→qu | 2,629 |
| ckt→ct | 211 |

The expanded inventory covers 4,365 events in 4,003 words. Of those, 3,508 consume
complete initial selected-cell sets; 857 consume partial or previously rewritten
sets. This distinction is descriptive: the latter category is not automatically
an error. No `ngx-to-nks` or `ngk-to-nk` event occurs in this particular archive.
The narrower first inventory is retained separately, not overwritten.

Specific evidence that the new representation must handle:

- `lexicon-default`, seed 69212153, draw 2354: `gz-to-x` consumes selections for
  /g, ʒ/, not /g, z/ (`vurxyed`). Four other gz events consume the g inside the
  /ŋ/ selection ng plus part of /z/ ze. The matching letters do not establish
  the claimed sound sequence.
- Draw 1596 in that stream (`dadfex`): ks→x consumes only the k of selected ck
  plus s; the later cx→x consumes the leftover c and the rewritten x. All 311
  cx cleanups have this selection/rewrite category and /k,s/ ancestry.
- Of 44 gz events, 39 consume complete /g,z/ selections across syllable parts.
  All 2,629 cw→qu events consume complete /k,w/ selections, but 104 cross
  syllable parts. A same-syllable-only ownership model misses real control uses.
- 231 ks→x events consume an earlier rewrite plus s, with /ŋ,k,s/ ancestry.
  Exact ancestry is insufficient to assign all three phones to x; surviving
  cells outside that edit must be considered.

Adjacent underlying /k,s/, /g,z/, /k,w/ pairs occur 9,808, 220 and 2,646 times.
These are descriptive root-pair counts, **not eligible opportunity counts**.

## Linguistic basis and scope

The [DfE correspondence table](https://www.gov.uk/government/publications/assessment-framework-for-the-development-of-the-year-1-phonics-screening-check/assessment-framework-for-the-development-of-the-year-1-phonics-screening-check)
explicitly represents x with /k/ plus /s/ and qu with /k/ plus /w/. The
[Cambridge pronunciation of exist](https://dictionary.cambridge.org/pronunciation/english/exist)
also supplies a lexical example of x corresponding to /g,z/. These sources
support multiple-phone correspondence; they do not establish sampling weights,
all contexts, or a universal decoding rule. Word-initial x for /z/ remains a
separate existing single-phone selection and must not be reinterpreted as /ks/.

## Required implementation contract

1. Add typed, configurable shared constructions with ordered phone sequences,
   realized text, explicit context conditions, scope and probability. Keep source
   selections and their historical RNG/quota data intact. Represent the realized
   construction separately with every source phone, unit and input cell ID.
2. Build eligibility from complete live units and actual writer-boundary sounds,
   not a substring or a first-owner shortcut. Support cross-syllable source parts
   explicitly. Keep display placement distinct from phonological ownership.
   Unresolved earlier rewrites remain unavailable unless a complete contextual
   certificate can prove their repartition; do not silently assign them owners.
3. Include /ks/→x, /gz/→x and /kw/→qu in the English policy. Remove the replaced
   string transformations from the active structured path, including the cx
   cleanup dependency. Preserve an explicit legacy path for custom policies.
   Register precise eligibility, phase/order, repeat-attempt and RNG contracts
   before runtime edits; the old ks rule can be attempted at syllable and word
   stages, so an undocumented one-pass rewrite would change its sampling law.
4. Teach ledger replay, coverage and normalization that a construction is atomic
   and can have multiple phone owners. Audit every later write/gap rule that can
   touch it. A generic string edit must not partially erase a licensed construction
   or promote ancestry into a license. Record meaningful refusal reasons.
5. Verify certificates against pinned configuration and exact event-time inputs;
   reject forged, reordered, missing, duplicated, partial and cross-part claims.
   Preserve trace-on/off determinism. Missing or unprovable ownership must never
   appear as a clean zero in the report.

## Measurement work still required before implementation

Freeze a complete experiment protocol covering positive support for all three
constructions, invalid /g,ʒ/ and /ŋ,z/ counterexamples, ck+s, earlier rewrites,
cross-syllable cases, original single-phone x, custom-policy compatibility and
all subsequent edit sites. Add actual eligibility/attempt/refusal provenance;
the historical archive cannot supply those events retroactively.

Then implement and fixture-test, freeze source/tools/dependencies, capture the
unchanged 200,000-word development protocol once, compare against the original
baseline and exact #338, and independently recount ownership and transformation
claims. Retain all broad diagnostics, resolved morphology/length strata,
diversity, rejection and performance effects. Use fixed paired performance
comparisons and legacy public-API word/trace/RNG checks. Validation stays sealed.
No surface-only replacement, disabled-feature zero, or human-quality claim is
an acceptable substitute for the full construction and preservation contract.
