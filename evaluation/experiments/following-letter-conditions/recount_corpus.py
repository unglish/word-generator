"""Independent corpus accounting. Producer seal authenticates prior semantic replay."""
import gzip
import hashlib
import itertools
import json
import sys
from collections import Counter
from pathlib import Path
from recount_following import compare


def digest(path):
    result = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(block)
    return result.hexdigest()


def artifact(root, record):
    path = root / record['file']
    if path.is_symlink() or not path.is_file() or root.resolve() not in path.resolve().parents:
        raise ValueError('nonregular or escaped artifact')
    if path.stat().st_size != record['bytes'] or digest(path) != record['sha256']:
        raise ValueError('artifact digest mismatch: ' + record['file'])
    return path


def rows(path):
    with gzip.open(path, 'rt') as stream:
        for line in stream:
            if not line.endswith('\n') or not line.strip():
                raise ValueError('incomplete/empty archive row')
            yield json.loads(line)


def dimensions(row):
    word = row['word']
    morphology = word['trace'].get('morphology')
    affixes = []
    for role in ('prefix', 'suffix'):
        resolved = (morphology or {}).get('realization', {}).get(role, {}).get('resolved')
        affixes.append([resolved['written'], resolved['phonemes']] if resolved else None)
    prefix, suffix = affixes
    shape = ('prefix' if prefix else 'none') + '/' + ('suffix' if suffix else 'none')
    profile = row['profile']
    syllables = len(word['syllables'])
    return [['all'], ['profile', profile], ['stream', profile, row['seed']],
            ['syllables', profile, syllables], ['morphology', profile, shape],
            ['syllables-morphology', profile, syllables, shape], ['resolved-affixes', profile, prefix, suffix],
            ['written-length', profile, len(word['written']['clean'])],
            ['root-phone-length', profile, len(word['trace']['baseSpelling']['phones'])]]


def main():
    archive, analysis = map(Path, sys.argv[1:3])
    manifest_hash, complete_hash = sys.argv[3:5]
    if digest(archive / 'manifest.json') != manifest_hash or digest(analysis / 'complete.json') != complete_hash:
        raise ValueError('wrong pinned authority')
    manifest = json.loads((archive / 'manifest.json').read_text())['manifest']
    complete = json.loads((analysis / 'complete.json').read_text())
    if manifest['cohort'] != 'development' or complete.get('passed') is not True or complete['manifestSha256'] != manifest_hash:
        raise ValueError('wrong cohort or incomplete production analysis')
    archive_files = {entry['file']: artifact(archive, entry) for entry in manifest['artifacts']}
    output_files = {entry['file']: artifact(analysis, entry) for entry in complete['artifacts']}
    if len(archive_files) != len(manifest['artifacts']) or len(output_files) != len(complete['artifacts']):
        raise ValueError('duplicate artifact')
    authority = json.load(gzip.open(output_files['authority.json.gz'], 'rt'))
    config = authority['configuration']
    if config != manifest['generator']['effectiveConfig']:
        raise ValueError('configuration mismatch')
    expected_streams = set()
    groups = {}
    words = events = integers = 0
    for profile in manifest['protocol']['profiles']:
        for seed in profile['seeds']['development']:
            name = f"{profile['id']}-{seed}.jsonl.gz"
            expected_streams.add('words/' + name)
            stream_words = 0
            for draw, observation in itertools.zip_longest(rows(archive_files['words/' + name]), rows(output_files['observations/' + name])):
                if draw is None or observation is None:
                    raise ValueError('stream cardinality mismatch')
                for record in (draw, observation):
                    if (record['profile'], record['seed'], record['drawIndex']) != (profile['id'], seed, stream_words):
                        raise ValueError('stream coordinate mismatch')
                checked_events, checked_integers = compare(draw['word'], config, observation)
                for group in dimensions(draw):
                    key = json.dumps(group, ensure_ascii=False, separators=(',', ':'))
                    groups.setdefault(key, Counter()).update(observation['counts'])
                events += checked_events
                integers += checked_integers
                words += 1
                stream_words += 1
            if stream_words != manifest['protocol']['wordsPerReplicate']:
                raise ValueError('incomplete stream')
    if {name for name in archive_files if name.startswith('words/')} != expected_streams:
        raise ValueError('extra archive stream')
    if {name for name in output_files if name.startswith('observations/')} != {name.replace('words/', 'observations/', 1) for name in expected_streams}:
        raise ValueError('extra observation stream')
    report = json.loads(output_files['report.json'].read_text())
    if words != report['words'] or words != complete['words'] or len(report['groups']) != len(groups):
        raise ValueError('report population mismatch')
    seen = set()
    for group in report['groups']:
        key = json.dumps(group['dimensions'], ensure_ascii=False, separators=(',', ':'))
        if key in seen or key not in groups or dict(groups[key]) != group['counts']:
            raise ValueError('group accounting mismatch')
        seen.add(key)
    for entry in manifest['artifacts']:
        artifact(archive, entry)
    for entry in complete['artifacts']:
        artifact(analysis, entry)
    if digest(archive / 'manifest.json') != manifest_hash or digest(analysis / 'complete.json') != complete_hash:
        raise ValueError('authority changed during recount')
    print(json.dumps(dict(passed=True, words=words, events=events, integerComparisons=integers,
                         groups=len(groups), manifestSha256=manifest_hash, completeSha256=complete_hash,
                         scope='independent per-word events except refusal text, all count groups; prior semantic licenses remain producer-authenticated; diagnostic eventCounts are not independently certified'), indent=2))


if __name__ == '__main__':
    main()
