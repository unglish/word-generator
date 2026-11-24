# Ordinary English spelling reference

Use this corpus for written n-grams, including distribution targets, smoothed spelling scores and KenLM character models. Each of the 45,904 lowercase surface spellings has equal weight. The list is the intersection of the pinned CMUdict population with the ordinary English and American SCOWL lists through size 60. Inflected forms and established loanwords qualify on the same terms as other spellings. [Selection policy and source pins](../../../docs/cmu-root-reference.md#population-and-exclusions)

Rebuild from the two pinned source files with Python 3:

```sh
python3 -B evaluation/corpus/build-ordinary-spellings.py --source "$CMU_SOURCE" --scowl "$SCOWL_TAR"
```

The spelling list has SHA-256 `9b61f2af444a2177d3cac89464d81e39970ef65a0fab54b3a18465a5dc6c5f3b`. The three JSON tables count every overlapping within-word occurrence without boundary markers. The review scorer uses the same spellings and adds its own start and end markers.

For KenLM, train the five-gram model on one word per line with spaces between letters. This lets the estimator learn contexts of one through five letters and handle word boundaries. From the repository root, with KenLM's executables on PATH:

```sh
awk '{ gsub(/./, "& "); sub(/ $/, ""); print }' data/cmu/ordinary/spellings.txt |
  lmplz -o 5 -S 128M --discount_fallback > ordinary-5.arpa
```

To score a spelling, pass its space-separated letters to `query -v sentence ordinary-5.arpa` with default boundaries and divide its total log10 score by the number of letters plus one. The reference is type-weighted. Use explicitly labeled Norvig token analyses for questions about frequency in running text. The full-CMU tables remain available to reproduce historical evaluations.
