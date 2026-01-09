/**
 * Benchmark for word generation performance
 * Run with: npx tsx src/benchmark.ts
 */

import { generateWord } from "./core/generate.js";
import { createSeededRandom } from "./utils/createSeededRandom.js";
import { overrideRand, resetRand } from "./utils/random.js";

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  wordsPerSecond: number;
}

function benchmark(
  name: string,
  fn: () => void,
  iterations: number = 10000
): BenchmarkResult {
  // Warm up
  for (let i = 0; i < 100; i++) {
    fn();
  }

  // Actual benchmark
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();

  const totalMs = end - start;
  const avgMs = totalMs / iterations;
  const wordsPerSecond = Math.round(1000 / avgMs);

  return {
    name,
    iterations,
    totalMs: Math.round(totalMs * 100) / 100,
    avgMs: Math.round(avgMs * 1000) / 1000,
    wordsPerSecond,
  };
}

function runBenchmarks(): void {
  console.log("🚀 Word Generator Performance Benchmark\n");
  console.log("=".repeat(60));

  const results: BenchmarkResult[] = [];

  // Benchmark 1: Random word generation (default)
  results.push(
    benchmark("Random words (default)", () => {
      generateWord();
    })
  );

  // Benchmark 2: Seeded word generation
  results.push(
    benchmark("Seeded words", () => {
      generateWord({ seed: 12345 });
    })
  );

  // Benchmark 3: Single syllable words
  results.push(
    benchmark("1-syllable words", () => {
      generateWord({ syllableCount: 1 });
    })
  );

  // Benchmark 4: Multi-syllable words
  results.push(
    benchmark("3-syllable words", () => {
      generateWord({ syllableCount: 3 });
    })
  );

  // Benchmark 5: Long words
  results.push(
    benchmark("5-syllable words", () => {
      generateWord({ syllableCount: 5 });
    })
  );

  // Benchmark 6: Batch generation with same seed
  overrideRand(createSeededRandom(42));
  results.push(
    benchmark("Batch (pre-seeded RNG)", () => {
      generateWord();
    })
  );
  resetRand();

  // Print results
  console.log("\n📊 Results:\n");
  console.log(
    "| Test | Iterations | Total (ms) | Avg (ms) | Words/sec |"
  );
  console.log("|------|------------|------------|----------|-----------|");

  for (const r of results) {
    console.log(
      `| ${r.name.padEnd(24)} | ${r.iterations.toString().padStart(10)} | ${r.totalMs.toString().padStart(10)} | ${r.avgMs.toString().padStart(8)} | ${r.wordsPerSecond.toString().padStart(9)} |`
    );
  }

  console.log("\n" + "=".repeat(60));

  // Summary statistics
  const defaultResult = results[0];
  console.log(`\n📈 Summary:`);
  console.log(`   Default generation: ${defaultResult.wordsPerSecond.toLocaleString()} words/second`);
  console.log(`   Average time per word: ${defaultResult.avgMs}ms`);
}

// Run if executed directly
runBenchmarks();

export { benchmark, runBenchmarks };
