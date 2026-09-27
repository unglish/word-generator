# Q14b following-letter baseline

The immediate-control baseline passed production authentication and independent
accounting over 200,000 archived development words. This records the behavior
of the Q14a opt-in configuration, which itself failed acceptance; it does not
endorse that configuration or establish a Q14b improvement.

Independent recount: 2,018,618 events, 41,283,684 integer comparisons and 790
count groups. All source/runtime and archived-artifact closure checks passed.
The completion identity is
`3f737c634c652e31e754fc35e1e43366057adbd1a1f6c1660f6ed2565da627d1`.

| Profile | Initial soft units | Initially incompatible | Root incompatible | Corrected by root edits | Joint ownership at root |
| --- | ---: | ---: | ---: | ---: | ---: |
| lexicon-bare | 2,844 | 828 | 823 | 3 | 6 |
| lexicon-default | 2,129 | 646 | 636 | 10 | 4 |
| monosyllables-bare | 317 | 109 | 106 | 3 | 0 |
| text-default | 1,446 | 482 | 464 | 18 | 1 |
| All | 6,736 | 2,065 | 2,029 | 34 | 11 |

Units are phone-linked c/sc for /s/ and g for /dʒ/, not word counts. Of the
11 units becoming jointly owned, two were initially incompatible and nine
compatible. No compatible-to-incompatible transition occurs in these soft
cohorts in this sample. Joint ownership does not count as proven compatibility.
The result supports addressing initial selection, while testing preservation
through later edits. It does not prove that later edits can never introduce a
bad context in other inputs.

`summary.json` derives from the sealed report. `report.json.gz` decompresses to
the exact sealed `report.json`; its original digest is in `manifest.json` and
`complete.json`. `witnesses.json.gz` retains stratified trace witnesses.
The 20 observation shards remain at the external location recorded in the
manifest; their hashes are in `complete.json`. Full reruns need those shards
and the original word archive. This directory is a review bundle, not a
self-contained copy of the 200,000-word corpus.

`independent.json` records the full independent recount. Prior semantic
licenses remain authenticated by the production verifier. Producer refusal
text and diagnostic `eventCounts` are outside independent certification.
`run-independent.py` is the exact machine-specific wrapper used; its paths
are historical execution provenance. The portable underlying invocation is:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 evaluation/experiments/following-letter-conditions/recount_corpus.py \
  /path/to/word-archive /path/to/analysis \
  7593ad8e8e77e7428c3d07c00f6166fe09ff06c8533741eb1e1d6f1259e3735c \
  3f737c634c652e31e754fc35e1e43366057adbd1a1f6c1660f6ed2565da627d1
```

The original baseline lacks base-spelling ownership ledgers in all 200,000
words and has no grapheme-reading metadata in its archived configuration.
Its broad output metrics remain comparable through a common evaluator;
certified historical root-context and ownership transitions are unavailable.
Modern metadata must not be presented as historical evidence.

Final assembled morphology is outside root ownership certification. Human
reading agreement and overall linguistic quality are not established here.
No Q14b generation law, candidate capture, or promotion decision is registered
by this baseline bundle.
