import argparse
from collections import Counter, defaultdict
import hashlib
import json
import re
from pathlib import Path

ROOT_DIGEST = '2eacf788dd396e5207908c613d6689390e462d0488fa6e847606e08c124ce467'
VOWELS = {'AE': 'a', 'EH': 'e', 'IH': 'i', 'AH': 'u'}
CONSONANTS = dict(zip('B D F G L M N P S T'.split(), 'bdfglmnpst', strict=True))
VOWEL_GROUP = re.compile(r'[aeiouy]+')
CVC_WINDOWS = {
    (vowel, consonant): re.compile(fr'(?<![aeiouy]){vowel}({consonant}{{1,2}})(?=[aeiouy])')
    for vowel in VOWELS.values() for consonant in CONSONANTS.values()
}

def cmu_dictionary(path):
    seen = set()
    for line in path.read_text().splitlines():
        parts = line.split()
        if not parts:
            continue
        word, *tokens = parts
        if re.fullmatch('[a-z]+', word) and word not in seen:
            seen.add(word)
            tokens = tokens[:tokens.index('#')] if '#' in tokens else tokens
            yield {'spelling': word, 'tokens': tokens}

def measure(rows):
    rates = {'unique': defaultdict(Counter), 'ordinal': defaultdict(Counter)}
    roots_by_length = Counter()
    examples = defaultdict(list)
    unresolved = Counter()
    for row in rows:
        spelling, phones = row['spelling'], row['tokens']
        nuclei = [i for i, phone in enumerate(phones) if phone[-1:].isdigit()]
        if len(nuclei) < 2:
            continue
        groups = list(VOWEL_GROUP.finditer(spelling))
        phone_windows = defaultdict(list)
        for ordinal, (i, j) in enumerate(zip(nuclei, nuclei[1:])):
            left, right = phones[i], phones[j]
            if j != i + 2 or left[:-1] not in VOWELS or phones[i+1] not in CONSONANTS:
                continue
            v, c = VOWELS[left[:-1]], CONSONANTS[phones[i+1]]
            phone_windows[v, c].append((ordinal, left[-1], right[-1], right))
        length = str(len(nuclei)) if len(nuclei) < 4 else '4+'
        roots_by_length[length] += 1
        for (v, c), opportunities in phone_windows.items():
            matches = list(CVC_WINDOWS[v, c].finditer(spelling))
            for ordinal, left, right, right_phone in opportunities:
                if left == '0':
                    continue
                if not matches:
                    unresolved['no matching literal CVC'] += 1
                    continue
                keys = [
                    'all', 'by-left:' + left, 'by-right:' + right, 'by-length:' + length,
                    'by-letter:' + c, 'by-vowel:' + v, f'by-letter-and-right-stress:{c}:{right}',
                    f'by-vowel-and-right-stress:{v}:{right}',
                    f'by-last-syllable:{ordinal == len(nuclei) - 2}',
                    f'by-right-phone:{right_phone}', f'by-length-and-letter:{length}:{c}',
                    f'by-length-and-vowel:{length}:{v}', f'by-length-and-right-phone:{length}:{right_phone}',
                    f'by-left-position-within-length:{length}:{ordinal}',
                ]
                if right == '0':
                    first_two = not ordinal and len(nuclei) == 2
                    keys.extend([f'by-disyllabic-primary-first-with-unstressed-last:{first_two}'])
                methods = {}
                if len(opportunities) == len(matches) == 1:
                    methods['unique'] = matches[0]
                if len(groups) == len(nuclei):
                    for match in matches:
                        if match.start() == groups[ordinal].start() and match.end() == groups[ordinal+1].start():
                            methods['ordinal'] = match
                for method, match in methods.items():
                    doubling = len(match[1]) == 2
                    for key in keys:
                        rates[method][key]['eligible'] += 1
                        rates[method][key]['double'] += doubling
                    if method == 'ordinal' and len(examples[c, doubling]) < 8:
                        examples[c, doubling].append([spelling, phones, match.group(), left, right])
                if not methods:
                    unresolved['ambiguous anchoring'] += 1
    return {
        'rootsByLength': dict(roots_by_length),
        'counts': {
            m: {k: {'n': v['eligible'], 'doubles': v['double'], 'rate': round(100*v['double']/v['eligible'], 2)}
                for k, v in sorted(values.items())}
            for m, values in rates.items()
        },
        'examples': {f'{c}:{doubled}': words for (c, doubled), words in sorted(examples.items())},
        'unresolved': dict(unresolved),
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('root_reference', type=Path)
    parser.add_argument('--full', type=Path)
    args = parser.parse_args()
    reference = json.loads(args.root_reference.read_bytes())
    assert reference['digest'] == ROOT_DIGEST
    roots = reference['artifact']['roots']
    assert len(roots) == 21197 and len({r['spelling'] for r in roots}) == 21197
    result = {'referenceDigest': ROOT_DIGEST, 'root': measure(roots)}
    if args.full:
        assert hashlib.sha256(args.full.read_bytes()).hexdigest() == reference['artifact']['sources']['cmu']['sha256']
        all_rows = list(cmu_dictionary(args.full))
        result['full'] = measure(all_rows)
        included = {row['spelling'] for row in reference['artifact']['ledger'] if row['status'] == 'included'}
        assert len(included) == 43026
        result['commonIncludedSurfaces'] = measure(row for row in all_rows if row['spelling'] in included)
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
