#!/usr/bin/env tsx

/**
 * Generate real ARPABET bigram frequency table from CMU Pronouncing Dictionary.
 * 
 * Downloads CMU dict, parses ARPABET pronunciations, counts bigrams (including word boundaries),
 * and outputs a TypeScript file to replace the hand-waved bigrams.
 */

import fs from 'fs';
import path from 'path';

interface BigramCounts {
  [firstPhoneme: string]: {
    [secondPhoneme: string]: number;
  };
}

/**
 * Clean ARPABET phoneme by removing stress digits from vowels
 */
function cleanPhoneme(phoneme: string): string {
  return phoneme.replace(/[0-9]/g, '');
}

/**
 * Download and parse CMU Pronouncing Dictionary
 */
async function downloadCMUDict(): Promise<string[]> {
  const cmuUrl = 'http://svn.code.sf.net/p/cmusphinx/code/trunk/cmudict/cmudict-0.7b';
  
  console.log(`🔄 Downloading CMU Pronouncing Dictionary from ${cmuUrl}...`);
  
  try {
    const response = await fetch(cmuUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    const lines = text.split('\n');
    
    console.log(`✅ Downloaded ${lines.length} lines from CMU dictionary`);
    return lines;
  } catch (error) {
    console.error(`❌ Failed to download CMU dictionary: ${error}`);
    process.exit(1);
  }
}

/**
 * Parse CMU dictionary lines and extract ARPABET pronunciations
 */
function parseCMUDict(lines: string[]): string[] {
  const pronunciations: string[] = [];
  let validLines = 0;
  let skippedLines = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (trimmed.startsWith(';;;') || trimmed === '') {
      skippedLines++;
      continue;
    }
    
    // Parse dictionary entry: WORD  P H O N E M E S
    const match = trimmed.match(/^([A-Z']+)(\([0-9]+\))?\s+(.+)$/);
    if (!match) {
      skippedLines++;
      continue;
    }
    
    const [, word, variant, phonemes] = match;
    
    // Clean phonemes: remove stress digits and normalize
    const cleanedPhonemes = phonemes
      .split(/\s+/)
      .map(cleanPhoneme)
      .filter(p => p.length > 0);
    
    if (cleanedPhonemes.length > 0) {
      pronunciations.push(cleanedPhonemes.join(' '));
      validLines++;
    }
  }
  
  console.log(`📊 Processed CMU dictionary: ${validLines} valid entries, ${skippedLines} skipped`);
  return pronunciations;
}

/**
 * Count bigrams from pronunciation data
 */
function countBigrams(pronunciations: string[]): BigramCounts {
  const counts: BigramCounts = {};
  let totalBigrams = 0;
  
  for (const pronunciation of pronunciations) {
    const phonemes = pronunciation.split(' ');
    
    // Add word boundaries
    const phonemesWithBoundaries = ['#', ...phonemes, '#'];
    
    // Count all bigrams
    for (let i = 0; i < phonemesWithBoundaries.length - 1; i++) {
      const first = phonemesWithBoundaries[i];
      const second = phonemesWithBoundaries[i + 1];
      
      if (!counts[first]) {
        counts[first] = {};
      }
      
      if (!counts[first][second]) {
        counts[first][second] = 0;
      }
      
      counts[first][second]++;
      totalBigrams++;
    }
  }
  
  console.log(`🔢 Counted ${totalBigrams} bigrams from ${pronunciations.length} pronunciations`);
  
  // Log some stats
  const firstPhonemes = Object.keys(counts).length;
  const uniqueBigrams = Object.values(counts)
    .map(secondPhonemes => Object.keys(secondPhonemes).length)
    .reduce((sum, count) => sum + count, 0);
  
  console.log(`📈 Statistics: ${firstPhonemes} first phonemes, ${uniqueBigrams} unique bigrams`);
  
  return counts;
}

/**
 * Get all unique phonemes that appear in the data
 */
function getAllPhonemes(counts: BigramCounts): Set<string> {
  const phonemes = new Set<string>();
  
  // Add all first phonemes
  for (const first of Object.keys(counts)) {
    phonemes.add(first);
  }
  
  // Add all second phonemes
  for (const secondPhonemes of Object.values(counts)) {
    for (const second of Object.keys(secondPhonemes)) {
      phonemes.add(second);
    }
  }
  
  return phonemes;
}

/**
 * Generate TypeScript file content
 */
function generateTypeScriptFile(counts: BigramCounts): string {
  const allPhonemes = getAllPhonemes(counts);
  
  // Calculate total counts for each starting phoneme
  const totalCounts: { [phoneme: string]: number } = {};
  for (const [first, secondPhonemes] of Object.entries(counts)) {
    totalCounts[first] = Object.values(secondPhonemes).reduce((sum, count) => sum + count, 0);
  }
  
  // Sort phonemes for consistent output
  const sortedFirstPhonemes = Object.keys(counts).sort();
  
  let content = `/**
 * ARPABET bigram frequencies derived from CMU Pronouncing Dictionary.
 * 
 * Generated on ${new Date().toISOString()} from ${Object.values(counts).map(s => Object.values(s).reduce((a,b) => a+b, 0)).reduce((a,b) => a+b, 0)} bigrams
 * across ${Object.values(totalCounts).length} starting phonemes.
 * 
 * Data includes word boundary markers (#) and is used for phonotactic scoring
 * with conditional probabilities and Laplace smoothing.
 */

export const ARPABET_BIGRAM_COUNTS: Record<string, Record<string, number>> = {\n`;

  for (const first of sortedFirstPhonemes) {
    const secondPhonemes = counts[first];
    const sortedSecondPhonemes = Object.keys(secondPhonemes).sort();
    
    content += `  '${first}': {\n`;
    
    // Group similar phonemes for readability
    const groups: { [key: string]: Array<[string, number]> } = {
      boundaries: [],
      consonants: [],
      vowels: [],
      other: []
    };
    
    for (const second of sortedSecondPhonemes) {
      const count = secondPhonemes[second];
      const entry: [string, number] = [second, count];
      
      if (second === '#') {
        groups.boundaries.push(entry);
      } else if (['P', 'T', 'K', 'B', 'D', 'G', 'F', 'TH', 'S', 'SH', 'HH', 'V', 'DH', 'Z', 'ZH', 'M', 'N', 'NG', 'L', 'R', 'W', 'Y', 'CH', 'JH'].includes(second)) {
        groups.consonants.push(entry);
      } else if (['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'].includes(second)) {
        groups.vowels.push(entry);
      } else {
        groups.other.push(entry);
      }
    }
    
    // Output groups with comments
    for (const [groupName, entries] of Object.entries(groups)) {
      if (entries.length === 0) continue;
      
      if (groupName !== 'other') {
        content += `    // ${groupName}\n`;
      }
      
      // Format entries nicely, max 80 chars per line
      let currentLine = '    ';
      for (let i = 0; i < entries.length; i++) {
        const [phoneme, count] = entries[i];
        const entry = `'${phoneme}': ${count}`;
        const isLast = i === entries.length - 1;
        
        if ((currentLine + entry + (isLast ? '' : ', ')).length > 80 && currentLine !== '    ') {
          // End current line with comma and start new line
          content += currentLine.replace(/,\s*$/, '') + ',\n';
          currentLine = '    ' + entry + (isLast ? '' : ', ');
        } else {
          currentLine += entry + (isLast ? '' : ', ');
        }
      }
      
      if (currentLine.trim() !== '') {
        // Remove trailing comma if it exists and add a final comma for the group
        content += currentLine.replace(/,\s*$/, '') + ',\n';
      }
    }
    
    content += `  },\n\n`;
  }

  content += `};\n\n`;

  // Add total counts
  content += `// Total counts for each starting phoneme (for normalization)\n`;
  content += `export const ARPABET_TOTAL_COUNTS: Record<string, number> = {\n`;
  
  for (const [phoneme, total] of Object.entries(totalCounts).sort()) {
    content += `  '${phoneme}': ${total},\n`;
  }
  
  content += `};\n\n`;

  // Add phoneme set
  content += `// All phonemes that can occur\n`;
  content += `export const ALL_ARPABET_PHONEMES = new Set([\n`;
  
  const sortedPhonemes = Array.from(allPhonemes).sort();
  for (let i = 0; i < sortedPhonemes.length; i += 8) {
    const chunk = sortedPhonemes.slice(i, i + 8);
    content += `  ${chunk.map(p => `'${p}'`).join(', ')},\n`;
  }
  
  content += `]);\n`;
  
  return content;
}

/**
 * Main execution
 */
async function main() {
  console.log('🎯 Generating ARPABET bigram table from CMU Pronouncing Dictionary...\n');
  
  // Download and parse CMU dictionary
  const lines = await downloadCMUDict();
  const pronunciations = parseCMUDict(lines);
  
  // Count bigrams
  const bigramCounts = countBigrams(pronunciations);
  
  // Generate TypeScript file
  const tsContent = generateTypeScriptFile(bigramCounts);
  
  // Write to file
  const outputPath = path.join(process.cwd(), 'src/phonotactic/arpabet-bigrams.ts');
  fs.writeFileSync(outputPath, tsContent, 'utf8');
  
  console.log(`\n✅ Generated ${outputPath}`);
  console.log(`📝 File contains ${Object.keys(bigramCounts).length} starting phonemes`);
  console.log(`🔤 Total unique phonemes: ${getAllPhonemes(bigramCounts).size}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Run: npx tsx scripts/generate-baseline.ts`);
  console.log(`  2. Run: npm test`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
