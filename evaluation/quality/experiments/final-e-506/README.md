# Final e at suffix boundaries

The matched sample uses 20,000 independent seeds, 5000000 through 5019999.
The baseline is ce03627a94bc217e556267a939d2fa540ac7e0c9. The candidate is
9580b1c2415dac6bfc275773644815f699ce51fa.

Each record includes the pre-attachment root from the orthography trace,
the last grapheme, the selected suffix and the assembled and emitted
parts. The comparison uses the assembled root to distinguish a boundary
transform from a later surface repair. The spelling and pronunciation
comparisons use final output.

Recreate the samples with Node and the repository's lockfile dependencies.

```sh
node --import tsx /path/to/sample.mts /path/to/baseline before.jsonl
node --import tsx /path/to/sample.mts /path/to/candidate after.jsonl
python3 /path/to/summarize.py before.jsonl after.jsonl
```

Pass a checkout to `witnesses.mts` to replay examples from the issue and
the supplemental `-ial` fixture. The issue originally sampled the older
commit 439b77b0 and a different seed range, accounting for different
counts in the paired sample.

The 20,000-word sample's trigram Jensen–Shannon divergence against CMU
moves from 0.15030658 to 0.14999342 bits, using the repository's quality
distribution code. Run `trigrams.mts` with the two uncompressed samples
from the repository root to reproduce this measurement.
