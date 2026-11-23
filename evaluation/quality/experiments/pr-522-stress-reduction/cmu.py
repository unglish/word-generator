import re, collections, json, sys
counts=collections.Counter()
for line in open(sys.argv[1]):
    entry, *phones = line.split('#', 1)[0].split()
    if not re.fullmatch('[a-z]+', entry): continue
    vowels = [p for p in phones if re.fullmatch('[A-Z]+[012]', p)]
    if len(vowels) < 2: continue
    counts['poly'] += 1
    final = vowels[-1]
    counts['final.'+final[-1]] += 1
    counts[final] += 1
    if final in {'EH0','AE0','AA0','AO0'}: counts['finalFull'] += 1
print(json.dumps(dict(sorted(counts.items())),indent=2))
