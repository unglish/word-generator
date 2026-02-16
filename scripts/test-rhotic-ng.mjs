#!/usr/bin/env node
/**
 * Test script to verify rhotic vowel + /ŋ/ constraint is properly enforced.
 * Generates 50k words and checks for /ɚŋ/ or /ɝŋ/ patterns.
 */

import { createGenerator } from "../dist/index.js";
import { englishConfig } from "../dist/config/english.js";

const generator = createGenerator(englishConfig);
const sampleSize = 50_000;
const rngInstances = [];

console.log(`Generating ${sampleSize.toLocaleString()} words...`);

for (let i = 0; i < sampleSize; i++) {
  const word = generator.generateWord();
  const written = word.written?.clean || "";
  const ipa = word.pronunciation || "";
  
  // Check for "rng" in written form
  if (written.toLowerCase().includes("rng")) {
    rngInstances.push({
      word: written,
      written: written,
      ipa: ipa,
    });
  }
  
  // Check for rhotic vowel + /ŋ/ in IPA
  if (/(ɚ|ɝ)ŋ/.test(ipa)) {
    rngInstances.push({
      word: written,
      written: written,
      ipa: ipa,
    });
  }
  
  if ((i + 1) % 10000 === 0) {
    console.log(`  ${(i + 1).toLocaleString()} words generated...`);
  }
}

console.log(`\n✓ Generated ${sampleSize.toLocaleString()} words`);
console.log(`\n--- Results ---`);
console.log(`Instances with /ɚŋ/ or /ɝŋ/: ${rngInstances.length}`);

if (rngInstances.length > 0) {
  console.log(`\n⚠️  Found ${rngInstances.length} violations:`);
  for (const instance of rngInstances.slice(0, 20)) {
    console.log(`  ${instance.word} → ${instance.ipa}`);
  }
  if (rngInstances.length > 20) {
    console.log(`  ... and ${rngInstances.length - 20} more`);
  }
  process.exit(1);
} else {
  console.log(`✓ No instances of /ɚŋ/ or /ɝŋ/ found!`);
  console.log(`✓ Prevention-based constraint is working correctly.`);
  process.exit(0);
}
