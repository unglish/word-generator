# Following-letter preservation: mutation coverage

Source review of `src/core/base-spelling.ts` after initial-selection integration.
The intact-cell guard is a tested primitive, not yet a complete runtime guard.

| Mutation path | Existing boundary | Required following-letter integration |
| --- | --- | --- |
| `appendChoice` | Appends original selected cells | Establish obligations only when their following context is known; distinguish partial spelling from a closed root. |
| `edit` | Projects rewrite before split/shared guards | Evaluate projected following context before committing; retain explicit refusal evidence. |
| `editBatch` | Projects whole transaction atomically | Check final projected surface, not intermediate edits that may temporarily violate adjacency. |
| `replaceWithGapSpelling` | Direct whole-root rewrite and construction supersession | Keep lexical supersession explicit and ownership unavailable; do not mislabel it as certified preservation or silently veto every lexical override. |
| `recordSharedAttempt` | Verifies trial and commits newly joint-owned cells | Constrain trial support before sampling; distinguish preserved neighbors from target units transferred into joint ownership. |
| `recordSplitAttempt` | Prepares atomic split transaction | Check physical next cell after the complete target unit against the projected transaction; preserve split licensing. |
| `recordCompletionAttempt` | Samples then prepares whole-nucleus replacement | Filter completion support before sampling if a preceding target constrains its first letter. Rejection after drawing would define a different kernel. |
| `applyNormalization` | Validates whole-unit normalization certificate | Use projected licensed reading and cells. Do not equate disappearance of old cell IDs with loss of the underlying phone. |
| `commitLicensedPlan` | Validates and atomically commits coverage replacements | Condition the coverage planner on target readings/adjacency; verifier must recompute the same support. |

## Consequences

A guard inserted only in `edit` cannot protect the other direct splice paths.
A guard inserted only in `commitRewrite` cannot safely communicate refusal to
callers that already updated output strings or construction records. Throwing
at every rejected commit would turn valid generation into exceptions rather
than provide the requested model.

For probabilistic planners, admissibility belongs in support enumeration and
must be replayed by their verifier. For deterministic generic rewrites, a
recorded refusal before mutation is appropriate. New refusal evidence must be
represented in the timeline and verified against the proposal and live state;
adding an unverified boolean would weaken trace-first measurement.

The protected entity is the phone's supported reading with its complete owned
extent. Existing `resolveSingleSpellingUnit` handles selection, normalization,
licensed and completion ownership. Use that resolver for current/projected
views, with the matching certificates, rather than relying forever on the
original source-cell IDs. Joint and split targets require construction-aware
licensing; unavailable evidence remains a separate result.

Final morphology occurs outside this ledger. Root preservation does not close
that scope, and the final report must retain its separate denominator.

## Concrete regression

The retained public seed 464 with a synthetic word rule `(?<=c)e` → `a` changes
root `ceff` to `caff`, yielding `uncaff` after morphology. The source c remains
single-owned while the next physical letter changes from e to a. The pure guard
refuses this transaction and permits e → i. Seed 41 did not expose the gap:
its split-construction guard already refused the same proposal. Both cases
must inform integration; a passing split case is not coverage of ordinary cells.
