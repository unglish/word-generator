# Premeasurement validation

The omitted-split-policy comparison passes 20,768 coordinates, 83,072 public
API calls and 128 next-value probes against exact Q13b commit
`5f9b3ebd495857e02e4104a3b02f89e9c06bfc8c`. Complete traced and untraced
word objects, cumulative RNG calls and subsequent RNG values match. The
runner includes 20,000 registered development coordinates and 768 custom
probability, reversed-rule-order and disabled-doubling coordinates. Shared
spelling remains configured as in each revision; only split policy is absent.
Source hashes are verified before and after. This is compatibility evidence,
not active-policy quality evidence.

The full suite reports 1,021 passes, four failures and one skip. The failures
exactly retain the Q13b reported values: 9/100,000 long grapheme runs,
28/100,000 long consonant-letter runs, 43/10,000 custom max-three runs,
and six ck-plus-another-double words against a limit of five. No gate changed.
The new split-writer tests pass, including the 500-word active integration run
and 64-word empty-support diagnostic. The latter proves no formed splits and
no legacy formation edits; completion can still select supported alternatives.
It is not a successful quality intervention.

Gzip files preserve the complete logs, parity report, source/engine authority,
and control materialization manifest. `manifest.json` pins compressed and
uncompressed bytes. The runner is in `../tools/q14a-legacy-parity-v1.mjs`.
Registered active corpus measurement and paired performance remain outstanding.
