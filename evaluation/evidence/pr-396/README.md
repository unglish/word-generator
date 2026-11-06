# Evidence for #396

- `codas.mts`: monosyllable coda distribution vs CMU single-vowel words
  (`cmudict.dict` at revision 74790861, SHA-256 81917843…). `UNFORCED=1` samples
  automatic monosyllables instead of `syllableCount: 1`.
- `codas-*.txt`: its output for requested (main), automatic (main), requested (fixed).
- `open.mts`: open-checked-vowel and /ʊ/ rates, requested vs automatic vs CMU.
- `quality-comparison.md`: `npm run quality:pr --base origin/main`.
- `meas-*.json` (`measure.mts`): trigram JS per profile. m = main, b = #328 head
  be31375f, f = + this fix, all = + this fix + #395.
