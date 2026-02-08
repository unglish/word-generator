/**
 * Phonotactic scoring module.
 *
 * Generates words, converts to ARPABET, runs them through the UCI
 * Phonotactic Calculator, and parses the resulting scores.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { generateWord } from '../core/generate.js';
import { wordToArpabet } from './ipa-to-arpabet.js';
import { Word } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** The specific UCI column we use for scoring (bigram, smoothed, conditional). */
export const SCORE_COLUMN = 'ngram_n2_pos_none_bound_both_smooth_laplace_weight_none_prob_conditional_agg_prod';

export interface ScoredWord {
  arpabet: string;
  score: number;
  neighbourhood: number;
}

export interface BatchScoreResult {
  words: ScoredWord[];
  mean: number;
  min: number;
  median: number;
}

/**
 * Resolve the path to the UCI Phonotactic Calculator binary.
 * Priority: env var → which → repo .venv fallback.
 */
function getCalculatorPath(): string {
  if (process.env.PHONOTACTIC_CALCULATOR_PATH) return process.env.PHONOTACTIC_CALCULATOR_PATH;

  // Try system PATH first (works in CI with pip install)
  try {
    const resolved = execSync('which uci-phonotactic-calculator', { encoding: 'utf-8' }).trim();
    if (resolved) return resolved;
  } catch { /* not on PATH */ }

  // Fallback to repo .venv
  const repoRoot = join(__dirname, '..', '..');
  return join(repoRoot, '.venv', 'bin', 'uci-phonotactic-calculator');
}

/**
 * Resolve the path to the English corpus CSV.
 * Priority: env var → python introspection → repo .venv glob fallback.
 */
function getCorpusPath(): string {
  if (process.env.PHONOTACTIC_CORPUS_PATH) return process.env.PHONOTACTIC_CORPUS_PATH;

  // Ask Python where the package lives (version-agnostic)
  try {
    const cmd = 'python3 -c "import uci_phonotactic_calculator, os; print(os.path.dirname(uci_phonotactic_calculator.__file__))"';
    const pkgDir = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (pkgDir) return join(pkgDir, 'data', 'english.csv');
  } catch { /* python introspection failed */ }

  // Last resort: hardcoded .venv path
  const repoRoot = join(__dirname, '..', '..');
  return join(repoRoot, '.venv', 'lib', 'python3.12', 'site-packages', 'uci_phonotactic_calculator', 'data', 'english.csv');
}

/**
 * Score a list of ARPABET transcriptions using the UCI Phonotactic Calculator.
 */
export function scoreArpabetWords(arpabetWords: string[]): ScoredWord[] {
  const tmp = mkdtempSync(join(tmpdir(), 'phonotactic-'));
  const inputPath = join(tmp, 'input.csv');
  const outputPath = join(tmp, 'output.csv');

  try {
    writeFileSync(inputPath, arpabetWords.join('\n') + '\n');

    const calculator = getCalculatorPath();
    const corpus = getCorpusPath();
    const cmd = `"${calculator}" "${corpus}" "${inputPath}" "${outputPath}"`;
    execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], timeout: 60_000 });

    const csvContent = readFileSync(outputPath, 'utf-8');
    return parseScores(csvContent);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function parseScores(csv: string): ScoredWord[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const scoreIdx = headers.indexOf(SCORE_COLUMN);
  const neighbourhoodIdx = headers.indexOf('neighbourhood_full');
  const wordIdx = headers.indexOf('word');

  if (scoreIdx === -1) {
    throw new Error(`Score column "${SCORE_COLUMN}" not found in output. Available: ${headers.join(', ')}`);
  }

  return lines.slice(1).map(line => {
    const cols = line.split(',');
    return {
      arpabet: cols[wordIdx] || '',
      score: parseFloat(cols[scoreIdx]) || 0,
      neighbourhood: parseFloat(cols[neighbourhoodIdx]) || 0,
    };
  });
}

/**
 * Generate N words and score them phonotactically.
 */
export function generateAndScore(count: number = 100, seed?: number): BatchScoreResult {
  const words: Word[] = [];
  const arpabetWords: string[] = [];

  for (let i = 0; i < count; i++) {
    const word = generateWord({ seed: seed !== undefined ? seed + i : undefined });
    const arpabet = wordToArpabet(word);
    if (arpabet.trim()) {
      words.push(word);
      arpabetWords.push(arpabet);
    }
  }

  const scored = scoreArpabetWords(arpabetWords);
  const scores = scored.map(s => s.score).filter(s => !isNaN(s) && isFinite(s));
  scores.sort((a, b) => a - b);

  return {
    words: scored,
    mean: scores.reduce((a, b) => a + b, 0) / scores.length,
    min: scores[0] ?? 0,
    median: scores[Math.floor(scores.length / 2)] ?? 0,
  };
}

/**
 * Score a list of real English words (in ARPABET) for baseline comparison.
 */
export function scoreEnglishBaseline(): BatchScoreResult {
  // Common English words in ARPABET
  const englishWords = [
    'K AE T',       // cat
    'D AO G',       // dog
    'HH AW S',      // house
    'W ER D',       // word
    'B UH K',       // book
    'L AY T',       // light
    'S T R IY T',   // street
    'G R IY N',     // green
    'F L AW ER',    // flower
    'M AH DH ER',   // mother
    'W AO T ER',    // water
    'CH IH L D',    // child
    'P L EY',       // play
    'S K UW L',     // school
    'HH AE P IY',   // happy
    'R AH N IH NG', // running
    'B IH G',       // big
    'S M AO L',     // small
    'F R EH N D',   // friend
    'T AY M',       // time
  ];

  const scored = scoreArpabetWords(englishWords);
  const scores = scored.map(s => s.score).filter(s => !isNaN(s) && isFinite(s));
  scores.sort((a, b) => a - b);

  return {
    words: scored,
    mean: scores.reduce((a, b) => a + b, 0) / scores.length,
    min: scores[0] ?? 0,
    median: scores[Math.floor(scores.length / 2)] ?? 0,
  };
}
