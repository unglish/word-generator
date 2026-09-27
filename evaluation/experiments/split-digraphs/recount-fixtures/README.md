# Independent completion arithmetic fixtures

120 fresh public API words from continuous seed 129, with morphology enabled
on even draws and disabled on odd draws, use the active `measurement.json`
configuration. Each archived row retains its complete word/trace and production
observer result. These fixtures are separate from the stopped candidate capture.

The Python recount checks all 284 completion attempts, 27 evaluated pools,
80 candidates, 19 draws, 22 selected replacements and five infeasible pools.
All 600 integer comparisons with production observer counts pass. It also
checks conditional probabilities against exact rational weight ratios and
selected intervals against the registered binary64 accumulation law.

This independently verifies arithmetic and certificate bindings, not candidate
eligibility, source reading licenses, or final-root classification. Those remain
additional recount work. No corpus quality conclusion follows from these fixtures.

Run unit tests with `python3 -m unittest discover -s
 evaluation/experiments/split-digraphs -p test_recount_completion.py` (one line).
The recount module imports no generator or observer code.
