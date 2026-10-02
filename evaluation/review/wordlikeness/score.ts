import type { Word } from "../../../src/types.js";
import { ipaToArpabet } from "../../../src/phonotactic/ipa-to-arpabet.js";
import { scoreArpabetWords } from "../../../src/phonotactic/score.js";
import { CONSONANTS, VOWELS, contextKey, contexts, keyOf, normalizeSpelling, type Context, type ReferenceModel, type SoundSyllable } from "./model.js";

export interface Component {
  index: number; context: string; token: string; count: number; total: number;
  probability: number | null; log_probability: number | null; diagnostic: string | null;
}
export interface SoundComponent extends Component { prosody: Context }
export interface SoundScore { total: number | null; typicality: number | null; components: SoundComponent[]; diagnostics: string[] }
export interface SpellingScore { total: number | null; normalized: number | null; components: Component[]; diagnostics: string[] }
function sumLogs(components: Component[]): number | null {
  if (components.some(component => component.log_probability === null)) return null;
  return components.reduce((sum, component) => sum + component.log_probability!, 0);
}
export function validateSyllables(syllables: SoundSyllable[]): string[] {
  if (!syllables.length) return ["No saved syllables."];
  return syllables.flatMap((syllable, index) => {
    const reasons: string[] = [];
    if (syllable.nucleus.length !== 1 || !VOWELS.has(syllable.nucleus[0])) reasons.push(`Syllable ${index}: expected one supported vowel nucleus.`);
    if ([...syllable.onset, ...syllable.coda].some(token => !CONSONANTS.has(token))) reasons.push(`Syllable ${index}: unsupported onset/coda token.`);
    if (typeof syllable.stressed !== "boolean") reasons.push(`Syllable ${index}: unsupported stress.`);
    return reasons;
  });
}
export function scoreSound(syllables: SoundSyllable[], model: ReferenceModel): SoundScore {
  const diagnostics = validateSyllables(syllables);
  if (diagnostics.length) return { total: null, typicality: null, components: [], diagnostics };
  const components = syllables.flatMap((syllable, index) => contexts(index, syllables.length, syllable.stressed).map(prosody => {
    const token = keyOf(prosody.constituent === "onset" ? syllable.onset : [...syllable.nucleus, ...syllable.coda]);
    const context = contextKey(prosody);
    const bucket = model.constituents[context];
    const count = bucket?.counts[token] ?? 0;
    const total = bucket?.total ?? 0;
    const probability = total ? count / total : null;
    const diagnostic = !total ? "unobserved-context" : !count ? "unseen-constituent-zero-probability" : null;
    return { index, prosody, context, token, count, total, probability,
      log_probability: probability ? Math.log(probability) : null, diagnostic };
  }));
  const total = sumLogs(components);
  return { total, typicality: total === null ? null : total / (2 * syllables.length), components,
    diagnostics: components.filter(component => component.diagnostic).map(component => `${component.index} ${component.context} ${component.token || "∅"}: ${component.diagnostic}`) };
}
export function scoreSpelling(spelling: string, model: ReferenceModel): SpellingScore {
  const normalized = normalizeSpelling(spelling);
  if (!normalized) return { total: null, normalized: null, components: [], diagnostics: ["Expected nonempty ASCII letters; input was not stripped or transliterated."] };
  const characters = `^^${normalized}$`;
  const components: Component[] = [];
  for (let i = 2; i < characters.length; i++) {
    const context = characters.slice(i - 2, i), token = characters[i];
    const bucket = model.characters[context];
    const count = bucket?.counts[token] ?? 0, total = bucket?.total ?? 0;
    const probability = (count + model.method.spelling_alpha) / (total + model.method.spelling_alpha * model.method.spelling_vocabulary);
    components.push({ index: i - 2, context, token, count, total, probability, log_probability: Math.log(probability),
      diagnostic: !total ? "unseen-context-uniform" : !count ? "unseen-trigram-smoothed" : null });
  }
  const total = sumLogs(components)!;
  return { total, normalized: total / (normalized.length + 1), components, diagnostics: [] };
}
export function savedSound(word: Word): { syllables: SoundSyllable[]; diagnostics: string[] } {
  const diagnostics: string[] = [];
  const syllables = word.syllables.map((syllable, index) => {
    const map = (part: "onset" | "nucleus" | "coda") => syllable[part].map((phoneme, tokenIndex) => {
      const token = ipaToArpabet(phoneme.sound);
      if (!token) diagnostics.push(`Syllable ${index} ${part}[${tokenIndex}]: unsupported IPA ${phoneme.sound}.`);
      return token ?? `<unsupported:${phoneme.sound}>`;
    });
    if (syllable.stress !== undefined && syllable.stress !== "ˈ" && syllable.stress !== "ˌ") diagnostics.push(`Syllable ${index}: unsupported stress.`);
    return { onset: map("onset"), nucleus: map("nucleus"), coda: map("coda"), stressed: syllable.stress !== undefined };
  });
  return { syllables, diagnostics: [...diagnostics, ...validateSyllables(syllables)] };
}
export function scoreWord(word: Word, spelling: string, model: ReferenceModel) {
  const saved = savedSound(word);
  const sound: SoundScore = saved.diagnostics.length ? { total: null, typicality: null, components: [], diagnostics: saved.diagnostics } : scoreSound(saved.syllables, model);
  const arpabet = saved.syllables.flatMap(syllable => [...syllable.onset, ...syllable.nucleus, ...syllable.coda]).join(" ");
  const bigram = saved.diagnostics.length ? null : scoreArpabetWords([arpabet]).words[0];
  const orthographic = scoreSpelling(spelling, model);
  return {
    metrics: { paper: sound.total, typicality: sound.typicality, spelling: orthographic.normalized, spelling_total: orthographic.total,
      bigram: bigram?.score ?? null, per_bigram: bigram?.perBigram ?? null,
      written_length: normalizeSpelling(spelling)?.length ?? null, syllable_count: word.syllables.length || null },
    sound, orthographic, bigram: { ...bigram, diagnostics: saved.diagnostics, log_base: 2 }, saved_syllables: saved.syllables,
  };
}
export type WordScores = ReturnType<typeof scoreWord>;
export type Metric = keyof WordScores["metrics"];
export const METRICS: Metric[] = ["paper", "typicality", "spelling", "spelling_total", "bigram", "per_bigram", "written_length", "syllable_count"];
