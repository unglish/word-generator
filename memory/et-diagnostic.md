# ET Bigram Diagnostic

**Date**: 2026-02-15  
**Issue**: #162 (distribution gap analysis)  
**Bigram**: ET  
**Over-representation**: 6× (1.1% English → 6.6% generated)

## Methodology

Generated 10,000-word sample, traced all "et" bigrams to phoneme→grapheme mappings, categorized by linguistic pattern.

## Results

Total ET occurrences: 704/10,000 (7.04%)  
Scaled to 200k: ~14,080 (actual: 13,220)

### Breakdown by Root Cause

| Category | Count | % | Description |
|----------|-------|---|-------------|
| **schwa_plus_t** | 232 | 33.0% | /ə/ → "e" + /t/ coda |
| **e_plus_t_coda** | 209 | 29.7% | /e/ or /ɛ/ → "e" + /t/ coda |
| **magic_e** | 143 | 20.3% | Digraphs (ie/ee/ue) before /t/ |
| **centering_diphthong** | 74 | 10.5% | /ɪə/, /ʊə/, /eə/ → e-ending graphemes |
| **other** | 46 | 6.5% | Word-initial /ɛ/ → "e", misc |

## Analysis

### 1. Schwa + /t/ (33%)

**Examples**: het /hət/, demmetreneck /dɜˈmɛˌtʰrɪ.nək/

**Root cause**: /ə/ → "e" is the only schwa grapheme in unstressed syllables. When /t/ appears in the coda, "et" is inevitable.

**English comparison**: English has alternative schwa spellings:
- "a" in "about" /əˈbaʊt/
- "o" in "gallon" /ˈgælən/
- "u" in "lettuce" /ˈlɛtəs/
- "i" in "pencil" /ˈpɛnsəl/

**Proposed fix**: Add schwa grapheme variants `{ sound: "ə", grapheme: "a", ... }`, `{ sound: "ə", grapheme: "o", ... }` with position/context conditioning.

### 2. /e/ or /ɛ/ + /t/ (29.7%)

**Examples**: net /nɛt/, foticketenge /fʌˌtʰɪˈkɛ.ti:ŋ/

**Root cause**: /e/ and /ɛ/ both map heavily to "e" grapheme, and /t/ is a common coda consonant. High /t/ frequency × high "e" frequency = high "et" frequency.

**English comparison**: English uses "a" for /ɛ/ in many contexts:
- "cat" /kæt/ (though this is /æ/, not /ɛ/)
- Regional variations blur /ɛ/ and /æ/

**Proposed fix**: 
- Add /ɛ/ → "a" grapheme (low frequency, position-conditioned)
- Consider boosting "ai" for /e/ (currently underused)

### 3. Magic-e Digraphs (20.3%)

**Examples**: uetioths /ˈʊəˌtʰaɪəθs/, mietethayn /ˈmaɪ.tə.ðeɪn/

**Root cause**: Digraphs "ie", "ee", "ue" are common graphemes for various vowels. When /t/ follows, we get "iet", "eet", "uet" sequences.

**English comparison**: English has these (meet, quiet, duet), so this may not be wrong per se, but the frequency is high.

**Proposed fix**: 
- Position-condition these digraphs away from pre-/t/ contexts when alternative graphemes exist
- E.g., /aɪ/ → "i_e" (magic-e) instead of "ie" before /t/

### 4. Centering Diphthongs (10.5%)

**Examples**: thetowdia /ðɛˈtəʊ.daɪə/, thactwetruetog /ˈðeɪk.tʰwəˌtʰrʊə.təʊgʰ/

**Root cause**: /ɪə/ → "ee", /ʊə/ → "ue", /eə/ → "ai" all use "e" in their graphemes. When followed by /t/, we get "eet", "uet", "et".

**English comparison**: English uses "ear", "eer", "ure" for these sounds.

**Proposed fix**: Add multi-grapheme options for centering diphthongs that don't end in bare "e".

## Recommendations

### High Priority
1. **Add schwa allographs**: /ə/ → "a", "o", "u", "i" with context conditioning (syllable position, preceding sound)
2. **Suppress /ɛ/ → "e" before /t/**: Add `notRightContext: ["t"]` or boost alternative graphemes

### Medium Priority
3. **Position-condition magic-e digraphs**: Bias against "ie"/"ee"/"ue" before /t/ codas
4. **Add /ɛ/ → "a" grapheme**: Low-frequency alternative for /ɛ/

### Low Priority
5. **Centering diphthong grapheme expansion**: Add "ear", "ure" variants

## Expected Impact

- **Schwa variants**: Could reduce "et" by ~30% (232 instances)
- **/ɛ/→"a" + suppression**: Could reduce by ~20% (140 instances)
- **Magic-e conditioning**: Could reduce by ~10% (70 instances)

**Combined potential**: ~442/704 instances (62% reduction)  
**New "et" rate**: 2.7% (vs. current 6.6%, target ~1.1%)

---

**Next step**: Prototype schwa allograph implementation.
