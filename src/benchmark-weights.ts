/**
 * Micro-benchmark specifically for weighted option selection
 */

import getWeightedOption from "./utils/getWeightedOption.js";
import { precomputeWeights, getPrecomputedOption } from "./utils/precomputedWeights.js";
import { overrideRand } from "./utils/random.js";
import { createSeededRandom } from "./utils/createSeededRandom.js";

// Test data - typical weight distributions used in the library
const boolWeights: [boolean, number][] = [[true, 80], [false, 20]];
const syllableWeights: [number, number][] = [
  [1, 5000], [2, 30000], [3, 29700],
  [4, 3000], [5, 200], [6, 50], [7, 5]
];

// Pre-compute for optimized version
const precomputedBool = precomputeWeights(boolWeights);
const precomputedSyllable = precomputeWeights(syllableWeights);

function benchmark(name: string, fn: () => void, iterations: number = 1000000): void {
  // Use seeded random for consistency
  overrideRand(createSeededRandom(42));
  
  // Warm up
  for (let i = 0; i < 1000; i++) fn();
  
  // Reset seed
  overrideRand(createSeededRandom(42));
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  
  const totalMs = end - start;
  const opsPerSecond = Math.round(iterations / (totalMs / 1000));
  
  console.log(`${name}: ${totalMs.toFixed(2)}ms for ${iterations.toLocaleString()} ops (${opsPerSecond.toLocaleString()} ops/sec)`);
}

console.log("🔬 Weighted Option Selection Micro-benchmark\n");
console.log("=".repeat(60));
console.log("\n📊 Boolean weights [true:80, false:20]:\n");

benchmark("Original getWeightedOption", () => {
  getWeightedOption(boolWeights);
});

benchmark("Precomputed (binary search)", () => {
  getPrecomputedOption(precomputedBool);
});

console.log("\n📊 Syllable count weights (7 options):\n");

benchmark("Original getWeightedOption", () => {
  getWeightedOption(syllableWeights);
});

benchmark("Precomputed (binary search)", () => {
  getPrecomputedOption(precomputedSyllable);
});

console.log("\n" + "=".repeat(60));
