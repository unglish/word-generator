import { describe, it, expect } from 'vitest';
import { generateWords } from './generate.js';

/**
 * Tests for cluster-specific weighting feature.
 * 
 * Issue: /ns/ and /nz/ coda clusters were over-represented at ~5.5% vs ~1-2% in English.
 * Solution: Cluster-specific weights in config (n,s: 0.3, n,z: 0.3) reduce frequency by ~72%.
 */

describe('Cluster-Specific Weighting', () => {
  
  it('should apply cluster weight multipliers to reduce ns/nz frequency', () => {
    const SAMPLE_SIZE = 10_000;
    const words = generateWords(SAMPLE_SIZE, { mode: 'text' });
    
    let nsCount = 0;
    for (const word of words) {
      const text = word.written.clean.toLowerCase();
      if (text.includes('ns')) {
        nsCount++;
      }
    }
    
    const nsPercentage = (nsCount / SAMPLE_SIZE) * 100;
    
    // With cluster weighting, expect significant reduction from baseline ~5.5%
    // Target is ~2-3% range (45-55% reduction from baseline)
    expect(nsPercentage).toBeLessThan(4.0); // Should be well below old ~5.5%
    expect(nsPercentage).toBeGreaterThan(1.0); // Should still occur naturally
    
    console.log(`NS frequency: ${nsPercentage.toFixed(2)}% (${nsCount}/${SAMPLE_SIZE})`);
  });

  it('should generate expected ns/nz distribution in large sample', () => {
    const SAMPLE_SIZE = 200_000;
    const words = generateWords(SAMPLE_SIZE, { mode: 'text' });
    
    let nsCount = 0;
    let nzCount = 0;
    
    for (const word of words) {
      const text = word.written.clean.toLowerCase();
      // Count "ns" that's not part of "nse" (which is /nz/)
      if (text.match(/ns(?!e)/)) {
        nsCount++;
      }
      // "nse" at word end is typically /nz/
      if (text.match(/nse\b/)) {
        nzCount++;
      }
    }
    
    const totalNasalSibilant = nsCount + nzCount;
    const percentage = (totalNasalSibilant / SAMPLE_SIZE) * 100;
    
    // With cluster weighting, expect ~2-3.5% (down from baseline ~5.5%)
    // This represents a significant ~45-60% reduction
    expect(percentage).toBeGreaterThan(1.5);
    expect(percentage).toBeLessThan(3.5);
    
    console.log(`NS+NZ frequency: ${percentage.toFixed(2)}% (${totalNasalSibilant}/${SAMPLE_SIZE})`);
    console.log(`  NS: ${nsCount}, NZ: ${nzCount}`);
  }, { timeout: 120_000 }); // 2 minute timeout for large sample

  it('should respect cluster weights in phonological structure', () => {
    // Generate words and inspect their phonological structure
    const SAMPLE_SIZE = 5_000;
    const words = generateWords(SAMPLE_SIZE, { mode: 'text' });
    
    let nsPhonologicalCount = 0;
    let nzPhonologicalCount = 0;
    
    for (const word of words) {
      for (const syllable of word.syllables) {
        const codaSounds = syllable.coda.map(p => p.sound).join(',');
        if (codaSounds === 'n,s') {
          nsPhonologicalCount++;
        }
        if (codaSounds === 'n,z') {
          nzPhonologicalCount++;
        }
      }
    }
    
    const totalCount = nsPhonologicalCount + nzPhonologicalCount;
    const percentage = (totalCount / SAMPLE_SIZE) * 100;
    
    // At the phonological level, expect reduction to ~2-3.5% range
    expect(percentage).toBeLessThan(3.5);
    expect(percentage).toBeGreaterThan(1.0);
    
    console.log(`Phonological /ns/+/nz/ codas: ${percentage.toFixed(2)}% (${totalCount}/${SAMPLE_SIZE})`);
    console.log(`  /ns/: ${nsPhonologicalCount}, /nz/: ${nzPhonologicalCount}`);
  });

  it('should not affect other nasal+consonant clusters', () => {
    // Verify that only the specified clusters are affected
    const SAMPLE_SIZE = 10_000;
    const words = generateWords(SAMPLE_SIZE, { mode: 'text' });
    
    let ntCount = 0; // /nt/ should be unaffected
    let ndCount = 0; // /nd/ should be unaffected
    
    for (const word of words) {
      for (const syllable of word.syllables) {
        const codaSounds = syllable.coda.map(p => p.sound).join(',');
        if (codaSounds === 'n,t') ntCount++;
        if (codaSounds === 'n,d') ndCount++;
      }
    }
    
    // /nt/ and /nd/ are common in English and should appear frequently
    expect(ntCount + ndCount).toBeGreaterThan(100);
    
    console.log(`Control clusters - /nt/: ${ntCount}, /nd/: ${ndCount}`);
  });
});
