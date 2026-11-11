interface Phone {
  readonly sound: string;
  readonly aspirated?: boolean;
}
interface PronunciationSyllable {
  readonly onset: readonly Phone[];
  readonly nucleus: readonly Phone[];
  readonly coda: readonly Phone[];
  readonly stress?: string;
}
const SEGMENTS = ["onset", "nucleus", "coda"] as const;
type Segment = (typeof SEGMENTS)[number];
const unchangedSound = (phone: Phone): string => phone.sound;

export function renderPhone(
  sound: string,
  aspirated: boolean | undefined,
): string {
  return aspirated && !sound.endsWith("ʰ") ? `${sound}ʰ` : sound;
}

export function renderPronunciation(
  syllables: readonly PronunciationSyllable[],
  soundForPhone: (phone: Phone, segment: Segment) => string = unchangedSound,
): string {
  let guide = "";
  for (let index = 0; index < syllables.length; index++) {
    const syllable = syllables[index];
    if (syllable.stress === "ˈ" && syllables.length > 1) guide += "ˈ";
    else if (syllable.stress === "ˌ") guide += "ˌ";
    else if (index > 0) guide += ".";
    for (const segment of SEGMENTS) {
      const phones = syllable[segment];
      for (let i = 0; i < phones.length; i++) {
        const phone = phones[i];
        guide += renderPhone(soundForPhone(phone, segment), phone.aspirated);
      }
    }
  }
  return guide;
}
