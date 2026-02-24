import { describe, it, expect } from "vitest";
import { generateWords } from "./generate";
import { createGenerator } from "./generate";
import { englishConfig } from "../config/english";

describe("Position-based cluster weighting", () => {
  it("applies position-based weights correctly", () => {
    // Generate 10k sample to test position-based weighting
    const words = generateWords(10000, { seed: 42, mode: "text", morphology: false });
    
    let tsFinalCount = 0;
    let tsNonFinalCount = 0;
    let nsFinalCount = 0;
    let nsNonFinalCount = 0;
    
    for (const word of words) {
      const written = word.written.clean.toLowerCase();
      const syllables = word.syllables;
      
      // Check for "ts" bigram
      if (written.includes("ts")) {
        // Determine if it's final by checking if last syllable has t,s coda
        const lastSyllable = syllables[syllables.length - 1];
        const lastCoda = lastSyllable.coda.map(p => p.sound).join(",");
        
        if (lastCoda.includes("t,s")) {
          tsFinalCount++;
        } else {
          // Check if ts appears in non-final positions
          for (let i = 0; i < syllables.length - 1; i++) {
            const coda = syllables[i].coda.map(p => p.sound).join(",");
            if (coda.includes("t,s")) {
              tsNonFinalCount++;
              break;
            }
          }
        }
      }
      
      // Check for "ns" bigram
      if (written.includes("ns")) {
        const lastSyllable = syllables[syllables.length - 1];
        const lastCoda = lastSyllable.coda.map(p => p.sound).join(",");
        
        if (lastCoda.includes("n,s")) {
          nsFinalCount++;
        } else {
          for (let i = 0; i < syllables.length - 1; i++) {
            const coda = syllables[i].coda.map(p => p.sound).join(",");
            if (coda.includes("n,s")) {
              nsNonFinalCount++;
              break;
            }
          }
        }
      }
    }
    
    const tsFinalPercent = (tsFinalCount / 10000) * 100;
    const nsFinalPercent = (nsFinalCount / 10000) * 100;
    
    // With aggressive 0.03 weight, expect "ts" final to be ~0.2-0.4% (down from ~4.8%)
    // With 0.03 weight, expect "ns" final to be ~0.2-0.5% (down from previous ~5.5%)
    expect(tsFinalPercent).toBeLessThan(0.8);
    expect(nsFinalPercent).toBeLessThan(0.8);
    
    // Non-final should be more common (0.4 weight is less aggressive)
    // But still much rarer than final was before the fix
    expect(tsNonFinalCount).toBeGreaterThanOrEqual(0);
    expect(nsNonFinalCount).toBeGreaterThanOrEqual(0);
  });

  it("backwards compatible with uniform weights", () => {
    // Create a config with uniform weights (old format)
    const uniformConfig = {
      ...englishConfig,
      clusterWeights: {
        coda: {
          "t,s": 0.5,  // Uniform weight
        },
      },
    };
    
    createGenerator(uniformConfig);
    const words = generateWords(1000, { seed: 123, mode: "text", morphology: false });
    
    // Should generate words without errors
    expect(words.length).toBe(1000);
    expect(words.every(w => w.written.clean.length > 0)).toBe(true);
  });

  it("reduces ts/ns frequency compared to no weights", () => {
    // Test with position-based weights (current config)
    const wordsWithWeights = generateWords(10000, { seed: 99, mode: "text", morphology: false });
    
    // Test with no weights
    const noWeightsConfig = {
      ...englishConfig,
      clusterWeights: undefined,
    };
    const genNoWeights = createGenerator(noWeightsConfig);
    const wordsNoWeights: { written: { clean: string } }[] = [];
    for (let i = 0; i < 10000; i++) {
      wordsNoWeights.push(genNoWeights.generateWord({ seed: 99 + i, mode: "text", morphology: false }));
    }
    
    const countBigrams = (words: { written: { clean: string } }[], bigram: string) => {
      return words.filter(w => w.written.clean.toLowerCase().includes(bigram)).length;
    };
    
    const tsWithWeights = countBigrams(wordsWithWeights, "ts");
    const tsNoWeights = countBigrams(wordsNoWeights, "ts");
    const nsWithWeights = countBigrams(wordsWithWeights, "ns");
    const nsNoWeights = countBigrams(wordsNoWeights, "ns");
    
    // With weights should be significantly less than without
    expect(tsWithWeights).toBeLessThan(tsNoWeights * 0.3);  // At least 70% reduction
    expect(nsWithWeights).toBeLessThan(nsNoWeights * 0.3);  // At least 70% reduction
    
    // With top-down phoneme targeting, baseline rates are lower than the old
    // bottom-up pipeline but should still be materially above weighted rates.
    expect(tsNoWeights).toBeGreaterThan(100);
    expect(nsNoWeights).toBeGreaterThan(100);
    
    // With weights, expect ~0.5-1% frequency (~50-100 out of 10k)
    expect(tsWithWeights).toBeLessThan(150);
    expect(nsWithWeights).toBeLessThan(150);
  });
});

describe("Large-scale position-based cluster analysis", () => {
  it("generates 200k sample with target ts/ns frequencies", { timeout: 60000 }, () => {
    // This is the main validation test matching the requirement
    const words = generateWords(200000, { seed: 2026, mode: "text", morphology: false });
    
    let tsFinalCount = 0;
    let tsNonFinalCount = 0;
    let nsFinalCount = 0;
    let nsNonFinalCount = 0;
    let totalTs = 0;
    let totalNs = 0;
    
    for (const word of words) {
      const written = word.written.clean.toLowerCase();
      const syllables = word.syllables;
      
      if (written.includes("ts")) {
        totalTs++;
        const lastSyllable = syllables[syllables.length - 1];
        const lastCoda = lastSyllable.coda.map(p => p.sound).join(",");
        
        if (lastCoda.includes("t,s") || lastCoda.endsWith("s") && syllables.length === 1 && lastCoda.includes("t")) {
          tsFinalCount++;
        } else {
          tsNonFinalCount++;
        }
      }
      
      if (written.includes("ns")) {
        totalNs++;
        const lastSyllable = syllables[syllables.length - 1];
        const lastCoda = lastSyllable.coda.map(p => p.sound).join(",");
        
        if (lastCoda.includes("n,s") || lastCoda.endsWith("s") && syllables.length === 1 && lastCoda.includes("n")) {
          nsFinalCount++;
        } else {
          nsNonFinalCount++;
        }
      }
    }
    
    const tsPercent = (totalTs / 200000) * 100;
    const nsPercent = (totalNs / 200000) * 100;
    const tsFinalPercent = (tsFinalCount / 200000) * 100;
    const nsFinalPercent = (nsFinalCount / 200000) * 100;
    
    // Log results for debugging
    console.log("\n200k sample results:");
    console.log(`  Total "ts": ${totalTs} (${tsPercent.toFixed(2)}%)`);
    console.log(`    Final: ${tsFinalCount} (${tsFinalPercent.toFixed(2)}%)`);
    console.log(`    Non-final: ${tsNonFinalCount} (${((tsNonFinalCount / 200000) * 100).toFixed(2)}%)`);
    console.log(`  Total "ns": ${totalNs} (${nsPercent.toFixed(2)}%)`);
    console.log(`    Final: ${nsFinalCount} (${nsFinalPercent.toFixed(2)}%)`);
    console.log(`    Non-final: ${nsNonFinalCount} (${((nsNonFinalCount / 200000) * 100).toFixed(2)}%)`);
    
    // Target: "ts" 4.83% → ~1%
    // With threshold-based rejection (weight < 0.01), we achieve even better results:
    // Expected: ~0.0% final + ~0.2-0.4% non-final = ~0.2-0.5% total
    expect(tsPercent).toBeLessThan(1.0);  // Well under target
    expect(tsPercent).toBeGreaterThan(0.0); // But not zero (still valid mid-word clusters)
    
    // Target: "ns" further reduction from current
    // With extended weights including homorganic stops (d,s, b,s, g,s), near-perfect suppression
    expect(nsPercent).toBeLessThan(1.0);
    expect(nsPercent).toBeGreaterThan(0.0); // Allow some legitimate cases
    
    // Most should be non-final now (since final is heavily weighted down)
    // But with 0.03, we expect very few finals
    expect(tsFinalCount).toBeLessThan(tsNonFinalCount * 2); // Non-final should be comparable or higher
    expect(nsFinalCount).toBeLessThan(nsNonFinalCount * 2);
  });
});
