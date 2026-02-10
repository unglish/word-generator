/** Type-safe accessor for a phoneme's positional weight (onset / nucleus / coda). */
export function getPhonemePositionWeight(p, position) {
    switch (position) {
        case 'onset': return p.onset;
        case 'nucleus': return p.nucleus;
        case 'coda': return p.coda;
    }
}
