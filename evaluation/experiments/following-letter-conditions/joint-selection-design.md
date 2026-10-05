# Q14b candidate design: local joint selection

Status: selected design direction after the verified control baseline; not a
frozen policy and not a candidate result. Implementation, preservation rules,
independent probability checks and candidate capture remain required.

## Evidence and scope

The verified 200,000-word control contains 2,065 incompatible initial soft-c/g
units; 2,029 persist at the root boundary. There are 34 corrections and two
transitions from incompatible to joint ownership. No tracked soft unit becomes
incompatible from a compatible initial state. All four profiles show the same
selection-origin pattern. This motivates changing the choice process where
written adjacency is established, with explicit guards for later rewrites.

The intended initial experiment enforces productive soft c/sc for /s/ and g
for /dʒ/ through typed configuration. Hard-g exceptions remain separately
reported. Custom configurations do not implicitly inherit the English policy.
A root-only success cannot establish assembled-word reading compatibility.

## Proposed local sampling law

For a current slot and its fixed incoming state, enumerate each supported
inventory choice and each positive-probability doubling realization. Keep
inventory identity even when forms duplicate. Let p(a) be the probability of
realized alternative a under the existing resolver and doubling model.
For each a, resolve the next slot using a's realized previous form and updated
doubling count. Enumerate its doubling realizations, giving p(b | a).
Let L(a,b) require the current realized reading to accept the next visible
letter and the incoming preceding reading to accept a's first visible letter.
The proposed pair mass is p(a) p(b | a) L(a,b).

Normalize over all pairs with positive mass, sample a by its marginal, and
sample b conditionally. This is an exact conditional law for that *local pair*,
not the complete writer. Never label it globally distribution-preserving.
Prefix-sensitive weights must be evaluated separately per a; weighting all
surviving a equally would implement a different law.

Before implementation, resolve pair overlap explicitly: reserving b consumes
its selection once, while any obligation on b must also be checked against its
successor. An arbitrary one-step reservation cannot guarantee a legal chain.
The planner needs a defined connected span of dependent obligations, with
finite-state continuation masses or an explicitly different registered law.
There must be no hidden retry cap or dropped mass on exhaustion.

## Necessary state and integration work

The resolver uses previous realized form and doubling count. Doubling also
uses the current or previous syllable's nucleus form. Therefore the planning
state must include those nucleus forms and structural position. The selected
inventory entry and realized form are distinct evidence. The existing pure
`describe` method supplies fixed or probabilistic doubling transitions; calling
its random sampler during planning would consume the stream incorrectly.

Immediate duplicate normalization follows each draw. Syllable edits run before
later slots; root edits and vowel completion run subsequently. Establish
whether selection-state nucleus forms and previous forms track original or
rewritten choices before moving any execution boundary. The planner must not
silently postpone edits or substitute rewritten text into legacy prefix state.

The following letter is the first physical cell after the entire realized
unit, not the next phoneme's place category. Empty forms and deletion need
explicit handling; shared/split units cannot be flattened into invented
single ownership. Root preservation must constrain or re-plan later operations
that would invalidate an accepted obligation, with certificate replay and
infeasibility evidence. Root ownership cannot certify affix realization.

## Required proof before registration

- Enumerate small custom inventories independently and compare complete
  outcome probabilities, including duplicate forms, zero weights, doubling
  probabilities 0/100, quota relaxation and fallback-only inventories.
- Specify RNG count/order for zero, one and multiple legal outcomes, including
  the treatment of the historical 100-percent doubling draw.
- Define zero legal mass without deleting output words, widening support
  silently, or selecting a convenient spelling outside the declared model.
- Resolve adjacent obligations and syllable boundaries; test normalization,
  shared ownership, split construction, completion and morphology separately.
- Keep omitted-policy public outputs, full traces and next RNG values exactly
  compatible. The enabled trace must explain its own choice law rather than
  pretending its roll came from the legacy weights.

This document identifies unresolved algorithmic obligations; it does not
register an incomplete pair sampler as the final solution.
