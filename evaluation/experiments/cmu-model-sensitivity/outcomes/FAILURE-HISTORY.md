# Retained preparation history

All items below precede the reviewed formal freeze. The full formal matrix and
independent proof passed on their first frozen invocation; no outcome-driven code
or tolerance changes occurred. The indexed original preparation files are in
[`machine/preparation/history.tar.gz`](machine/preparation/history.tar.gz), with
per-entry byte identities in `history-manifest.json`.

- The initial Python ordered-stream fixture used macOS's aliased `/var` temporary
  path. The strict no-symlink guard rejected it; the fixture used a resolved path.
  Original failure: `q15-model-sensitivity-python-tests-v1.log`.
- A tiny cross-language fixture initially loaded the external pure TypeScript
  identity module without handling its ESM/CommonJS shape. It was adapted after
  exact source pinning; the source identity contract did not change. Original
  failure: `q15-model-sensitivity-python-tests-v3.log`.
- Early TypeScript table-driven fixtures had array/argument inference errors.
  Explicit fixture objects fixed those errors. Original failure:
  `q15-model-sensitivity-review-typecheck-v1.log`.
- A metadata wrapper initially interpreted `git diff --no-index` status 1 as a
  whitespace failure. Status 1 denotes content differences; a negative whitespace
  control and empty diagnostics established the correct interpretation. The
  source-review-v1 record retains this reporting failure; no threshold changed.
- Source review found that Python sorted-key JSON did not reproduce JavaScript's
  numeric property ordering. Preserved numeric lexemes and JS index/UTF-16 key
  ordering fixed manifest preflight before any full scoring. The old verifier and
  tests, successful metadata proof and parent review are retained.
- A one-ULP synthetic example exposed cancellation sensitivity in subtracting
  separately rounded large totals. Decomposition-only expansion/fsum accumulation
  and signed-term residuals were reviewed before the freeze. Per-word scores,
  summary means, design/protocol bytes and fixed tolerances stayed unchanged.
  The first patch's `yield*` iterator annotation failed TypeScript 4.9 checks;
  explicit iteration fixed it. Both failed typecheck logs and first-patch source
  remain in the history archive.

The final reviewed checks were 37 TypeScript tests, 17 Python test groups, eight
cross-language decomposition/Fraction fixtures, strict corpus/review type checks
and targeted lint. The original preparation records retain their historical
“no full scoring yet” status; those dated-stage statements are not rewritten to
pretend they were formal outcome reports.
