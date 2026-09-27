"""Verify explicit English split-spelling examples against the pinned CMU source."""
import hashlib
import json
from pathlib import Path

SOURCE = Path('/private/tmp/q15-cmudict-74790861.dict')
SOURCE_SHA = '81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22'
# Explicit examples justify table entries; dictionary frequency never supplies weights.
EXAMPLES = {
    'eɪ': ('EY1', 'a', 'babe made safe lake male name cane tape face late save maze bathe paste range'),
    'i:': ('IY1', 'e', 'cede gene theme these eve'),
    'aɪ': ('AY1', 'i', 'time life like mile line pipe rice bite five size tithe'),
    'əʊ': ('OW1', 'o', 'robe code hope hole home bone note rose clothe'),
    'u': ('UW1', 'u', 'rude tube duke rule dune use flute huge'),
}
PHONES = {'B':'b', 'D':'d', 'F':'f', 'K':'k', 'L':'l', 'M':'m', 'N':'n',
          'P':'p', 'S':'s', 'T':'t', 'V':'v', 'Z':'z', 'DH':'ð', 'JH':'dʒ'}
raw = SOURCE.read_bytes()
if hashlib.sha256(raw).hexdigest() != SOURCE_SHA:
    raise ValueError('CMU source hash mismatch')
entries = {}
for line in raw.decode('utf8').splitlines():
    if not line or line.startswith(';;;'):
        continue
    fields = line.split()
    entries[fields[0]] = fields[1:]
rows = []
for sound, (nucleus, component, words) in EXAMPLES.items():
    for word in words.split():
        phones = entries[word]
        vowels = [p for p in phones if p[-1:].isdigit()]
        if vowels != [nucleus] or not word.endswith('e'):
            raise ValueError(f'Unexpected example: {word}')
        index = word.rfind(component, 0, len(word) - 1)
        coda = phones[phones.index(nucleus) + 1:]
        if index < 0 or not coda:
            raise ValueError(f'Missing split interval: {word}')
        rows.append({'vowel': {'sound': sound, 'component': component},
                     'codaSounds': [PHONES[p] for p in coda],
                     'codaWritten': word[index + 1:-1], 'marker': 'e',
                     'example': {'word': word, 'phones': phones}})
result = {
    'version': 1, 'sourcePath': str(SOURCE), 'sourceSha256': SOURCE_SHA,
    'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'rows': rows,
    'limits': [
        'Explicit attestations, not estimated probabilities or a complete English grammar.',
        'Dictionary pronunciation alone does not align letters; each written interval is an explicit proposed analysis.',
        'CMU American phones are mapped to existing generator identities without changing its dialect.',
        'Examples with /j/ retain that onset; u_e does not authorize adding a new phone.',
        'Before activation, each coda must also have complete live ownership and compatible configured readings.',
    ],
}
path = Path(__file__).with_name('coda-evidence.json')
path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(f'Verified {len(rows)} explicit examples against pinned source')
