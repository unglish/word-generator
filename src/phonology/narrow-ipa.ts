import { renderPhone, renderPronunciation } from "../utils/pronunciation.js";
/**
 * Narrow IPA export lens for Chimera / IPA-chart consumers.
 *
 * Projects Unglish legacy broad English glyphs (`r`, `əʊ`, `ɜ`, …) to
 * Chimera-safe narrow forms. Does not change generation, display defaults,
 * or phoneme-identity scoring — see docs/narrow-ipa.md.
 */
import { phonemes } from "../elements/phonemes.js";

/** Named interop lens. v1 = Chimera inventory + English G2P glyph conventions. */
export type NarrowIpaProfileId = "chimera-english-v1";

export interface NarrowIpaOptions {
  profile?: NarrowIpaProfileId;
  /** Coda /l/ → ɫ when phone slots are known. Default false. */
  darkL?: boolean;
  /** ASCII `i:` / Unicode `iː` → bare `i` (Chimera length via dur). Default true for chimera-english-v1. */
  stripFleeceLength?: boolean;
}

/** Segment with optional slot (needed only for darkL). */
export interface NarrowPhoneIn {
  sound: string;
  aspirated?: boolean;
  slot?: "onset" | "nucleus" | "coda";
  syllableIndex?: number;
  syllableFinal?: boolean;
}

export interface NarrowPhoneOut {
  sound: string;
  aspirated?: boolean;
}

export interface NarrowIpaRemap {
  readonly from: string;
  readonly to: string;
  /** When set, remap applies only if the matching option is enabled. */
  readonly when?: "stripFleeceLength";
}

export interface NarrowIpaProfile {
  readonly id: NarrowIpaProfileId;
  readonly remaps: readonly NarrowIpaRemap[];
  readonly defaults: Readonly<{ stripFleeceLength: boolean; darkL: boolean }>;
}

const CHIMERA_ENGLISH_V1: NarrowIpaProfile = Object.freeze({
  id: "chimera-english-v1",
  defaults: Object.freeze({ stripFleeceLength: true, darkL: false }),
  remaps: Object.freeze([
    Object.freeze({ from: "r", to: "ɹ" }),
    Object.freeze({ from: "əʊ", to: "oʊ" }),
    Object.freeze({ from: "ɜ", to: "ɝ" }),
    Object.freeze({ from: "ɡ", to: "g" }),
    Object.freeze({ from: "i:", to: "i", when: "stripFleeceLength" as const }),
    Object.freeze({ from: "iː", to: "i", when: "stripFleeceLength" as const }),
  ]),
});

type SyllableLike = {
  readonly onset: readonly {
    readonly sound: string;
    readonly aspirated?: boolean;
  }[];
  readonly nucleus: readonly {
    readonly sound: string;
    readonly aspirated?: boolean;
  }[];
  readonly coda: readonly {
    readonly sound: string;
    readonly aspirated?: boolean;
  }[];
  readonly stress?: string;
};

type WordLike = {
  readonly syllables: readonly SyllableLike[];
};

function resolveProfile(
  id: NarrowIpaProfileId = "chimera-english-v1",
): NarrowIpaProfile {
  switch (id) {
  case "chimera-english-v1":
    return CHIMERA_ENGLISH_V1;
  default: {
    const _exhaustive: never = id;
    throw new Error(`unknown narrow IPA profile: ${String(_exhaustive)}`);
  }
  }
}

/** Inspectable remap table for the profile (tests + docs). */
export function narrowIpaProfile(
  id: NarrowIpaProfileId = "chimera-english-v1",
): NarrowIpaProfile {
  return resolveProfile(id);
}

function resolveOptions(options?: NarrowIpaOptions): {
  profile: NarrowIpaProfile;
  darkL: boolean;
  stripFleeceLength: boolean;
} {
  const profile = resolveProfile(options?.profile ?? "chimera-english-v1");
  return {
    profile,
    darkL: options?.darkL ?? profile.defaults.darkL,
    stripFleeceLength:
      options?.stripFleeceLength ?? profile.defaults.stripFleeceLength,
  };
}

function remapSound(
  sound: string,
  profile: NarrowIpaProfile,
  stripFleeceLength: boolean,
  darkL: boolean,
  slot: NarrowPhoneIn["slot"] | undefined,
): string {
  let out = sound;
  for (const remap of profile.remaps) {
    if (remap.when === "stripFleeceLength" && !stripFleeceLength) continue;
    if (out === remap.from) {
      out = remap.to;
      break;
    }
  }
  if (darkL && out === "l" && slot === "coda") return "ɫ";
  return out;
}

/**
 * Flatten a Word (or syllable-shaped input) into NarrowPhoneIn rows with slots.
 * Prefer this over re-tokenizing `Word.pronunciation` when syllables exist.
 */
export function phonesFromWord(word: WordLike): NarrowPhoneIn[] {
  const phones: NarrowPhoneIn[] = [];
  word.syllables.forEach((syllable, syllableIndex) => {
    const ordered: {
      phone: { sound: string; aspirated?: boolean };
      slot: NarrowPhoneIn["slot"];
    }[] = [];
    for (const slot of ["onset", "nucleus", "coda"] as const) {
      for (const phone of syllable[slot]) ordered.push({ phone, slot });
    }
    ordered.forEach(({ phone, slot }, index) => {
      phones.push({
        sound: phone.sound,
        aspirated: phone.aspirated,
        slot,
        syllableIndex,
        syllableFinal: index === ordered.length - 1,
      });
    });
  });
  return phones;
}

/** Phone-array path (preferred when syllables exist). */
export function toNarrowPhones(
  phones: readonly NarrowPhoneIn[],
  options?: NarrowIpaOptions,
): NarrowPhoneOut[] {
  const { profile, darkL, stripFleeceLength } = resolveOptions(options);
  return phones.map((phone) => ({
    sound: remapSound(
      phone.sound,
      profile,
      stripFleeceLength,
      darkL,
      phone.slot,
    ),
    aspirated: phone.aspirated,
  }));
}

/**
 * Preferred Speak path: apply {@link remapSound} with the shared
 * {@link renderPronunciation} stress, separator and aspiration rules.
 */
export function toNarrowPronunciation(
  word: WordLike,
  options?: NarrowIpaOptions,
): string {
  const { profile, darkL, stripFleeceLength } = resolveOptions(options);
  return renderPronunciation(word.syllables, (phone, slot) =>
    remapSound(phone.sound, profile, stripFleeceLength, darkL, slot),
  );
}

function buildLexicon(profile: NarrowIpaProfile): readonly string[] {
  const glyphs = new Set<string>();
  for (const phone of phonemes) glyphs.add(phone.sound);
  for (const remap of profile.remaps) {
    glyphs.add(remap.from);
    glyphs.add(remap.to);
  }
  // Already-narrow / length / notation forms that may appear in orphan strings.
  for (const extra of ["ɹ", "oʊ", "ɝ", "ɫ", "ɚ", "iː", "ɡ"]) glyphs.add(extra);
  return Object.freeze(
    [...glyphs].sort((a, b) => b.length - a.length || a.localeCompare(b)),
  );
}

type StringToken =
  | { kind: "phone"; sound: string; aspirated: boolean }
  | { kind: "mark"; value: string };

function tokenizeIpaString(
  ipa: string,
  lexicon: readonly string[],
): StringToken[] {
  const tokens: StringToken[] = [];
  let i = 0;
  while (i < ipa.length) {
    const ch = ipa[i];
    if (ch === "ˈ" || ch === "ˌ" || ch === ".") {
      tokens.push({ kind: "mark", value: ch });
      i += 1;
      continue;
    }
    if (/\s/u.test(ch)) {
      tokens.push({ kind: "mark", value: ch });
      i += 1;
      continue;
    }

    let matched: string | null = null;
    for (const glyph of lexicon) {
      if (glyph.length > 0 && ipa.startsWith(glyph, i)) {
        matched = glyph;
        break;
      }
    }

    if (matched === null) {
      matched = String.fromCodePoint(ipa.codePointAt(i)!);
    }

    i += matched.length;
    let aspirated = false;
    if (ipa[i] === "ʰ") {
      aspirated = true;
      i += 1;
    }
    tokens.push({ kind: "phone", sound: matched, aspirated });
  }
  return tokens;
}

/**
 * String path for `Word.pronunciation` / demo IPA lines / orphan strings.
 * Longest-match replace on phone glyphs; preserves ˈ ˌ . and ʰ attachment.
 */
export function toNarrowIpa(ipa: string, options?: NarrowIpaOptions): string {
  if (!ipa || !ipa.trim()) return "";
  const normalized = ipa.normalize("NFC");
  const { profile, darkL, stripFleeceLength } = resolveOptions(options);
  // String mode never guesses coda /l/; darkL is a no-op without slots.
  void darkL;
  const lexicon = buildLexicon(profile);
  const tokens = tokenizeIpaString(normalized, lexicon);
  let out = "";
  for (const token of tokens) {
    if (token.kind === "mark") {
      out += token.value;
      continue;
    }
    const sound = remapSound(
      token.sound,
      profile,
      stripFleeceLength,
      false,
      undefined,
    );
    out += renderPhone(sound, token.aspirated);
  }
  return out;
}
