import type { Affix, PhonologicalCondition } from "../../src/config/language.js";
import type { MorphologyTemplate } from "../../src/types.js";
import type { CmuPhone, SelectedCmuEntry } from "./cmu.js";
import { rootConfig } from "./root-config.js";

type Projection = Readonly<Record<string, string>>;
type Join = "direct" | "y-to-i" | "drop-silent-e" | "double-consonant" | "collapse-triple-letter" | "o-es" | "shared-e";
interface Step {
  type: Affix["type"];
  affix: string;
  written: string;
  join: Join;
  stem: string;
}
type Candidate = Step & { phoneCost: number; affixOrder: number };
interface Analysis { stem: string; steps: Step[] }
type LedgerOutcome =
  | { status: "name-or-uppercase" | "outside-common-list"; stem: null; steps: [] }
  | (Analysis & { status: "included"; template: MorphologyTemplate })
  | (Analysis & { status: "too-many-affixes" })
  | (Analysis & { status: "residue"; lemmas: readonly string[] });

export type LedgerRow = { spelling: string; line: number } & LedgerOutcome;

export interface RootInputs {
  entries: readonly SelectedCmuEntry[];
  common: ReadonlySet<string>;
  names: ReadonlySet<string>;
  exceptions: ReadonlyMap<string, readonly string[]>;
  affixes: readonly Affix[];
  ipa: Projection;
}

const sound = (phone: CmuPhone, ipa: Projection) => {
  const projected = ipa[phone.base];
  if (!projected) throw new Error(`Missing IPA projection for ${phone.base}`);
  return projected;
};

function edgeFeatures(phone: CmuPhone, ipa: Projection) {
  const projected = phone.base === "ER" ? "ɚ" : sound(phone, ipa);
  return rootConfig.features[projected];
}

function conditionMatches(test: PhonologicalCondition, entry: SelectedCmuEntry, ipa: Projection): boolean {
  const phone = test.position === "preceding" ? entry.phones.at(-1) : entry.phones[0];
  if (!phone) return false;
  const features = edgeFeatures(phone, ipa);
  return (!test.sounds || test.sounds.includes(sound(phone, ipa))) &&
    (test.voiced === undefined || features?.voiced === test.voiced) &&
    (!test.manner || test.manner.includes(features?.manner ?? "")) &&
    (!test.place || test.place.includes(features?.place ?? ""));
}

function forms(affix: Affix, stem: SelectedCmuEntry, ipa: Projection) {
  const eligible = (affix.allomorphs ?? []).filter(form => conditionMatches(form.phonologicalCondition, stem, ipa));
  // A more specific sibilant/stop condition takes precedence over voicing alone.
  const specific = eligible.filter(({ phonologicalCondition: test }) => test.sounds || test.manner || test.place);
  const variants = specific.length ? specific : eligible;
  return variants.length ? variants.map(form => ({ written: form.written ?? affix.written, phonemes: form.phonemes })) : [affix];
}

function canDouble(stem: SelectedCmuEntry, ipa: Projection): boolean {
  const [vowel, final] = stem.phones.slice(-2);
  return vowel?.kind === "vowel" && vowel.stress !== 0 && /^(AE|AH|EH|IH|AA|AO|UH)$/.test(vowel.base) &&
    final?.kind === "consonant" && sound(final, ipa) === stem.spelling.at(-1);
}

interface JoinedSpelling { word: string; written: string; join: Join }

function spellings(affix: Affix, written: string, stem: SelectedCmuEntry, ipa: Projection): JoinedSpelling[] {
  const base = stem.spelling;
  if (affix.type === "prefix") return [{ word: written + base, written, join: "direct" }];
  const forms: JoinedSpelling[] = [{ word: base + written, written, join: "direct" }];
  // The surviving e already spells the vowel of syllabic /ɪz/: face + s.
  if (affix.written === "s" && written === "es" && base.endsWith("e")) {
    return [{ word: base + affix.written, written: affix.written, join: "shared-e" }];
  }
  if (affix.written === "s" && written === "s" && /[^aeiou]o$/.test(base)) {
    forms.push({ word: base + "es", written: "es", join: "o-es" });
  }
  for (const transform of affix.boundaryTransforms ?? []) {
    const { name, match, replace, affixWritten } = transform;
    if (!match.test(base)) continue;
    if (name === "drop-silent-e" && stem.phones.at(-1)?.kind !== "consonant") continue;
    if (name === "double-consonant" && !canDouble(stem, ipa)) continue;
    if (name === "y-to-i" || name === "drop-silent-e" || name === "double-consonant" || name === "collapse-triple-letter") {
      const ending = affixWritten ?? written;
      forms.push({ word: base.replace(match, replace) + ending, written: ending, join: name });
    }
  }
  return forms;
}

function affixPhoneCost(actual: CmuPhone, expected: string, affix: Affix, ipa: Projection): number {
  if (sound(actual, ipa) === expected || (actual.base === "AH" && expected === "ʌ") ||
    (actual.base === "ER" && expected === "ɚ")) return 0;
  if (affix.type === "prefix" && affix.written === "re" && actual.base === "IY" && expected === "ɪ") return 1;
  if (actual.kind === "vowel" && actual.stress === 0) {
    if (actual.base === "AH" && expected === "ɪ") return 1;
    if (actual.base === "IH" && (expected === "ə" || expected === "i:")) return 1;
  }
  return Infinity;
}

function phoneCost(
  word: SelectedCmuEntry, stem: SelectedCmuEntry, affix: Affix, affixPhones: string[], join: Join, ipa: Projection,
): number {
  const prefix = affix.type === "prefix";
  let stemPhones = stem.phones;
  const boundary = prefix ? stemPhones[0] : stemPhones.at(-1);
  const affixEdge = prefix ? affixPhones.at(-1) : affixPhones[0];
  const elidedPhone = word.phones.length === stemPhones.length + affixPhones.length - 1;
  let joinCost = 0;
  if (elidedPhone && boundary?.kind === "consonant" && sound(boundary, ipa) === affixEdge) {
    affixPhones = prefix ? affixPhones.slice(0, -1) : affixPhones.slice(1);
    joinCost = 1;
  } else if (elidedPhone && join === "drop-silent-e" && /[^aeiou]le$/.test(stem.spelling) &&
    stemPhones.at(-2)?.raw === "AH0" && boundary?.base === "L") {
    // A syllabic l can lose its schwa when it moves into the next onset: crackle → crackling.
    stemPhones = [...stemPhones.slice(0, -2), boundary];
    joinCost = 1;
  }
  if (word.phones.length !== stemPhones.length + affixPhones.length) return Infinity;
  const affixOffset = prefix ? 0 : stemPhones.length;
  const stemOffset = prefix ? affixPhones.length : 0;
  const endingCost = affixPhones.reduce((cost, expected, i) => cost + affixPhoneCost(word.phones[affixOffset + i], expected, affix, ipa), 0);
  if (!Number.isFinite(endingCost)) return Infinity;
  let cost = endingCost + joinCost;
  let shiftedVowels = 0;
  for (const [i, expected] of stemPhones.entries()) {
    const actual = word.phones[stemOffset + i];
    if (actual.base === expected.base) continue;
    const edgeIndex = prefix ? 0 : stemPhones.length - 1;
    if (i === edgeIndex && affix.morphophonemicRules?.some(rule =>
      rule.target !== "nucleus" && rule.replaceSound === sound(actual, ipa) &&
      (!rule.phonologicalCondition || conditionMatches(rule.phonologicalCondition, stem, ipa)) &&
      (!rule.writtenMatch || rule.writtenMatch.test(stem.spelling)))) {
      cost++;
      continue;
    }
    if (actual.kind !== "vowel" || expected.kind !== "vowel") return Infinity;
    if ((actual.base === "AA" && expected.base === "AO") || (actual.base === "AO" && expected.base === "AA") ||
      (i === stemPhones.length - 1 && join === "y-to-i" && expected.base === "IY" &&
        actual.stress === 0 && /^(AH|IH)$/.test(actual.base))) {
      cost++;
      continue;
    }
    if (actual.stress === 0 && expected.stress === 0 && /^[AI]H$/.test(actual.base) && /^[AI]H$/.test(expected.base)) {
      cost++;
    } else if (affix.stressEffect === "attract-preceding" && ++shiftedVowels === 1) {
      cost += 2;
    } else {
      return Infinity;
    }
  }
  return cost;
}

export function stripRoots({ entries, common, names, exceptions, affixes, ipa }: RootInputs): LedgerRow[] {
  const words = new Map(entries.filter(entry => common.has(entry.spelling)).map(entry => [entry.spelling, entry]));
  const best = new Map<string, Candidate>();
  for (const stem of words.values()) {
    for (const [affixOrder, affix] of affixes.entries()) {
      for (const form of forms(affix, stem, ipa)) {
        for (const { word, written, join } of spellings(affix, form.written, stem, ipa)) {
          const surface = words.get(word);
          if (!surface || word.length <= stem.spelling.length) continue;
          const knownLemmas = exceptions.get(word);
          if (knownLemmas && !knownLemmas.includes(stem.spelling)) continue;
          const cost = phoneCost(surface, stem, affix, form.phonemes, join, ipa);
          if (!Number.isFinite(cost)) continue;
          const candidate = {
            type: affix.type, affix: affix.written, written, join, stem: stem.spelling,
            phoneCost: cost, affixOrder,
          };
          const previous = best.get(word);
          if (!previous || compare(candidate, previous) < 0) best.set(word, candidate);
        }
      }
    }
  }
  return entries.map(({ spelling, line }) => ({ spelling, line, ...classify(spelling, words, names, exceptions, best) }));
}

const lexicalOrder = (a: string, b: string): number => Number(a > b) - Number(a < b);

const compare = (a: Candidate, b: Candidate): number =>
  a.phoneCost - b.phoneCost || b.written.length - a.written.length ||
  Number(a.type === "prefix") - Number(b.type === "prefix") ||
  Number(a.join !== "direct") - Number(b.join !== "direct") || a.affixOrder - b.affixOrder ||
  lexicalOrder(a.stem, b.stem) || lexicalOrder(a.join, b.join);

function classify(
  spelling: string,
  words: ReadonlyMap<string, SelectedCmuEntry>,
  names: ReadonlySet<string>,
  exceptions: RootInputs["exceptions"],
  best: ReadonlyMap<string, Candidate>,
): LedgerOutcome {
  if (!words.has(spelling)) {
    return { status: names.has(spelling) ? "name-or-uppercase" : "outside-common-list", stem: null, steps: [] };
  }
  let stem = spelling;
  const steps: Step[] = [];
  let prefixes = 0, suffixes = 0;
  while (true) {
    const edge = best.get(stem);
    if (!edge) break;
    steps.push({ type: edge.type, affix: edge.affix, written: edge.written, join: edge.join, stem: edge.stem });
    if (edge.type === "prefix") prefixes++;
    else suffixes++;
    stem = edge.stem;
  }
  if (prefixes > 1 || suffixes > 1) return { status: "too-many-affixes", stem, steps };
  const lemmas = exceptions.get(stem);
  if (lemmas) return { status: "residue", stem, steps, lemmas };
  const template = prefixes ? (suffixes ? "both" : "prefixed") : (suffixes ? "suffixed" : "bare");
  return { status: "included", stem, steps, template };
}
