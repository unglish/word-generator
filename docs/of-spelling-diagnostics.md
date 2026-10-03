# Productive `of` spelling diagnostics

This diagnostic supports the common-word coverage investigation in
[issue #85](https://github.com/unglish/word-generator/issues/85). It does not
change generation probabilities or establish that `of` should be frequent.
It uses the root planning trace fields introduced by PR #305.

## Controlled writer regression

Run the focused test with:

```bash
npx vitest run src/core/common-word-orthography.test.ts
```

The test constructs explicit phoneme/grapheme combinations with all gap spellings
disabled and checks the resulting spelling and absence of gap-spelling repairs:

| Nucleus | Coda | Selected letters | Result |
|---|---|---|---|
| /ɔ/ | /f/ | `o` + `f` | `of` |
| /ʌ/ | /f/ | `o` + `f` | `off` |
| /ə/ | /f/ | `o` + `f` | `off` |
| /ɔ/ | /v/ | `o` + `f` | `ofe` |

These are controlled writer paths, not claims about the usual pronunciation of
English `of`. They establish behavior once particular segments and graphemes
are supplied. They do not prove that a normal generator run selects those inputs
or that the resulting spelling appears at a useful frequency.

## Seeded generation probe

From the repository root, with development dependencies installed:

```bash
node --import tsx scripts/issue-85-of-probe.ts --seed 85 --count 100000 --mode lexicon --morphology true
```

Defaults are seed 85, 100,000 returned words, lexicon mode, and morphology enabled.
`--mode` accepts `lexicon` or `text`; `--morphology` accepts `true` or `false`.
Use a fixed seed, count, mode, morphology setting, and source revision when
comparing results. The probe uses the public `createGenerator` API with a shared
seeded RNG and `trace: true`. Output goes to stdout and does not alter fixtures.

The probe removes gap-spelling entries whose names start with `of-`; other gap
spellings remain active. That convention is not a semantic detector for every
possible override: revisit the filter if an `of` override is added with a
different name. The controlled writer test above disables all gap spellings.

The report includes:

- Counts of two-phoneme root targets, one-syllable targets, and planned VC shapes.
  VC means an empty onset, one nucleus, and one coda phoneme.
- Realized VC roots from the saved `generateSyllables` stage, with counts for
  selected vowel/coda pairs and their marginal frequencies.
- Counts of final onsetless monosyllables and selected final spellings, including
  `of`, `off`, and `ofe`.
- The first returned-word index, final spelling, pronunciation, and morphology
  template for each observed category. Indexing starts at one.

## Interpretation limits

The plan counters describe the retained generation attempt's root plan. They
are not counts of every proposal or rejected attempt. The realized-root counter
is independent of the two-phoneme-target counters, so this report is not a
strictly nested probability funnel.

`generateSyllables` is the initial root stage. Subsequent stress changes,
structural repairs, morphology, and writing can change the final form. A first-hit
final spelling attached to a root category is not necessarily a spelling of
that root alone. Inspect the corresponding trace's stages, grapheme selections,
structural events, repairs, and morphology before attributing a final spelling
to a particular cause.

The pair expectation is `vowel_count * coda_count / realized_VC_count`: an
independence reference computed from this sample's marginals. It is not the
generator's predicted probability, a significance test, or evidence of a defect.
Zero observations in a finite run do not establish impossibility. The printed
ratio is zero when the expected count is zero and should then be treated as
undefined for interpretation.

Printed counts use the host locale's number formatting. Compare runs on the same
runtime and locale for byte-identical reports. Changing morphology or any other
sampling option also changes RNG consumption; two runs with the same seed and
different settings are not matched word-by-word experiments.
