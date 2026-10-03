# Q11b: linguistic treatment and evidence requirements

These notes precede Q11b implementation and candidate selection. The committed
Q11 dependency control is frozen for its queued baseline capture. No treatment
choice or efficacy claim follows from these notes.

## Distinguish the structures

The existing `ity-velar-softening` rule substitutes /s/ for a root-edge voiceless
velar stop. Its condition inspects that phone, not its preceding root neighbor.
Consequently a root-final /sk/ can become /ss/ inside the same root coda.
This is a transformation-created root collision, not automatically a repeated
consonant spanning two morphemes. Source ownership must establish that distinction.

Velar softening is a real morphophonological alternation: Halle's discussion
includes electric/electricity and opaque/opacity, with front vowels conditioning
the dorsal-to-coronal change. That evidence supports modeling the alternation;
it does not establish a universal repair for arbitrary generated /sk+ity/ forms.
[Halle (2005), pp. 35–36](https://web.mit.edu/morrishalle/pubworks/papers/2005_Halle_Palatalization_or_Velar_Softening.pdf).

Repeated consonants at morphological boundaries require a separate policy.
Ben Hedia and Plag find longer nasal durations for morphological geminates in
natural conversational speech with un-, negative in- and locative in-. This
supports retaining distinct morphological sources rather than deleting every
adjacent identical consonant. It is phonetic evidence for the studied prefixes,
not proof that every generated repetition is licensed.
[Ben Hedia & Plag (2017)](https://www.spoken-morphology.hhu.de/fileadmin/redaktion/Fakultaeten/Philosophische_Fakultaet/FG_2373/Publikationen/3_VAR/Feb_2017_Ben_Hedia___Plag_Gemination_JofPh_2017.pdf).

## Candidate choices to resolve after baseline analysis

1. Admit a configured alternation only when its resulting structure is licensed,
   retaining the original root when admission fails. This needs an explicit
   rejection event and omission of the corresponding written rewrite. It is a
   generator policy; the literature above does not prove that blocked softening
   is the naturally preferred realization of every nonce root.
2. Coalesce a transformation-created identical sequence within the same root
   domain. This needs authenticated phone deletion/coalescence, written ownership
   alignment and configured replay. The current phone ledger requires every
   original identity to survive, so a silent array splice would violate its
   contract. Do not apply coalescence across distinct affix/root sources.
3. Choose a licensed affix/root alternative before committing the derivation.
   This may be appropriate when no resulting structure is admissible, but must
   preserve the declared morphology distribution and expose alternative selection
   and RNG consumption. Full typed stem/affix compatibility is also Q18 work.

The candidate must preserve cluster legality, rather than simply reduce the
existing adjacent-duplicate metric. Evaluate replacements affecting onsets and
codas, feature constraints and configured inventories; inspect cross-syllable
effects and position interpretation. Do not count licensed morphological
concatenation as a root-internal failure or impose the generated-root whitelist
indiscriminately on inflectional appendants.

## Baseline analysis and preregistration

Analyze both frozen spelling-policy captures through complete archived traces.
Report actual transformed rules and root phone identities, before/after local
sequences, syllable segment/position, stress, template and selected affix.
Separate preexisting duplicates, newly introduced root-domain violations,
cross-source repetitions and unavailable/unsupported cases. Selected trace
events describe emitted words, not every attempted derivation.

Before changing behavior, select and explain the treatment, declare which
constraints apply to which morphological domains, and register all endpoints,
development/held-out roles and capture identities. Preserve the common evaluator
and report distribution tradeoffs, target denominators, diversity, changed RNG
consumption and all unchanged gate failures. Complete configured operation replay
and independent JSON/source-identity recount are separate requirements.

Tests must include the observed /sk/ case; ordinary legal velar softening;
separated /sts, ksts/ repetition; retained prefix/root repetition; custom onset
and coda substitutions; ordered rules where an earlier rule changes the next
rule's context; no-op and written-only rules; omitted-policy parity; and exact
trace/plain draw consumption. Corrupted acceptance/rejection records and source
coordinates must fail replay. A surface-string change alone proves none of these.
