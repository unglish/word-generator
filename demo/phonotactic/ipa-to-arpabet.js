/**
 * Maps IPA phoneme symbols (as used by the word generator) to ARPABET symbols
 * (as used by the CMU Pronouncing Dictionary bigram table).
 *
 * The generator stores phonemes as `Phoneme.sound` strings which may include
 * diacritics like aspiration (ʰ) and stress markers (ˈ, ˌ). This module
 * strips those before mapping.
 *
 * Each phoneme arrives pre-segmented from the generator, so matching is a
 * direct lookup — no substring/greedy parsing required.
 */
const IPA_TO_ARPABET = {
    // Triphthongs
    'aɪə': 'AY ER',
    'aʊə': 'AW ER',
    'eɪə': 'EY ER',
    'ɔɪə': 'OY ER',
    'əʊə': 'OW ER',
    // Diphthongs
    'eɪ': 'EY',
    'ɪə': 'IH R',
    'eə': 'EH R',
    'aɪ': 'AY',
    'ʊə': 'UH R',
    'əʊ': 'OW',
    'ɔɪ': 'OY',
    'aʊ': 'AW',
    // Affricates
    'tʃ': 'CH',
    'dʒ': 'JH',
    // Vowels
    'i:': 'IY',
    'ɪ': 'IH',
    'e': 'EH',
    'ɛ': 'EH',
    'ə': 'AH',
    'ɜ': 'ER',
    'ɚ': 'ER',
    'æ': 'AE',
    'ɑ': 'AA',
    'ɔ': 'AO',
    'o': 'OW',
    'ʊ': 'UH',
    'u': 'UW',
    'ʌ': 'AH',
    // Consonants
    'j': 'Y',
    'w': 'W',
    'l': 'L',
    'r': 'R',
    'm': 'M',
    'n': 'N',
    'ŋ': 'NG',
    'f': 'F',
    'θ': 'TH',
    'h': 'HH',
    'v': 'V',
    'ð': 'DH',
    'z': 'Z',
    'ʒ': 'ZH',
    's': 'S',
    'ʃ': 'SH',
    'p': 'P',
    't': 'T',
    'k': 'K',
    'b': 'B',
    'd': 'D',
    'g': 'G',
};
/**
 * Strip diacritics/modifiers from an IPA sound string.
 * Removes aspiration marker (ʰ) since ARPABET doesn't encode it.
 */
function stripDiacritics(sound) {
    return sound.replace(/ʰ/g, '');
}
/**
 * Convert a single IPA phoneme sound string to ARPABET.
 * Returns null if no mapping is found.
 */
export function ipaToArpabet(ipaSound) {
    return IPA_TO_ARPABET[stripDiacritics(ipaSound)] ?? null;
}
/**
 * Convert an array of Phoneme objects to a space-separated ARPABET string.
 */
export function phonemesToArpabet(phonemes) {
    return phonemes
        .map(p => ipaToArpabet(p.sound))
        .filter((a) => a !== null)
        .join(' ');
}
/**
 * Convert a Word's syllables to a single space-separated ARPABET string.
 * Stress markers and syllable boundaries are stripped.
 */
export function wordToArpabet(word) {
    const allPhonemes = [];
    for (const syl of word.syllables) {
        allPhonemes.push(...syl.onset, ...syl.nucleus, ...syl.coda);
    }
    return phonemesToArpabet(allPhonemes);
}
