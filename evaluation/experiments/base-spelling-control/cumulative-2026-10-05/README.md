# Q02a cumulative verification

The unchanged original verifier compares all 200,000 development words (20 streams of 10,000) against integrated control cd96f54. All legacy payloads agree after removing only the two new provenance fields; all 200,000 edit ledgers replay exactly, and every core profile agrees. Candidate source is 67499a8.

This packet retains the complete report, both manifests and summaries, source archives, registration, execution logs, and receipts for every raw artifact. The raw archives remain in the local retained evidence directory; this compact packet alone cannot rerun word-level verification. Run verify.py to authenticate the packet and its scope. The original verify.ts in the parent directory can rerun the full comparison when both raw archives are available.

This does not establish fresh whole-suite, timing, human-preference, or general RNG results. The earlier 20,000-coordinate RNG supplement is separate. Same-device retained evidence is not an independent backup.
