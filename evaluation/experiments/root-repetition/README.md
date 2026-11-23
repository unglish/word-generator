# English root repetition

This packet compares origin/main at `ce03627a` with the implementation commit that is
the parent of this evidence commit. Runtime code, tests, and behavioral documentation
live on the PR branch. This packet is archived separately.

- `probe.mts` emits the trace-based counts, exact-length strata, normalized phoneme
  distances, invariant counts, and example traces. Its default seed block is
  5,000,000–5,019,999. `START_SEED=6000000` selects the holdout.
- `witnesses.mts` compares the two revisions at the same seeds and compares reduction
  with and without its multiplier while holding the lexical generator constant.
- `marginals.mts` samples the development RNG streams in the committed quality
  protocol and reports phoneme distances and surface rime counts.
- `comparison.md` gives the measurements used in the PR.

Run the probes from the root of the revision being measured, with Node and the
repository's dependencies installed. For the primary trace count, rebuild the
stripped root reference in the `0de88f5c` checkout using the pinned corpus inputs in
`docs/cmu-root-reference.md` and pass its path as `ROOT_JSON`:

```sh
ROOT_JSON=/path/to/root.json node --import tsx /path/to/probe.mts
ROOT_JSON=/path/to/root.json START_SEED=6000000 node --import tsx /path/to/probe.mts
BASELINE_ROOT=/path/to/ce03627a node --import tsx /path/to/witnesses.mts
node --import tsx /path/to/marginals.mts
```
