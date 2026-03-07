#!/usr/bin/env node

/**
 * Keep demo CMU baselines in sync with committed `data/cmu` baselines.
 *
 * Source:
 *   - data/cmu/cmu-lexicon-bigrams.json
 *   - data/cmu/cmu-lexicon-trigrams.json
 *   - data/cmu/cmu-lexicon-phonemes.json
 *   - data/cmu/phoneme-normalization.json
 *
 * Target:
 *   - demo/cmuBaselines.js (cmuBigrams + cmuTrigrams + cmuPhonemes + phonemeNormalization)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function normalizeToPercentMap(rawCounts) {
  const total = Object.values(rawCounts).reduce((a, b) => a + b, 0);
  const out = {};
  for (const [k, count] of Object.entries(rawCounts)) {
    const pct = (count / total) * 100;
    out[k] = Number(pct.toFixed(5));
  }
  return out;
}

function sortByValueDesc(obj) {
  return Object.fromEntries(
    Object.entries(obj).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
  );
}

function replaceConstSource(fileText, constName, replacementObjectLiteral) {
  const pattern = new RegExp(`const ${constName} = [\\s\\S]*?;\\n`);
  if (!pattern.test(fileText)) {
    throw new Error(`Could not find const declaration for ${constName} in demo/cmuBaselines.js`);
  }
  return fileText.replace(pattern, `const ${constName} = ${replacementObjectLiteral};\n`);
}

function upsertConstSource(fileText, constName, replacementObjectLiteral) {
  const pattern = new RegExp(`const ${constName} = [\\s\\S]*?;\\n`);
  if (pattern.test(fileText)) {
    return fileText.replace(pattern, `const ${constName} = ${replacementObjectLiteral};\n`);
  }
  return `${fileText.trimEnd()}\nconst ${constName} = ${replacementObjectLiteral};\n`;
}

function main() {
  const checkOnly = process.argv.includes("--check");

  const bigramsRaw = JSON.parse(readFileSync(join(process.cwd(), "data", "cmu", "cmu-lexicon-bigrams.json"), "utf8"));
  const trigramsRaw = JSON.parse(readFileSync(join(process.cwd(), "data", "cmu", "cmu-lexicon-trigrams.json"), "utf8"));
  const phonemesRaw = JSON.parse(readFileSync(join(process.cwd(), "data", "cmu", "cmu-lexicon-phonemes.json"), "utf8"));
  const phonemeNormalization = JSON.parse(readFileSync(join(process.cwd(), "data", "cmu", "phoneme-normalization.json"), "utf8"));
  const baselinesPath = join(process.cwd(), "demo", "cmuBaselines.js");

  const bigrams = sortByValueDesc(normalizeToPercentMap(bigramsRaw));
  const trigrams = sortByValueDesc(normalizeToPercentMap(trigramsRaw));
  const phonemes = sortByValueDesc(normalizeToPercentMap(phonemesRaw));

  const file = readFileSync(baselinesPath, "utf8");

  const next = upsertConstSource(
    replaceConstSource(
      replaceConstSource(
        replaceConstSource(file, "cmuBigrams", JSON.stringify(bigrams)),
        "cmuTrigrams",
        JSON.stringify(trigrams)
      ),
      "cmuPhonemes",
      JSON.stringify(phonemes)
    ),
    "phonemeNormalization",
    JSON.stringify(phonemeNormalization)
  );

  if (checkOnly) {
    const changed = file !== next;
    if (changed) {
      console.error("demo/cmuBaselines.js is out of sync with data/cmu baselines.");
      process.exit(1);
    }
    console.log("demo/cmuBaselines.js is in sync with data/cmu baselines.");
    return;
  }

  if (file === next) {
    console.log("No changes needed. demo/cmuBaselines.js already matches data/cmu baselines.");
    return;
  }

  writeFileSync(baselinesPath, next);
  console.log("Updated demo/cmuBaselines.js from data/cmu baselines.");
}

main();
