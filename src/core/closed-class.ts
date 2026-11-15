import type {
  ClosedClassConfig,
  ClosedClassEntry,
  LanguageConfig,
} from "../config/language.js";
import type {
  Phoneme,
  Syllable,
  Word,
  WordGenerationContext,
  WordProvenance,
} from "../types.js";
import type { RNG } from "../utils/random.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { clonePhoneme, cloneSyllables } from "./lexical.js";
import type { TraceCollector } from "./trace.js";

export interface CompiledClosedClassEntry {
  name: string;
  phonemes: string[];
  spelling: string;
  hyphenated: string;
  weight: number;
}

export interface CompiledClosedClass {
  probability: number;
  entries: CompiledClosedClassEntry[];
}

export interface ClosedClassWordMetadata {
  spelling: string;
  names: string[];
}

/**
 * Syllabify a flat phoneme sequence with unconstrained maximal onset:
 * intervocalic consonants attach to the following nucleus; trailing
 * consonants form the final coda.
 */
export function syllablesFromPhonemeSounds(
  sounds: readonly string[],
  phonemeBySound: ReadonlyMap<string, Phoneme>,
  nucleusSounds: ReadonlySet<string>,
): Syllable[] {
  if (sounds.length === 0) {
    throw new Error("closed-class phoneme sequence must be non-empty");
  }

  const resolved: Phoneme[] = sounds.map((sound) => {
    const phoneme = phonemeBySound.get(sound);
    if (!phoneme) {
      throw new Error(`closed-class phoneme "${sound}" is not in inventory`);
    }
    return clonePhoneme(phoneme);
  });

  const nucleusIndexes: number[] = [];
  for (let i = 0; i < resolved.length; i++) {
    if (nucleusSounds.has(resolved[i].sound)) {
      nucleusIndexes.push(i);
    }
  }
  if (nucleusIndexes.length === 0) {
    throw new Error("closed-class phoneme sequence needs at least one nucleus");
  }

  const syllables: Syllable[] = [];
  for (let s = 0; s < nucleusIndexes.length; s++) {
    const nucleusIndex = nucleusIndexes[s];
    const prevNucleus = s === 0 ? -1 : nucleusIndexes[s - 1];
    const nextNucleus =
      s + 1 < nucleusIndexes.length ? nucleusIndexes[s + 1] : resolved.length;

    const onsetStart = prevNucleus + 1;
    const onset = resolved.slice(onsetStart, nucleusIndex);
    const nucleus = [resolved[nucleusIndex]];
    // Maximal onset: consonants before the next nucleus belong to that onset,
    // so this syllable's coda is empty unless this is the final nucleus.
    const coda =
      s === nucleusIndexes.length - 1
        ? resolved.slice(nucleusIndex + 1, nextNucleus)
        : [];

    syllables.push({ onset, nucleus, coda });
  }

  return syllables;
}

export function compileClosedClass(
  config: Pick<LanguageConfig, "closedClass">,
): CompiledClosedClass | undefined {
  const closedClass = config.closedClass;
  if (!closedClass || closedClass.entries.length === 0) return undefined;
  return {
    probability: closedClass.probability,
    entries: closedClass.entries.map((entry) => ({
      name: entry.name,
      phonemes: [...entry.phonemes],
      spelling: entry.spelling,
      hyphenated: entry.hyphenated ?? entry.spelling,
      weight: entry.weight ?? 100,
    })),
  };
}

export function sampleClosedClassEntry(
  compiled: CompiledClosedClass,
  rand: RNG,
): CompiledClosedClassEntry {
  return getWeightedOption(
    compiled.entries.map((entry) => [entry, entry.weight]),
    rand,
  );
}

export function closedClassProvenance(
  entry: Pick<CompiledClosedClassEntry, "name">,
): WordProvenance {
  return { kind: "closedClass", name: entry.name };
}

export function buildClosedClassWordIndex(
  entries: ClosedClassEntry[] | undefined,
): Map<string, ClosedClassWordMetadata> {
  const byWord = new Map<string, ClosedClassWordMetadata>();
  if (!entries) return byWord;
  for (const entry of entries) {
    const key = entry.spelling.toLowerCase();
    const existing = byWord.get(key);
    if (existing) {
      if (!existing.names.includes(entry.name)) existing.names.push(entry.name);
      continue;
    }
    byWord.set(key, { spelling: key, names: [entry.name] });
  }
  return byWord;
}

export function buildClosedClassCatalog(
  closedClass: ClosedClassConfig | undefined,
): Map<string, ClosedClassWordMetadata> {
  return buildClosedClassWordIndex(closedClass?.entries);
}

export interface ClosedClassEmissionRuntime {
  phonemeBySound: ReadonlyMap<string, Phoneme>;
  nucleusSounds: ReadonlySet<string>;
  applyStress: (context: WordGenerationContext) => void;
  realizeSurface: (context: WordGenerationContext) => void;
}

export interface EmitClosedClassOptions {
  rand: RNG;
  trace?: TraceCollector;
  morphologyTemplate?: "bare";
}

/** Build a finished bare word from a closed-class entry (skips length targeting). */
export function emitClosedClassWord(
  rt: ClosedClassEmissionRuntime,
  entry: CompiledClosedClassEntry,
  options: EmitClosedClassOptions,
): Word {
  const syllables = syllablesFromPhonemeSounds(
    entry.phonemes,
    rt.phonemeBySound,
    rt.nucleusSounds,
  );

  const context: WordGenerationContext = {
    rand: options.rand,
    syllableCount: syllables.length,
    currSyllableIndex: 0,
    targetPhonemeCount: entry.phonemes.length,
    trace: options.trace,
    word: {
      syllables,
      pronunciation: "",
      written: {
        clean: entry.spelling,
        hyphenated: entry.hyphenated,
      },
      provenance: closedClassProvenance(entry),
    },
  };

  if (options.trace && options.morphologyTemplate) {
    options.trace.morphologyTrace = {
      template: options.morphologyTemplate,
      syllableReduction: 0,
    };
  }

  rt.applyStress(context);

  const stressed = cloneSyllables(context.word.syllables);
  context.word.lexical = {
    root: cloneSyllables(stressed),
    syllables: cloneSyllables(stressed),
    rootSyllableStart: 0,
  };
  // Written form is the closed-class spelling; do not run the productive writer.
  context.word.written.clean = entry.spelling;
  context.word.written.hyphenated = entry.hyphenated;
  context.word.provenance = closedClassProvenance(entry);

  rt.realizeSurface(context);

  options.trace?.recordRepair(
    `closedClass:${entry.name}`,
    "",
    entry.spelling,
    `phonemes:${entry.phonemes.join(" ")}`,
  );
  if (options.trace) {
    options.trace.syllableCount = context.syllableCount;
    options.trace.targetPhonemeCount = entry.phonemes.length;
    context.word.trace = options.trace.toTrace(false);
  }

  return context.word;
}
