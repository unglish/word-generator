# Phoneme gate calibration (2026-09-27)

Both files are unedited `npm run calibrate:phonemes` output, measured on `main`
at 0abaff3 (200,000 words per seed, lexicon mode, morphology off).

`calibration.json` sets the limits in `src/config/phoneme-thresholds.json`:

```sh
npm run calibrate:phonemes -- --count 30 --output calibration.json
```

`holdout.json` checks those limits on 10 seeds whose streams start midway
between calibration streams. Its `proposals` are not used. Only its per-seed
`results` are compared with the committed limits:

```sh
npm run calibrate:phonemes -- --seeds 3305470270,1663455158,21440046,2674392230,1032377118,3685329302,2043314190,401299078,3054251262,1412236150 --output holdout.json
```

All 10 holdout seeds pass. One seed (2043314190) falls outside the calibration
range on three metrics but stays inside every limit:

| Metric | Seed 2043314190 | Calibration extreme | Limit |
|---|---:|---:|---:|
| Pearson r | 0.99847 | 0.99852 | 0.9983 |
| Worst over-representation | 1.05794 | 1.05607 | 1.066 |
| Worst absolute gap % | 0.35170 | 0.34599 | 0.39 |

These results support headroom beyond the observed calibration extremes. They do
not establish a particular false-failure probability or prove that k = 3 is the
unique appropriate margin. Non-overlapping RNG segments avoid reused draws but
do not prove independence. Generated-only mass and missing CMU phonemes remain
fixed zero requirements; violating runs cannot produce calibration proposals.
