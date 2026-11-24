# Comparing batches of spellings with Lingua

Lingua answers which of its language models fits a given spelling best. Use its scores to find groups of generated words worth inspecting. Reader judgments remain the measure of perceived written wordlikeness. This is a proposed offline evaluation workflow.

## Set up the scorer

Use the native Rust crate with all 75 language features enabled. The pilot used `lingua = "=1.8.0"` with its default features and accuracy, and language models at 1.3.0. Keep the Cargo lockfile with the experiment so both sets use the same models. English-only mode returns a binary result and cannot provide the graded ranking needed here. [Lingua Rust documentation](https://github.com/pemistahl/lingua-rs)

Build a release executable around this scoring loop. Feed it one lowercase spelling per line. Each output row contains the spelling, first-ranked language, its confidence, the one-based English rank, and English confidence.

```rust
use lingua::{Language, LanguageDetectorBuilder};
use std::io::{self, BufRead};

fn main() -> io::Result<()> {
    let detector = LanguageDetectorBuilder::from_all_languages().build();
    for line in io::stdin().lock().lines() {
        let word = line?;
        let scores = detector.compute_language_confidence_values(&word);
        let rank = scores.iter().position(|(l, _)| *l == Language::English)
            .expect("English model must be enabled");
        let (winner, confidence) = scores[0];
        println!("{word}\t{winner:?}\t{confidence}\t{}\t{}", rank + 1, scores[rank].1);
    }
    Ok(())
}
```

## Compare like with like

1. Score the lowercase **surface spellings** in the pinned CMUdict and SCOWL ordinary English/American intersection through SCOWL size 60. Give each spelling one vote, including inflected words and ordinary words that also occur as names. Count syllables from the selected CMU pronunciation. Save the scores once per reference and detector version. [Reference population](cmu-root-reference.md#population-and-exclusions)
2. Use the public `generateWords` API across multiple seeds, retaining seed, draw index, spelling and syllable count. Record the generator commit, mode and morphology settings. For regression comparisons, run both generator versions on the same seeds. Keep repeat draws for the primary result and check the effect of counting each spelling once.
3. Compare the share of words assigned to each first-choice language, the distribution of English ranks and the distribution of English confidence. To control for word shape, compare each draw with reference words of exactly the same letter length and syllable count. Count ties at half weight and calculate the percentile as `100 × (lower + 0.5 × tied) / peers`.
4. Report the median matched percentile, share below the 10th percentile, and variation across seeds. Use eligible draws as the denominator and report how many lacked peers. Repeat with a minimum peer count, such as 30, to check sensitivity to sparse groups. For comparisons of winning languages, weight each dictionary group to the share it has in the generated sample. Label raw and matched results separately.

## Interpret a shift

A familiar spelling can fit several languages. Short words and endings common to several languages often place below first for English. Compare an unusual group with dictionary words of the same shape, including the ending when enough examples exist. A frequent classifier label is a lead for inspecting the written forms. It gives no evidence about their origin or their intended pronunciation.

For example, a `ts` sequence may span a root and plural ending or two syllables within a bare root. Replay the seed and draw with `trace: true` and inspect the spelling units, syllables, repairs and emitted affix parts before attributing the pattern to a generator rule. Check a proposed change on fresh batches and with blinded readers. Use its confidence to prioritize those comparisons. [Trace diagnostics](word-trace-diagnostics.md) · [Written review](human-review.md)
