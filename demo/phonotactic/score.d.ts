/**
 * Pure TypeScript phonotactic scoring module.
 *
 * Scores ARPABET phoneme sequences using bigram conditional log-probabilities
 * with Laplace smoothing, derived from CMU Pronouncing Dictionary frequencies.
 */
export interface ScoredWord {
    arpabet: string;
    score: number;
    perBigram: number;
}
export interface ScoreStats {
    mean: number;
    min: number;
    median: number;
}
export interface BatchScoreResult {
    words: ScoredWord[];
    total: ScoreStats;
    perBigram: ScoreStats;
}
/**
 * Score a batch of ARPABET transcriptions and return per-word scores plus aggregate stats.
 */
export declare function scoreArpabetWords(arpabetWords: string[]): BatchScoreResult;
//# sourceMappingURL=score.d.ts.map