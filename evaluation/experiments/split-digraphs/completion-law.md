# Registered obligation-completion law v1

Frozen with the formation law before implementation. This is not yet an
implemented or empirically validated behavior.

After the optional split-formation routes and after later root edits, process
unresolved `open-vowel-or-split-marker` nucleus units in original phone order.
Recheck the full live state before each decision; earlier completions may alter
neighbor context. Leave satisfied open or live split readings unchanged.

For an unresolved unit, enumerate the ordinary positive-weight resolver pool
using the current complete prefix and original phonological slot. Preserve its
existing hard conditions, positional rules, stress weights and quota policy.
For each candidate, propose an atomic whole-nucleus replacement with a complete
supported reading and no new split-marker obligation. Recompute affected
neighbor readings and existing constructions against that proposed surface.
Discard unsupported proposals with a recorded reason. Do not change consonant
spellings, phones, or weights merely to make one alternative fit.

Condition the resolver weights on the surviving proposals. One survivor uses
no random draw; two or more use exactly one uniform draw in [0,1), with cumulative
weights in original inventory order and strict interval boundaries. No survivors
means an explicit infeasible outcome and no draw. Preserve duplicate inventory
entries as distinct alternatives; they may have different conditions or weights.
Do not select by spelling length or maximum weight. This is a local conditional
law, not a sample from a globally conditioned word distribution.

Resolver fallback-only entries remain subject to the resolver's existing
fallback rule: they are exposed when its ordinary context-valid pool is empty,
not whenever the new reading filter dislikes an ordinary option. Record that
pool status and any quota relaxation. All unsupported-only pools remain
infeasible rather than silently changing fallback policy.

Record original unit, live input cells, cursor, candidate inventory indices,
original and retained weights, refusal reasons, normalized probabilities,
draw/skip, chosen output and post-edit reading checks. Verification reconstructs
the pool and proposed states from pinned config; it does not trust serialized
weights. Independently test arithmetic with rational synthetic weights, boundary
rolls, singleton/empty pools and permuted inventory. Public-API fixtures cover
interaction with optional formation and prior repairs.

A single final pass is the registered algorithm: if changing a later unit would
invalidate an earlier satisfied reading, that proposal is refused. Do not
silently iterate or retry with new random draws. Report all remaining unresolved
units; a nonzero result is a real limitation, not permission to label the root
complete. Full-word and distribution tests determine whether this law improves
the requested behavior without unacceptable new effects.
