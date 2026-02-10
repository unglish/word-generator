import { phonemes } from "../elements/phonemes.js";
import getWeightedOption from "../utils/getWeightedOption.js";
const aspirateSyllable = (position, context) => {
    const { word, syllableCount, rand } = context;
    const syllable = word.syllables[position];
    // Check if the syllable starts with a voiceless stop consonant
    const startsWithVoicelessStop = syllable.onset.length > 0 &&
        !syllable.onset[0].voiced &&
        syllable.onset[0].mannerOfArticulation === 'stop';
    if (!startsWithVoicelessStop) {
        return;
    }
    let shouldAspirate = false;
    // Don't aspirate if the previous syllable ends with 's'
    if (position > 0) {
        const prevSyllable = word.syllables[position - 1];
        if (prevSyllable.coda.length > 0 && prevSyllable.coda[prevSyllable.coda.length - 1].sound === 's') {
            shouldAspirate = getWeightedOption([[true, 5], [false, 95]], rand);
        }
    }
    // Word-initial position
    if (position === 0) {
        shouldAspirate = getWeightedOption([[true, 95], [false, 5]], rand);
    }
    // Stressed syllable
    else if (syllable.stress) {
        shouldAspirate = getWeightedOption([[true, 90], [false, 10]], rand);
    }
    // Word-medial position after a stressed syllable
    else if (position > 0 && word.syllables[position - 1].stress) {
        shouldAspirate = getWeightedOption([[true, 50], [false, 50]], rand);
    }
    // Word-final position
    else if (position === syllableCount - 1) {
        // Only aspirate if it's a single consonant in the coda
        if (syllable.coda.length === 1 &&
            !syllable.coda[0].voiced &&
            syllable.coda[0].mannerOfArticulation === 'stop') {
            shouldAspirate = getWeightedOption([[true, 15], [false, 85]], rand);
        }
        else {
            shouldAspirate = false;
        }
    }
    // Default case (unstressed, non-final syllables)
    else {
        shouldAspirate = getWeightedOption([[true, 30], [false, 70]], rand);
    }
    if (shouldAspirate) {
        if (position === syllableCount - 1 && syllable.coda.length === 1) {
            // Aspirate the coda for word-final position
            const aspiratedPhoneme = {
                ...syllable.coda[0],
                sound: syllable.coda[0].sound + 'ʰ'
            };
            syllable.coda[0] = aspiratedPhoneme;
        }
        else {
            // Aspirate the onset for all other positions
            const aspiratedPhoneme = {
                ...syllable.onset[0],
                sound: syllable.onset[0].sound + 'ʰ'
            };
            syllable.onset[0] = aspiratedPhoneme;
        }
    }
};
const applyStress = (context) => {
    const { rand } = context;
    // Rule 1: Primary stress 
    applyPrimaryStress(context, rand);
    // Rule 2: Secondary stress 
    applySecondaryStress(context, rand);
    // Rule 3: Rhythmic stress 
    applyRhythmicStress(context, rand);
};
const applyPrimaryStress = (context, rand) => {
    const { word } = context;
    const syllables = word.syllables;
    const syllableCount = syllables.length;
    let primaryStressIndex;
    if (syllableCount === 1) {
        // Monosyllabic words don't need stress marking
        return;
    }
    else if (syllableCount === 2) {
        // For disyllabic words, 70% chance on first syllable, 30% on second
        primaryStressIndex = getWeightedOption([[0, 70], [1, 30]], rand);
    }
    else {
        const penultimateHeavy = isHeavySyllable(syllables[syllableCount - 2]);
        primaryStressIndex = getWeightedOption([
            [syllableCount - 2, penultimateHeavy ? 70 : 30],
            [syllableCount - 3, penultimateHeavy ? 20 : 60],
            [0, 10]
        ], rand);
    }
    syllables[primaryStressIndex].stress = 'ˈ';
};
const applySecondaryStress = (context, rand) => {
    const { word } = context;
    const syllables = word.syllables;
    const syllableCount = syllables.length;
    if (syllableCount === 1)
        return;
    const primaryStressIndex = syllables.findIndex(s => s.stress === 'ˈ');
    const potentialIndices = [0, 1, 2].filter(i => i !== primaryStressIndex && i <= syllableCount - 1);
    const secondaryStressIndex = getWeightedOption(potentialIndices.map(i => [i, isHeavySyllable(syllables[i]) ? 70 : 30]), rand);
    if (getWeightedOption([[true, 40], [false, 60]], rand)) {
        syllables[secondaryStressIndex].stress = 'ˌ';
    }
};
const applyRhythmicStress = (context, rand) => {
    const { word } = context;
    const syllables = word.syllables;
    for (let i = 1; i < syllables.length - 1; i++) {
        if (!syllables[i - 1].stress && !syllables[i].stress && !syllables[i + 1].stress) {
            if (getWeightedOption([[true, 40], [false, 60]], rand)) {
                syllables[i].stress = 'ˌ';
            }
        }
    }
};
const isHeavySyllable = (syllable) => {
    return syllable.nucleus.length > 1 || syllable.coda.length > 0;
};
const buildPronunciationGuide = (context) => {
    const { word } = context;
    let pronunciationGuide = '';
    word.syllables.forEach((syllable, index) => {
        const onset = syllable.onset.map((phoneme) => phoneme.sound).join('');
        const nucleus = syllable.nucleus.map((phoneme) => phoneme.sound).join('');
        const coda = syllable.coda.map((phoneme) => phoneme.sound).join('');
        let syllablePronunciation = `${onset}${nucleus}${coda}`;
        // Add stress marker if the syllable is stressed
        if (syllable.stress === 'ˈ') {
            syllablePronunciation = `ˈ${syllablePronunciation}`;
        }
        else if (syllable.stress === 'ˌ') {
            syllablePronunciation = `ˌ${syllablePronunciation}`;
        }
        else if (index > 0) {
            syllablePronunciation = `.${syllablePronunciation}`;
        }
        pronunciationGuide += syllablePronunciation;
    });
    word.pronunciation = pronunciationGuide;
};
/**
 * Post-generation pass: reduce vowels in unstressed syllables.
 *
 * Only vowels with a matching rule in the config are candidates.
 * Tense vowels are skipped. Per-rule target and probability are used,
 * modified by syllable position and secondary stress settings.
 */
const reduceUnstressedVowels = (context, config, rand) => {
    const { word } = context;
    const syllables = word.syllables;
    // Monosyllabic words don't reduce
    if (syllables.length <= 1)
        return;
    // Build a lookup map for rules by source sound
    const ruleMap = new Map(config.rules.map((r) => [r.source, r]));
    for (let si = 0; si < syllables.length; si++) {
        const syllable = syllables[si];
        // Primary-stressed syllables never reduce
        if (syllable.stress === "ˈ")
            continue;
        // Secondary-stressed syllables: only reduce if config allows
        if (syllable.stress === "ˌ") {
            if (!config.reduceSecondaryStress)
                continue;
        }
        // Determine positional modifier
        let positionalMod = 1.0;
        if (config.positionalModifiers) {
            if (si === 0) {
                positionalMod = config.positionalModifiers.wordInitial ?? 1.0;
            }
            else if (si === syllables.length - 1) {
                positionalMod = config.positionalModifiers.wordFinal ?? 1.0;
            }
            else {
                positionalMod = config.positionalModifiers.wordMedial ?? 1.0;
            }
        }
        for (let i = 0; i < syllable.nucleus.length; i++) {
            const vowel = syllable.nucleus[i];
            // Skip tense vowels — they resist reduction
            if (vowel.tense)
                continue;
            // Look up rule; if not found, vowel is immune
            const rule = ruleMap.get(vowel.sound);
            if (!rule)
                continue;
            // Compute effective probability
            let prob = rule.probability * positionalMod;
            if (syllable.stress === "ˌ" && config.secondaryStressProbability != null) {
                prob = prob * (config.secondaryStressProbability / 100);
            }
            prob = Math.min(100, Math.max(0, Math.round(prob)));
            // Find target phoneme from inventory
            const target = phonemes.find((p) => p.sound === rule.target);
            if (!target)
                continue;
            if (getWeightedOption([[true, prob], [false, 100 - prob]], rand)) {
                syllable.nucleus[i] = { ...target, reduced: true };
            }
        }
    }
};
export const generatePronunciation = (context, vowelReduction) => {
    const syllables = context.word.syllables;
    for (let i = 0; i < syllables.length; i++) {
        aspirateSyllable(i, context);
    }
    applyStress(context);
    if (vowelReduction?.enabled) {
        reduceUnstressedVowels(context, vowelReduction, context.rand);
    }
    buildPronunciationGuide(context);
};
