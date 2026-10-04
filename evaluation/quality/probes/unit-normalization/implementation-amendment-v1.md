# Q13c v3 implementation clarification 1

Registered before any candidate evaluation/capture. This adds an authoritative field needed to implement the already registered actual pre-unit quota-state contract. Original protocol/design/preparation files remain byte-identical.

Every v3 unit records `doublingIncrement: 0 | 1`, the actual difference in the existing writer's doubling count immediately before and after the existing sampler. The field and comparison are independent of trace retention. It consumes no new randomness and does not alter the sampler, quota policy or future selection state. V1/v2 units retain their existing field absence and snapshot bytes.

The v3 verifier requires this observation and matches the original configured outcome by inventory selection, emitted after-doubling form **and quota increment**. This matters when a custom doubled form equals the undoubled form: equal text does not identify which probabilistic branch occurred. Choosing the first matching text would produce false later quota evidence.

Fixtures must include equal-text probabilistic and forced-100% outcomes, subsequent quota effects, forged/missing increments, and trace-on/off equivalence. The certificate still describes only local emitted support. Independently finite positive weights whose sum overflows, underflowed zero probability, and nonfinite/zero doubling outcomes cannot supply normalization support. Structural commit validation rejects such certificates before any ID advancement.

The conservative cap boundary applies after **any accepted local normalization in this word's history**, including when a later generic rewrite consumes all live normalized cells. This experiment does not prove independence of a subsequent whole-sequence counterfactual from that historical normalization; overbudget attempts retain the existing distinct `normalization-context-unavailable` refusal. Satisfied budget measurements remain satisfied. Limits, search bound/order/ties, endpoints and gates are unchanged.

Parent approved this clarification in the implementation review. It is additive provenance and explicit enforcement of existing support/dependency obligations, not an outcome-driven change to the hypothesis.
