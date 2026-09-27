# Q13b complete source ownership — preparation stage

The source resolver accepts complete ordered original units and tracks each phone,
input cell and source syllable part separately from the first-part display anchor.
It refuses partial, missing, mixed, reordered and generic-rewrite-owned inputs.
Following context requires the complete next unit, not merely its first letter.
No generator path uses the resolver yet; no candidate corpus or quality gain is
reported at this stage.

Prior semantic licenses must already have been verified. The resolver checks
live extent and certificate identity; it is not a replacement for production
coverage/normalization license replay or an independent archived-evidence verifier.
Tests exercise both actual repair planners and replay their evidence before
resolving repaired units. Forged phone/edit claims are rejected.

## Checks and retained failures

- v1: 53 pass, nine failures. Seven came from the test table supplying individual
  IDs instead of arrays; two fixtures mistakenly used identical-text no-op edits.
- v2: 62 pass, one failure. The new partial following-vowel fixture exposed a
  real missing completeness check in the unactivated resolver.
- v3: all 63 policy/ownership tests pass after requiring complete following units.
- v4: all 197 tests pass across policy, ownership, coverage and normalization.
- Strict TypeScript v1/v2 and changed-source ESLint v1/v2 pass.
- Focused simplification extracted owned-position lookup and following-context
  resolution. Existing generator algorithms are unchanged.
- All eleven preregistered files retain their recorded byte counts and hashes.

Remaining registered work includes joint-cell origins and certificates, replay,
named writer-slot integration, atomic repair handling, subsequent-edit guards,
legacy parity, frozen corpus capture, independent recount and paired timing.
