# Corpus runner smoke validation

A 24-word development archive uses the existing public capture API, four
profiles and two streams per profile. Production analysis checks artifact and
configuration binding, complete ordered streams, accounting denominators and
unchanged source/dependency/runtime closure. Independent recount agrees on
258 events, 4,958 per-word counts and every count in 86 groups.

Three corruption/integration tests pass: the complete smoke, rejection of a
wrong completion authority and rejection of incorrect group totals even after
resealing their artifact hashes. Run smoke-corpus.mjs with a fresh
/private/tmp/q14b-corpus-smoke-vN directory, then set Q14B_SMOKE to that directory
when running test_recount_corpus.py. The small sample is never a formal baseline.

Full raw smoke archive and analysis: /private/tmp/q14b-corpus-smoke-v1.
The production authority pins the sources at smoke time. The baseline run adds
run-control.mjs and baseline-binding.json and records its own source closure.
