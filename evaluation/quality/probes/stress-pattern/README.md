# Lexical metadata detachment parity

`detachment-parity.ts` checks the metadata cloning prerequisite, before
Q09a adds any new stress-pattern tracing. It generates each of the frozen
20 development streams for 1,000 draws, both with and without tracing:
20,000 distinct scheduled draws and 40,000 generated words per source.
The schedule and source-snapshot helpers are reused from the pinned Q08a
probe in `../syllable-weight/shared.ts`; that file and this script are
both included in the tool fingerprint. No historical observer assumptions
from that probe are executed.

```sh
node --import tsx evaluation/quality/probes/stress-pattern/detachment-parity.ts CHECKOUT FULL_COMMIT REPORT.json
```

The command rejects a source-file set or file content that differs from
the supplied full commit, checks source/tool stability, and exclusively
creates the report. It records complete output hashes, full trace hashes
without dropping any field, RNG call-count hashes at every word boundary,
total calls and the next RNG value. Trace-on/off equality is asserted
within each report. Corresponding reports must have identical `streams`,
Node version, schedule hash and tool fingerprint; source identities must
remain separately recorded. Its source digest covers runtime source plus
package/lock/TypeScript configuration under Q08a's hash convention; the
#307 full control manifest has its own separately checked generator digest.

The full 200,000-word pre/post controls additionally require all 20 raw
word archives to be identical and verified against their manifests. The
frozen #307 evaluator is untracked prerequisite tooling in this checkout;
its digest must remain
`ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007`.
No source, observer or reference change is hidden by rescoring a prior run.

Five public-API mutation fixtures in `src/core/lexical.test.ts` failed
before the correction and pass after it. They cover ordinary root,
assembled and surface views, a promoted vowel copied back to root,
and a reduction target copied from the inventory. Assertions verify
separate metadata objects before mutating them, so running the expected
pre-fix failures cannot pollute the shared inventory.

Compare the full controls and paired RNG reports without regenerating:

```sh
node --import tsx evaluation/quality/probes/stress-pattern/compare-detachment.ts BEFORE_RUN AFTER_RUN BEFORE_PARITY.json AFTER_PARITY.json REPORT.json
```

The comparator verifies both archives with the frozen foundation reader,
requires exact source/report correspondence, exact raw shard sets, equal
profile summaries/configuration/environments, and byte-identical pinned
word shards. It separately validates every scheduled RNG stream and
compares all recorded word/trace hashes and RNG observations.

An independent Python pass checks artifact bytes/hashes, source content
against the pinned Git commit, evaluator/reference identities, shard sets,
every draw coordinate, and summary/profile/replicate counts:

```sh
python3 evaluation/quality/probes/stress-pattern/verify-archive.py RUN CHECKOUT REPORT.json
```

The foundation reader verifies the JavaScript-canonical manifest digest;
the Python report pins the same manifest file bytes with SHA-256 instead
of pretending Python's JSON key ordering is the same serialization.
