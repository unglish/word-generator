export interface PhonemeNormalization {
  generatedAliases?: Record<string, string>;
}

const PHONEME_TOKEN_RE = /^[\p{Letter}:]+$/u;

/** Coarse corpus aliases are explicit; rejected tokens must be counted by callers. */
export function normalizeGeneratedPhoneme(sound: string, normalization: PhonemeNormalization): string | null {
  if (!sound) return null;
  const unaspirated = sound.replace(/ʰ/g, "");
  const normalized = normalization.generatedAliases?.[unaspirated] ?? unaspirated;
  return PHONEME_TOKEN_RE.test(normalized) ? normalized : null;
}
