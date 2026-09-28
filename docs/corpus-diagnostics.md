# Reproducible corpus diagnostics

The canonical phoneme and trigram analyzers now use one continuous public-API RNG
stream per seed. The previous `seed + drawIndex` schedule made the nominal five
400,000-word replicates repeat most inputs: only 401,295 distinct seed/config
inputs were present among 2,000,000 calls. The new reports identify their schedule
as `continuous-seeded-stream-v1`, record each seed, and count draws within it.
Distinct streams do not establish statistical independence or unique spellings.

Both analyzers report union-based Jensen–Shannon divergence in bits, missing
reference mass, generated-only mass, and union correlation. Explicit zero counts
are treated as absent categories. Empty distributions have unavailable divergence
rather than a perfect score. Historical shared-category correlation remains
labeled for comparison; it can conceal a missing phone.

For example, generated counts `{a:60,b:39}` against reference counts
`{a:60,b:39,c:1}` previously produced shared correlation 1 while omitting `c` from
underrepresentation rankings. It now reports `c` at zero representation, 1% missing
reference mass, and positive divergence. The known distribution pair
`P=(1/2,1/2), Q=(1,0)` scores 0.31127812445913283 bits.

The phoneme analyzer and distribution gate share normalization and metric code.
The previous test-only Unicode range also dropped valid IPA letters such as
`æ` and `ð`; normalization now retains them and reports any rejected tokens.
These are deliberately coarse corpus aliases, not a test of stress, dialect or
surface spelling agreement.

## Measured run

These diagnostics do not alter generator behavior. Each analyzer ran 100,000 bare
lexicon outputs: 20,000 draws from each seed 42, 123, 456, 789 and 1337. This run
uses the new stream schedule and is not paired with historical `seed+i` reports.

| Measure | Phonemes | Written trigrams |
|---|---:|---:|
| Union categories | 39 | 9,237 |
| Union Pearson correlation | 0.998648 | 0.667564 |
| Jensen–Shannon divergence (bits) | 0.000178 | 0.182715 |
| Missing reference mass | 0% | 4.248633% |
| Generated-only mass | 0% | 1.249139% |
| Full traced category witnesses | 33 | 66 |

No phoneme tokens were rejected by normalization. The retained
[summary and hashes](../evaluation/diagnostics/baseline-v1/summary.json) identify
the compressed full reports. Each witness records its seed, draw index, output,
and complete `WordTrace`; the analyzer replays those locations after ranking.
Absent categories cannot have generated witnesses and must be interpreted from
the complete counts instead.

All 800 unfiltered development review draws also replayed with exact serialized
word and trace equality against the original frozen baseline.

Phoneme over/underrepresentation and absolute-gap rankings retain their minimum
reference-frequency cutoff. Generated-only phones appear in their separate table
and contribute to union distance; the phoneme absolute-gap table is therefore not
a complete union ranking. Trigram absolute gaps cover both inventories.

## Reproduce

```sh
npm run test:diagnostics
npm run analyze:phonemes -- --count-per-seed 20000 --output linguistic-diagnostics-phonemes
npm run analyze:trigrams -- --count-per-seed 20000 --output linguistic-diagnostics-trigrams
```

`test:diagnostics` compiles the library before running CLI tests. Compile again
after changing source: the analyzers consume `dist/`. The default sample remains
five streams of 400,000 words; report titles use the actual requested count.
Duplicate or invalid seeds and fractional draw counts are rejected. Distinct seeds
can still select overlapping stretches of the generator's single RNG cycle. The
default seeds are at least 155 million draws apart, about four times what a
400,000-word replicate consumes, but custom `--seeds` are not checked for overlap.

Tests cover absent/zero categories, extreme finite counts, known divergence,
continuous sampling, trace replay, and persisted report/witness consistency.
This is improved measurement, not evidence that readers prefer the outputs.
