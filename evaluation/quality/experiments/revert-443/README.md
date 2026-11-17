# Evidence for PR #451 — revert #443

Lightweight packet (word archives omitted; see local `memory/quality-pr/revert-443` if needed).

- Distribution dumps: `reverted-200k.txt`, `main-200k.txt`
- Gate consoles: `gates-reverted.txt`, `gates-main.txt`
- Coverage seed 85: `coverage-85.md` / `.json`
- Quality compare summaries + `quality-pr/comparison.md`
- Scripts: `measure2.mjs`, `perf.mjs`

Phoneme over-rep gate failed on this PR (`u` 1.068× > 1.066×); thresholds not edited.
