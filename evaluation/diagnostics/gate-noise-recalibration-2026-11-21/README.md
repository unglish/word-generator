# PR #479: gate-noise recalibration — evidence

Not part of the branch. Local checkout paths are replaced with `<scratch>`.

- `calib-main.json`, `calib-main.log`: `npm run calibrate:phonemes -- --jobs 3`
  on main 81df038c (30 streams × 200k words).
- `calib-460-469-branch.*`: the same calibration on the #460/#469 branch that
  failed `maxTotalVariationPct` on seed 42 (paired with main stream for stream).
- `awcluster.mts`: the mono-vowel-spelling test's `aw`-before-cluster measure run
  on seed triples; `aw-exact.mts` is an exact copy of the test's
  `surfaceNucleusForms` loop used by review to confirm the numbers.
- `aw-main-30-triples.txt`: main over triples 1000–1089 (mean 0.58%, SD 0.22%,
  worst 0.94%); `aw-main.txt` / `aw-470.txt`: the test triple on main and on
  the #470 branch.
