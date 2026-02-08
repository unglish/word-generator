"""
Sample 100 random words from CMU Pronouncing Dictionary and output as ARPABET.
Filters to single-pronunciation words with 1-4 syllables (common vocabulary).
Strips stress markers since UCI doesn't use them.
"""
import cmudict
import random
import json
import sys

def count_syllables(phones):
    """Count syllables by counting vowel phones (those ending in 0,1,2)."""
    return sum(1 for p in phones if p[-1].isdigit())

def strip_stress(phones):
    """Remove stress markers (0,1,2) from ARPABET symbols."""
    return [p.rstrip('012') for p in phones]

def main():
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 42
    random.seed(seed)
    
    d = cmudict.dict()
    
    # Filter: single pronunciation, 1-4 syllables, alphabetic only
    candidates = []
    for word, pronunciations in d.items():
        if len(pronunciations) != 1:  # skip ambiguous words
            continue
        phones = pronunciations[0]
        syls = count_syllables(phones)
        if 1 <= syls <= 4 and word.isalpha():
            candidates.append((word, strip_stress(phones)))
    
    sample = random.sample(candidates, min(100, len(candidates)))
    
    results = []
    for word, phones in sample:
        results.append({
            "word": word,
            "arpabet": " ".join(phones)
        })
    
    json.dump(results, sys.stdout, indent=2)
    print()

if __name__ == "__main__":
    main()
