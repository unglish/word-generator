"""Inventory retained silent-e edits; neither eligibility nor reading certification."""
import collections
import gzip
import hashlib
import json
from pathlib import Path
import sys

ARCHIVE = Path('/private/tmp/q13b-aligned-shared-graphemes-candidate-v1')
MANIFEST_SHA = '8fa4c8216beedf0d2803f18c2864ddbde1ea805af866071fac1c30ab34b1f876'
RULES = ('spellingRule:magic-e', 'silentE:swap', 'silentE:marker', 'silentE:append')


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify_archive(manifest):
    require(digest(ARCHIVE / 'manifest.json') == MANIFEST_SHA, 'manifest hash')
    for artifact in manifest['artifacts']:
        path = ARCHIVE
        for part in artifact['file'].split('/'):
            require(part not in ('', '.', '..'), 'artifact path')
            path = path / part
            require(not path.is_symlink(), 'artifact symlink')
        require(path.stat().st_size == artifact['bytes'], 'artifact size')
        require(digest(path) == artifact['sha256'], 'artifact hash')


def category(edit):
    return json.dumps({
        'rule': edit['rule'], 'phase': edit['phase'],
        'before': edit['before'], 'after': edit['after'],
        'inputOrigins': sorted(set(cell['origin']['kind'] for cell in edit['input'])),
    }, sort_keys=True, ensure_ascii=False)


def main():
    output = Path(sys.argv[1])
    script_hash = digest(Path(__file__))
    manifest = json.loads((ARCHIVE / 'manifest.json').read_text())['manifest']
    require(manifest['cohort'] == 'development', 'sealed cohort')
    verify_archive(manifest)
    counts = collections.Counter({rule: 0 for rule in RULES})
    groups = collections.Counter()
    witnesses = {}
    streams = []
    for profile in manifest['protocol']['profiles']:
        for seed in profile['seeds']['development']:
            path = ARCHIVE / f"words/{profile['id']}-{seed}.jsonl.gz"
            n = 0
            with gzip.open(path, 'rt', encoding='utf8') as source:
                for line in source:
                    row = json.loads(line)
                    require((row['profile'], row['seed'], row['drawIndex']) ==
                            (profile['id'], seed, n), 'coordinate order')
                    n += 1
                    base = row['word']['trace']['baseSpelling']
                    require(base['version'] == 4, 'expected control trace v4')
                    events = [edit for edit in base['edits'] if edit['rule'] in RULES]
                    counts['words'] += 1
                    counts['affectedWords'] += bool(events)
                    for edit in events:
                        counts[edit['rule']] += 1
                        key = category(edit)
                        groups[key] += 1
                        if key not in witnesses:
                            witnesses[key] = {
                                'coordinate': {k: row[k] for k in ('profile', 'seed', 'drawIndex')},
                                'editId': edit['id'], 'word': row['word'],
                            }
            require(n == manifest['protocol']['wordsPerReplicate'], 'stream cardinality')
            streams.append({'profile': profile['id'], 'seed': seed, 'words': n})
            print(profile['id'], seed, n, flush=True)
    verify_archive(manifest)
    require(script_hash == digest(Path(__file__)), 'script changed')
    result = {
        'version': 'q14a-retained-control-edits-v1',
        'manifestSha256': MANIFEST_SHA, 'scriptSha256': script_hash,
        'python': sys.version, 'streams': streams, 'counts': dict(counts),
        'groups': [{'category': json.loads(key), 'count': count,
                    'firstWitness': witnesses[key]} for key, count in sorted(groups.items())],
        'limits': [
            'Applied edits only; no reconstruction of failed draws or unexecuted opportunities.',
            'Input origin classes describe ancestry, not licensed pronunciation.',
            'No final morphological ownership, human preference or candidate improvement claim.',
        ],
    }
    with output.open('x') as target:
        json.dump(result, target, ensure_ascii=False)
        target.write('\n')
    print(json.dumps(counts, sort_keys=True))
    print('groups', len(groups), 'reportSha256', digest(output))


if __name__ == '__main__':
    main()
