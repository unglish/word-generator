# Independent recount checkpoint

Adds Python implementations of shared ownership observation, repair arithmetic,
doubling arithmetic, grouped counters and complete first witnesses. No generator
or default configuration changes. No formal corpus or quality-gain claim.

The 500 active and 500 legacy public-word checks agree with every per-word shared
and repair observation. The mixed 1,000-word aggregate agrees on all keys, typed
integers, groups, unavailable populations, and full first witnesses. Corruption
tests reject altered counters, missing groups/witnesses, changed witness words,
boolean counts and unknown eligibility represented as zero. Normalization
comparison counts are reconstructed from cells at the scheduled checks.

The archive CLI verifies source/dependency/engine pins and complete ordered
streams before and after recounting. Its five Python modules must themselves be
pinned. A bounded historical control archive passes end to end; rehashed corrupt
reports fail with an empty reserved output. The active-candidate archive path
still needs testing after registered English activation. The analyzer schema
version is now preserved rather than overwritten by the aggregate version.

Certificate record counts are independently derived; reading licenses and full
writer-slot timing still require production verification. These tests do not
establish positive coverage of every rare certificate or construction stratum.
The formal corpus, final-source legacy parity, and paired performance runs remain.

Validation: 50 Node tests pass; changed JavaScript lint passes. Earlier 37/39-test
checkpoints are retained alongside the final log. No runtime suite rerun because
runtime files are unchanged. Original 11 registration pins remain unchanged.

Focused simplification review kept separate per-word, aggregation and archive
modules; historical Q12c and Q13c tools remain untouched.
