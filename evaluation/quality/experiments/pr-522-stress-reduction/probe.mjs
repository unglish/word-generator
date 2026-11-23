import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { generateWord } = await import(pathToFileURL(process.argv[2] + '/src/index.ts'));
const first = Number(process.argv[3] ?? 5000000);
const count = Number(process.argv[4] ?? 20000);
const { distributionDistance } = await import(pathToFileURL(process.argv[2] + '/evaluation/quality/distribution.ts'));
const reference = JSON.parse(readFileSync(process.argv[2] + '/data/cmu/cmu-lexicon-trigrams.json', 'utf8'));
const trigrams = {};
const tally = {};
const inc = (key) => { tally[key] = (tally[key] ?? 0) + 1; };
const full = new Set(['ɛ', 'æ', 'ʌ', 'ɑ', 'ɔ']);
const short = new Set(['ɪ','ɛ','æ','ʌ','ʊ','ɑ','ɔ','ɜ']);
const suffixes = new Set(['ing','ed','er','est','able']);
const isFull = s => !s.stress && full.has(s.nucleus[0]?.sound);
const witnessSeeds = new Set([5000000, 5000011, 5000553, 5000660, 5015506, 2000037, 2000049]);
const examples = {};
for (let seed = first; seed < first + count; seed++) {
  const word = generateWord({ seed, trace: true });
  const { syllables, trace, lexical } = word;
  const spelling = word.written.clean.toLowerCase();
  for (let i = 0; i + 3 <= spelling.length; i++) {
    const trigram = spelling.slice(i, i + 3);
    if (/^[a-z]{3}$/.test(trigram)) trigrams[trigram] = (trigrams[trigram] ?? 0) + 1;
  }
  for (const repair of trace.repairs) {
    if (repair.rule === 'clearBannedSecondaryStress') {
      inc('secondaryStressCleared');
      examples.firstCleared ??= { seed, pronunciation: word.pronunciation, repair };
    }
  }
  if (syllables.some(s => s.stress === 'ˌ' && s.nucleus.some(p => p.sound === 'ə'))) inc('secondarySchwa');
  if (syllables.some(s => s.stress === 'ˈ' && s.nucleus.some(p => p.sound === 'ə'))) inc('primarySchwa');
  if (syllables.length > 1) {
    const final = syllables.at(-1);
    const sound = final.nucleus[0]?.sound;
    inc('poly');
    inc('final.'+(final.stress ?? '0'));
    if (sound === 'ɚ') inc('rhotic.'+(final.stress ?? '0'));
    if (isFull(final)) { inc('finalFull'); inc('finalFull.' + sound); }
  }
  const morph = trace.morphology;
  const base = trace.baseSpelling?.surface;
  if (suffixes.has(morph?.suffix) && base && /[^aeiou][aeiou][bcdfghlmnprst]$/i.test(base)) {
    const final = lexical.root.at(-1);
    const surfaceRootFinal = syllables[lexical.rootSyllableStart + lexical.root.length - 1];
    const sound = final.nucleus[0]?.sound;
    const assembled = morph.realization.assembledParts.find(part => part.role === 'root').text;
    const doubled = assembled === base + base.slice(-1);
    let row = !final.stress ? 'unstressed' : short.has(sound) ? (lexical.root.length === 1 ? 'mono-short' : final.stress === 'ˈ' ? 'primary-short' : 'secondary-short') : sound === 'ɚ' ? (lexical.root.length === 1 ? 'mono-rhotic' : final.stress === 'ˈ' ? 'primary-rhotic' : 'secondary-rhotic') : sound === 'ə' ? 'stressed-schwa' : 'stressed-long-other';
    inc('eligible.' + row);
    if (sound === 'ɑ' && final.stress) {
      inc('eligible.lot.' + row);
      if (doubled) inc('doubled.lot.' + row);
    }
    if (doubled) inc('doubled.' + row);
    if (isFull(final)) inc('eligible.lexicalUnstressedFull');
    if (isFull(surfaceRootFinal)) {
      inc('eligible.surfaceUnstressedFull');
      if (!examples['suffixFull']) examples.suffixFull = { seed, spelling: word.written.clean, pronunciation: word.pronunciation };
    }
  }
  if (witnessSeeds.has(seed) || (process.env.WITNESSES ?? '').split(',').map(Number).includes(seed)) {
    examples[seed] = { spelling: word.written.clean, pronunciation: word.pronunciation, stages: trace.stages.filter(s => ['applyStress','repairNucleusWordPositions','repairFinalStressedNuclei','generatePronunciation'].includes(s.name)), repairs: trace.repairs.filter(r => /Stress/.test(r.rule)), realization: morph?.realization };
  }
}
console.log(JSON.stringify({ first, count, tally, trigramDistance: distributionDistance(trigrams, reference), examples }, null, 2));
