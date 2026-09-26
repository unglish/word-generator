export interface PhonemeNormalization {
  generatedAliases?: Record<string, string>;
}

/** Coarse corpus aliases are explicit; rejected tokens must be counted by callers. */
export function normalizeGeneratedPhoneme(sound: string, normalization: PhonemeNormalization): string | null {
  if (!sound) return null;
  const unaspirated = sound.replace(/\u02b0/g, "");
  const normalized = normalization.generatedAliases?.[unaspirated] ?? unaspirated;
  return /^[\p{Letter}:]+$/u.test(normalized) ? normalized : null;
}
