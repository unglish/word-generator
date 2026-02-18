#!/usr/bin/env node

/**
 * Build CMU lexicon phoneme baseline mapped to generator IPA symbols.
 *
 * Output:
 *   memory/cmu-lexicon-phonemes.json (raw counts)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadPhonemeNormalization, normalizeArpabetToIpa, sortByValueDesc } from './lib/phoneme-normalization.mjs';

function main() {
  const normalization = loadPhonemeNormalization();
  const cmuPath = join(process.cwd(), 'data', 'cmudict-0.7b.txt');
  const demoBaselinesPath = join(process.cwd(), 'demo', 'cmuBaselines.js');
  const outPath = join(process.cwd(), 'memory', 'cmu-lexicon-phonemes.json');

  const counts = {};
  const allowedIpa = new Set(Object.values(normalization.arpabetToIpa));

  if (existsSync(cmuPath)) {
    const lines = readFileSync(cmuPath, 'utf8').split('\n');
    let totalMapped = 0;
    let totalUnmapped = 0;

    for (const line of lines) {
      if (!line || line.startsWith(';;;')) continue;
      const match = line.match(/^([^\s]+)\s+(.+)$/);
      if (!match) continue;

      const word = match[1];
      if (!/^[A-Z0-9'().-]+$/.test(word)) continue;
      if (/\(\d+\)$/.test(word)) continue;

      const arpabetSeq = match[2].trim().split(/\s+/);
      for (const token of arpabetSeq) {
        const ipa = normalizeArpabetToIpa(token, normalization);
        if (!ipa) {
          totalUnmapped++;
          continue;
        }
        counts[ipa] = (counts[ipa] || 0) + 1;
        totalMapped++;
      }
    }

    writeFileSync(outPath, `${JSON.stringify(sortByValueDesc(counts), null, 2)}\n`);

    const unmappedPct = totalMapped + totalUnmapped > 0
      ? (totalUnmapped / (totalMapped + totalUnmapped)) * 100
      : 0;

    console.log(`Wrote ${outPath}`);
    console.log(`Mapped tokens: ${totalMapped.toLocaleString()}`);
    console.log(`Unmapped tokens: ${totalUnmapped.toLocaleString()} (${unmappedPct.toFixed(4)}%)`);
    return;
  }

  const demoFile = readFileSync(demoBaselinesPath, 'utf8');
  const match = demoFile.match(/const cmuPhonemes = (\{[\s\S]*?\});/);
  if (!match) {
    throw new Error('Could not extract cmuPhonemes from demo/cmuBaselines.js');
  }
  const demoMap = JSON.parse(match[1]);
  for (const [phoneme, pct] of Object.entries(demoMap)) {
    if (!allowedIpa.has(phoneme)) continue;
    counts[phoneme] = Number(pct);
  }

  writeFileSync(outPath, `${JSON.stringify(sortByValueDesc(counts), null, 2)}\n`);
  console.log(`Wrote ${outPath} from demo fallback (data/cmudict-0.7b.txt not found).`);
}

main();
