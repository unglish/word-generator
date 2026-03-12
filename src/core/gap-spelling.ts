import { GapSpelling, GapSpellingTargetLayer, LanguageConfig } from "../config/language.js";
import { Syllable, WordGenerationContext } from "../types.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { rewriteOrthographyTraceSurface } from "./write.js";

interface CompiledGapSpelling {
  name: string;
  replacement: string;
  hyphenated: string;
  weight: number;
  targetLayer: GapSpellingTargetLayer;
}

export interface GapSpellingWordMetadata {
  replacement: string;
  names: string[];
  targetLayers: GapSpellingTargetLayer[];
}

function serializePhonemeSequence(phonemes: string[]): string {
  return phonemes.join("\u0001");
}

export function buildWordPhonemeKey(syllables: Syllable[]): string {
  return serializePhonemeSequence(
    syllables.flatMap((syllable) => [
      ...syllable.onset.map((phoneme) => phoneme.sound),
      ...syllable.nucleus.map((phoneme) => phoneme.sound),
      ...syllable.coda.map((phoneme) => phoneme.sound),
    ]),
  );
}

function compileGapSpellings(gapSpellings: GapSpelling[]): Map<string, CompiledGapSpelling[]> {
  const compiled = new Map<string, CompiledGapSpelling[]>();
  for (const gapSpelling of gapSpellings) {
    const key = serializePhonemeSequence(gapSpelling.phonemes);
    const variants = compiled.get(key) ?? [];
    variants.push({
      name: gapSpelling.name,
      replacement: gapSpelling.replacement,
      hyphenated: gapSpelling.hyphenated ?? gapSpelling.replacement,
      weight: gapSpelling.weight ?? 100,
      targetLayer: gapSpelling.targetLayer,
    });
    compiled.set(key, variants);
  }
  return compiled;
}

function selectGapSpelling(
  variants: CompiledGapSpelling[] | undefined,
  context: WordGenerationContext,
): CompiledGapSpelling | undefined {
  if (!variants || variants.length === 0) return undefined;
  if (variants.length === 1) return variants[0];
  return getWeightedOption(variants.map((variant) => [variant, variant.weight]), context.rand);
}

export function createGapSpellingApplicator(
  config: Pick<LanguageConfig, "gapSpellings">,
): (context: WordGenerationContext) => void {
  const gapSpellingMap = compileGapSpellings(config.gapSpellings ?? []);

  return (context: WordGenerationContext) => {
    if (context.word.syllables.length === 0 || gapSpellingMap.size === 0) return;

    const selected = selectGapSpelling(
      gapSpellingMap.get(buildWordPhonemeKey(context.word.syllables)),
      context,
    );
    if (!selected) return;

    const before = context.word.written.clean;
    context.word.written.clean = selected.replacement;
    context.word.written.hyphenated = selected.hyphenated;
    context.trace?.recordRepair(
      `gapSpelling:${selected.name}`,
      before,
      selected.replacement,
      `targetLayer:${selected.targetLayer}`,
    );
    if (context.trace?.orthographyTrace) {
      rewriteOrthographyTraceSurface(context.trace, selected.replacement);
    }
  };
}

export function buildGapSpellingWordIndex(
  gapSpellings: GapSpelling[],
): Map<string, GapSpellingWordMetadata> {
  const byWord = new Map<string, GapSpellingWordMetadata>();
  for (const gapSpelling of gapSpellings) {
    const key = gapSpelling.replacement.toLowerCase();
    const existing = byWord.get(key);
    if (existing) {
      if (!existing.names.includes(gapSpelling.name)) existing.names.push(gapSpelling.name);
      if (!existing.targetLayers.includes(gapSpelling.targetLayer)) {
        existing.targetLayers.push(gapSpelling.targetLayer);
      }
      continue;
    }
    byWord.set(key, {
      replacement: key,
      names: [gapSpelling.name],
      targetLayers: [gapSpelling.targetLayer],
    });
  }
  return byWord;
}

export function groupGapSpellingsByTargetLayer(
  gapSpellings: GapSpelling[],
): Map<GapSpellingTargetLayer, GapSpelling[]> {
  const grouped = new Map<GapSpellingTargetLayer, GapSpelling[]>();
  for (const gapSpelling of gapSpellings) {
    const entries = grouped.get(gapSpelling.targetLayer) ?? [];
    entries.push(gapSpelling);
    grouped.set(gapSpelling.targetLayer, entries);
  }
  return grouped;
}
