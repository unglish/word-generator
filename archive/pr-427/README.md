# Evidence for #427 (paired perf gate)

Calibration run: GitHub Actions run 42855732024 on branch `exp/ci-calibration`,
workflow `.github/workflows/exp.yml` (this commit).

- `perf (0)` x10: base = head = same commit (A/A). Also runs the old absolute test.
- `perf (0.05|0.10|0.20)` x2 each: head slowed with `exp/inject-slowdown.sh`.
  These ran with the then-default 10% limit; #427 ships 5%.
- `perf-summary.txt`: job | CPU | old absolute words/sec | paired median, range, verdict | gate seconds.
- `all-summary.txt` also covers the vitest parallel-vs-serial jobs (evidence for #377).
- `logs/`: raw perf job logs.
