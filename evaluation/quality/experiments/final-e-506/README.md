# PR #521 silent-e suffix audit

Paired the same 100,000 default lexicon words, seeds 5000000–5099999, using
`generateWord({ seed, trace: true })` at main
`e85049df96da0eb7e700320a9635240f1099d111` and rebased PR head
`41d1d6864bf8bd80f1db8538b7c7d359f348074a`.

Every changed spelling has a single e deletion at the root/suffix boundary.
For each deletion, the final e in the base spelling was attributed to the
final coda grapheme by the orthography trace. The same suffix spelling and
allomorph were realized. Word pronunciations matched for every pair.

The comparison reports changes by realized suffix in [summary.txt](summary.txt).
[trace-pairs.jsonl.gz](trace-pairs.jsonl.gz) contains the 912 changed pairs and
10 open-root controls. Each row preserves the public spelling, pronunciation,
pre-attachment spelling, final grapheme and ownership, and the assembled and
emitted morphology parts. The original PR packet remains at `archive/pr-521`.

## Reproduce

In a normal checkout with Node 24 and dependencies installed, extract this
archive directory somewhere outside the checkout. Set `audit_dir` to that
directory and `main_checkout` and `head_checkout` to checkouts of the two
revisions listed above. Run the following from the checkout with dependencies.

```sh
node --import tsx "$audit_dir/sample.mts" "$main_checkout" "$audit_dir/main.jsonl"
node --import tsx "$audit_dir/sample.mts" "$head_checkout" "$audit_dir/head.jsonl"
python3 "$audit_dir/compare.py" "$audit_dir/main.jsonl" "$audit_dir/head.jsonl" \
  --evidence "$audit_dir/trace-pairs.jsonl.gz"
```
