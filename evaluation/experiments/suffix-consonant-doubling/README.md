# Evidence for #518

The base is ce03627a94bc217e556267a939d2fa540ac7e0c9. Compare the base and fix with the public `generateWord({seed, trace: true})` API, using seed 5000000 through 5019999, inclusive.

Run from the candidate checkout with dependencies installed:

```sh
node --import tsx /path/to/probe.mjs /path/to/base-checkout /path/to/candidate-checkout > results.json
```

The probe compares `baseSpelling.surface` to `morphology.realization.assembledParts` for the affected suffixes. The lexical root supplies the final coda phone. It records emitted roots and hard-c repair entries, and uses the quality harness's distribution distance function and checked-in CMU trigram counts.

The only 19 default spellings that changed were roots whose final s spelled /z/. Seed 5000485 changed from `fessed` to `fesed` with /fɜzd/ in both versions. The 315 other valid doubles and five /s/ doubles stayed the same seed by seed. The default sample had no doubled h or transform-generated cc on either revision. Full-word trigram divergence went from 0.150306585 to 0.150406560 bits. Pronunciations were identical on all 20,000 seeds.

Default hard-c repair already runs on the written base before boundary assembly and recorded 992 repairs on both sides. To exercise c attachment in isolation, the seeded regressions disable that earlier hard-c repair and use the ordinary generator API. Base seed 5000099 assembled `fuliglozic` before `ing`, and seed 5009761 assembled `swacc` before `ed`. The fix assembles `fuliglozick` and `swack`, yielding `fuliglozicking` and `swacked`. Unit cases also cover bus → bussed, picnic → picnicked, and excluding final /z/ and h.
