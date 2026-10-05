export const VOWEL_LETTERS = new Set(["a", "e", "i", "o", "u", "y"]);

/**
 * Check if a character is a vowel letter.
 * Y is consonantal when followed by a vowel (a,e,i,o,u), e.g. "yet", "yawn".
 * Otherwise, including at the end of a word, Y is a vowel.
 */
export function isVowelChar(ch: string, idx: number, str: string): boolean {
  const lower = ch.toLowerCase();
  if (lower === "y") {
    // Y followed by a vowel letter (a,e,i,o,u) is consonantal (e.g. "yet", "yoga", "beyond")
    // Y in all other positions is a vowel (e.g. "gym", "fly", "myth")
    const next = idx + 1 < str.length ? str[idx + 1].toLowerCase() : "";
    return next === "" || !"aeiou".includes(next);
  }
  return VOWEL_LETTERS.has(lower);
}

export function isConsonantLetter(ch: string, idx?: number, str?: string): boolean {
  if (idx !== undefined && str !== undefined) {
    return !isVowelChar(ch, idx, str);
  }
  return !VOWEL_LETTERS.has(ch.toLowerCase());
}
