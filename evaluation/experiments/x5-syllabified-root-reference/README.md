# X5 syllabified reference verification

The reference run used commit `d209248ecedf312b8aca49d9bfd2eed3cd2caa3e`. Its base was `0494aced4e4417af8e91f6747a39d6659d017c5a`. The run covers the five development seeds of the `lexicon-bare` profile, with 10,000 words per seed. [Mapping and boundary policy](../../../docs/cmu-syllabified-reference.md)

## Results

| Comparison | Evidence |
| --- | --- |
| Inferred boundaries against generator-supplied boundaries | Frozen #304 matched 38,224 of 57,561. The three-stem rule matched 40,450. The local configuration check matched 41,167. |
| Eligible dictionary population | 20,851 distinct roots, representing 42,670 retained surface spellings. The census matched under both weightings across all 5,890 cells. |
| Frozen #304 recount | The full 117,485-entry population reproduced all 3,076 constituent cells. |
| Replay against `main` | The public draw records matched byte for byte for all 50,000 words. The 207 sampled full traces also matched. |

At seed `2380207674`, draw `7` (zero based), *vicker* has supplied syllables `/vɪk.ɚ/`. A stressed-nucleus repair changed `/ə/` to `/ɪ/` in the presence of coda `/k/`. The three-stem rule infers `/vɪ.kɚ/`. The full boundary witness, including root slots and `WordTrace` fields, is in `run/generated-2380207674.json.gz` under `witnesses["audited-min3"]`.

## Packet contents

- `run/manifest.json` records the revision, adapter, policy, protocol, seeds and SHA-256 of each uncompressed result. The seven outputs are gzip-compressed here. They reproduced the reviewed run byte for byte.
- `draws/gold-*.jsonl.gz` keeps one public record per draw, including spelling, root slots, raw sounds, stress and structural and repair event names. `draws/witness-*.jsonl.gz` contains the first full trace for each event or repair in each seed. Both arms produced the same bytes. [Per-file uncompressed hashes and record counts](draws/comparison.json)
- `independent/` contains the public capture script, a dictionary and generated-split recount, its expected counts, and the row and table verifier. The source notices for the dictionary and spelling list are included beside this file.

## Reproduce

From the PR head, install the locked dependencies and set `PACKET` to the absolute path of this evidence directory. Use a scratch `INPUTS` directory containing the pinned `cmudict.dict` and the `root.json` ledger rebuilt from the Phase 1 revision. Set `RUN` to a fresh output path. [Phase 1 input pins and rebuild commands](../../../docs/cmu-root-reference.md#reproduce)

```sh
node --import tsx evaluation/corpus/syllabified-reference-cli.ts \
  --source "$INPUTS/cmudict.dict" --phase-one "$INPUTS/root.json" --out "$RUN"
cp "$PACKET/independent/independent-counts.json" "$INPUTS/"
python3 "$PACKET/independent/verify-output.py" "$INPUTS" "$RUN"
```

For a fresh independent recount, put a checkout of `0de88f5cd4ab51fe2485e38698ca8f528f804a34` in `$INPUTS/phase1`. Run the following from the PR head, with a fresh `INPUTS` directory containing the same dictionary and ledger. The capture writes new records, and the recount builds the expected counts from those records and the pinned dictionary parser.

```sh
node --import tsx "$PACKET/independent/capture-gold.mjs" "$INPUTS"
python3 "$PACKET/independent/independent-recount.py" "$INPUTS"
python3 "$PACKET/independent/verify-output.py" "$INPUTS" "$RUN"
```

To reproduce the branch comparison, run the same public capture once at the base revision and once at the PR head, in separate fresh directories. Compare the decompressed records with the hashes in `draws/comparison.json`. These records preserve the observations before the X5 adapter assigns fitting identities.
