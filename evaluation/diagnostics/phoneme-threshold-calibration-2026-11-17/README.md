# archive/pr-452 — phoneme maxOverRepresentation recalibration

Not on the PR branch. Thresholds-only PR: https://github.com/unglish/word-generator/pull/452

## /u/ shift investigation

| Commit | Worst over-rep |
|---|---|
| 14aaf31 (#441) | /u/ 1.063× PASS |
| 22ede9c (#440) | /u/ 1.0679308× FAIL |
| 8d23b4e (#439) | /u/ 1.0679308× FAIL (identical morph-off) |

Cause: #440 illegal-join bans; repairClusters 158→177 including 18 new drop-coda for k|tʃ, z|ʃ, ʃ|h.

## Calibration

30 streams, k=3, on 44e1471. Only maxOverRepresentation moved 1.066→1.08.
