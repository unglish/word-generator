# Evidence for #395

Probe scripts (run with `npx tsx <script> ...` from a checkout with node_modules),
the `quality:pr` comparison against main b44940b9, and per-variant trigram
measurements (`meas-*.json`: m = main, mx = +cst-to-xt, mxu = +final-syllable au,
b* = the same on #328's rebuilt head be31375f). `variant-*.patch` are the
experimental diffs; `bxa` adds a planner trim preference that had no effect
(the planner's reading table does not license /ɑ/ au).
