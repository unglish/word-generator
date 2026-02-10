/**
 * Pure TypeScript phonotactic scoring module.
 *
 * Scores ARPABET phoneme sequences using bigram conditional log-probabilities
 * with Laplace smoothing, derived from CMU Pronouncing Dictionary frequencies.
 */
import { ARPABET_BIGRAM_COUNTS, ARPABET_TOTAL_COUNTS, ALL_ARPABET_PHONEMES } from './arpabet-bigrams.js';
/**
 * Compute mean, min, and median from an array of numbers.
 */
function computeStats(values) {
    if (values.length === 0)
        return { mean: 0, min: 0, median: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    return {
        mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
        min: sorted[0],
        median: sorted[Math.floor(sorted.length / 2)],
    };
}
/**
 * Conditional log₂-probability of a phoneme bigram with Laplace smoothing.
 *
 *   P(second | first) = (count(first→second) + 1) / (count(first→*) + V)
 */
function bigramLogProb(first, second) {
    const counts = ARPABET_BIGRAM_COUNTS[first] || {};
    const vocabSize = ALL_ARPABET_PHONEMES.size;
    return Math.log2(((counts[second] || 0) + 1) / ((ARPABET_TOTAL_COUNTS[first] || 0) + vocabSize));
}
/**
 * Parse an ARPABET string into phoneme tokens, with word-boundary markers.
 * Returns ['#', ...phonemes, '#'], or null if the input is empty.
 */
function parseArpabet(arpabet) {
    const phonemes = arpabet.trim().split(/\s+/);
    if (phonemes.length === 0 || !phonemes[0])
        return null;
    return ['#', ...phonemes, '#'];
}
/**
 * Score a batch of ARPABET transcriptions and return per-word scores plus aggregate stats.
 */
export function scoreArpabetWords(arpabetWords) {
    const words = arpabetWords.map(arpabet => {
        const seq = parseArpabet(arpabet);
        if (!seq)
            return { arpabet, score: -Infinity, perBigram: -Infinity };
        let score = 0;
        for (let i = 1; i < seq.length; i++) {
            score += bigramLogProb(seq[i - 1], seq[i]);
        }
        const bigramCount = seq.length - 1;
        return { arpabet, score, perBigram: score / bigramCount };
    });
    const finite = (v) => isFinite(v) && !isNaN(v);
    return {
        words,
        total: computeStats(words.map(w => w.score).filter(finite)),
        perBigram: computeStats(words.map(w => w.perBigram).filter(finite)),
    };
}
