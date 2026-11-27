# Reviewing the boundary and hiatus stream split

Read [the paired word and score tables](review.md) for 200,000 development draws per revision. The tables include one unfiltered draw from each of the 20 seed streams, the first 20 changed spellings, and the five largest pair-percentile moves in each direction. Each extreme has two complete word traces in `mover-traces.json.gz` and two replayed per-attempt draw records in `mover-draws.json`. The quality harness's report is in `quality/comparison.md`. The structured report and the two source and corpus manifests accompany it.

The extracted legacy-weighted engine is `c5003eb5261217aa86a7633892f43274c0ac85ad` (A). The new streams are `69dee9b803a6038c6dd5fdda22dd0a489b2ae6b4` (B). The original main is `822a9e94caf4ff86560c7e24109364c0fa71ab21`. The quality job's run label contains `04ff8946` because the job started before the last test-only commit. The recorded candidate manifest identifies the clean generator revision `69dee9b8`.

The initially published stack revisions, `037a298d5a73e774a12de1f1a6714da55e8cb191` and `466b421e15a9b6c465b7e67d8c8be84047f414f2`, remove a single end-of-file blank line from the same module on both sides. `verify-emission.mjs` checks the exact tree differences and emitted JavaScript. After PR #563 merged, the PR #564 base became `a1ef9fd85da0b0125e4a04f1107f59272b32cb1a` and the head became `8ebc71ec8ab772da9034daaa568e116aa94ae1d6`. Both base trees are identical. Both published head trees are `cbbf9bc1885907cae0091a699dcbcb39e7f39837`. `check.log` and `check-rebased.log` record the two full gates. The archive keeps the measured, originally published, and rebased heads as parents so these revisions remain fetchable from the tag.

`a-rejections.json.gz` and `b-rejections.json.gz` contain the full 20,000-word rejection audits, including per-seed histograms, output and selected-attempt digests, caller RNG state and fallback witnesses. `shape-parity.log` records a matched check of word keys, word-stage draw counts and first-attempt shape counts on those same 20,000 draws. It checks complete output, trace and per-stage counts on the 5,000 forced bare monosyllables. `stream-perf.log` compares B against A. `stack-perf.log` compares B against the original main. Both contain every alternating benchmark pair.

## Reproduction

Use checkouts of A and B, with locked dependencies, Node 24 and Python 3.10 or newer. Set `EXTRACTION_CHECKOUT`, `STREAM_CHECKOUT`, `MAIN_CHECKOUT`, `PACKET_DIR` and `RESULTS_DIR` to absolute paths. Set `KENLM_BIN` to the directory containing `lmplz` and `query` built from KenLM revision `4cb443e60b7bf2c0ddf3c745378f76cb59e254e5`. These commands run from B. `quality:pr` creates the raw paired corpora. The manifests record the hashes of the original captures. The packet includes the complete paired traces for the reported extreme movers.

```sh
mkdir -p "$RESULTS_DIR"
npm run check
node "$PACKET_DIR/verify-emission.mjs" 69dee9b803a6038c6dd5fdda22dd0a489b2ae6b4 466b421e15a9b6c465b7e67d8c8be84047f414f2
npm run quality:pr -- --base c5003eb5261217aa86a7633892f43274c0ac85ad --out "$RESULTS_DIR/quality"
npm run audit:rejections -- --generator-root "$EXTRACTION_CHECKOUT" --out "$RESULTS_DIR/a-rejections.json"
npm run audit:rejections -- --generator-root "$STREAM_CHECKOUT" --out "$RESULTS_DIR/b-rejections.json"
node --import tsx "$PACKET_DIR/shape-parity.mts" "$EXTRACTION_CHECKOUT" "$STREAM_CHECKOUT"
git show archive/pr-553:review-exports/wordlikeness-research-evidence/uci-reference.csv.gz > "$RESULTS_DIR/uci-reference.csv.gz"
python3 -c 'import csv,gzip,sys; rows=csv.DictReader(gzip.open(sys.argv[1], "rt")); print("\n".join(" ".join(r["spelling"].lower()) for r in rows if r["fold"] != "4"))' "$RESULTS_DIR/uci-reference.csv.gz" > "$RESULTS_DIR/kenlm-training.txt"
"$KENLM_BIN/lmplz" -o 5 --memory 128M --temp_prefix "$RESULTS_DIR" --discount_fallback < "$RESULTS_DIR/kenlm-training.txt" > "$RESULTS_DIR/spell.arpa"
python3 "$PACKET_DIR/review.py" "$RESULTS_DIR/quality" "$RESULTS_DIR/uci-reference.csv.gz" "$STREAM_CHECKOUT" "$KENLM_BIN/query" "$RESULTS_DIR/spell.arpa" "$RESULTS_DIR/packet"
python3 "$PACKET_DIR/packet.py" "$RESULTS_DIR"
node --import tsx "$PACKET_DIR/mover-draws.mts" "$EXTRACTION_CHECKOUT" "$STREAM_CHECKOUT" "$RESULTS_DIR/packet"
npm run perf:compare -- --base "$EXTRACTION_CHECKOUT" --head "$STREAM_CHECKOUT"
npm run perf:compare -- --base "$MAIN_CHECKOUT" --head "$STREAM_CHECKOUT"
```
