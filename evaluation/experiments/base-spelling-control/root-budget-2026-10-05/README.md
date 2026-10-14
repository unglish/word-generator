# Q02a root-budget integration verification

Candidate 02f8b10 versus integrated control bb1069b: the unchanged original verifier compares all 200,000 development words across twenty 10,000-word streams. Complete legacy payloads agree after removing only the two new provenance fields; all 200,000 ledgers replay exactly, and all core profiles agree.

The separate original supplement passes 20,000 coordinates and 80,000 public calls across both arms, checking complete words, legacy traces, trace on/off, per-draw RNG counts, next RNG values, and 20,000 ledgers. Thirteen base-spelling fixtures and strict TypeScript pass. Full reports and logs are retained.

The packet includes both manifests, summaries, source snapshots and receipts for every raw artifact. Raw archives are retained locally; the compact packet alone cannot rerun the word-level comparison. Run verify.py to authenticate packet correspondence; the original parent verify.ts requires both full archives. No fresh whole-suite, performance, human preference, or future-main claim. Same-device retention is not an independent backup.
