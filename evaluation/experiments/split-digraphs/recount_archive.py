"""Read-only independent archive recount; explicit manifest and analysis seal hashes are required."""
import argparse
import gzip
import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path
from recount_completion import require, recount_completion
from recount_structure import recount_structure
from recount_root import recount_root


def digest(path):
    result = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(chunk)
    return result.hexdigest()


def artifact(root, name):
    pieces = name.split('/')
    require(all(piece and piece not in ('.', '..') for piece in pieces), 'unsafe artifact path')
    require(root.is_dir() and not root.is_symlink(), 'aliased archive root')
    path = root
    for piece in pieces:
        path = path / piece
        require(not path.is_symlink(), 'aliased artifact')
    require(path.is_file(), 'missing artifact')
    return path


def verify_files(root, records):
    require(len({record['file'] for record in records}) == len(records), 'duplicate artifact')
    for record in records:
        path = artifact(root, record['file'])
        require(path.stat().st_size == record['bytes'] and digest(path) == record['sha256'], 'artifact hash mismatch')


def read_rows(path):
    with gzip.open(path, 'rt', encoding='utf8') as stream:
        for line in stream:
            require(line.endswith('\n') and line.strip(), 'malformed row boundary')
            yield json.loads(line)


def recount_archive(archive, analysis, manifest_sha, seal_sha):
    manifest_path = artifact(archive, 'manifest.json'); seal_path = artifact(analysis, 'complete.json')
    require(digest(manifest_path) == manifest_sha and digest(seal_path) == seal_sha, 'wrong external authority')
    manifest = json.loads(manifest_path.read_text())['manifest']; seal = json.loads(seal_path.read_text())
    require(manifest['cohort'] == 'development', 'validation remains sealed')
    require(seal['passed'] is True and seal['manifestSha256'] == manifest_sha, 'analysis not completed for this archive')
    verify_files(archive, manifest['artifacts']); verify_files(analysis, seal['artifacts'])
    sealed_names = {entry['file'] for entry in seal['artifacts']}
    require({'authority.json.gz', 'report.json'}.issubset(sealed_names), 'missing sealed analysis authority')
    config = manifest['generator']['effectiveConfig']
    with gzip.open(artifact(analysis, 'authority.json.gz'), 'rt') as stream:
        require(json.load(stream)['configuration'] == config, 'analysis configuration mismatch')
    tool_pins = {path.name: digest(path) for path in Path(__file__).parent.glob('recount_*.py')}
    totals = Counter(); streams = []; comparisons = 0; words = 0; expected = []
    for profile in manifest['protocol']['profiles']:
        for seed in profile['seeds']['development']:
            stem = f"{profile['id']}-{seed}.jsonl.gz"; expected.append('words/' + stem)
            require('observations/' + stem in sealed_names, 'unsealed observations')
            count = 0; subtotal = Counter()
            archive_rows = read_rows(artifact(archive, 'words/' + stem))
            observations = read_rows(artifact(analysis, 'observations/' + stem))
            for row, observation in itertools.zip_longest(archive_rows, observations):
                require(row is not None and observation is not None, 'row cardinality mismatch')
                for key, value in [('profile', profile['id']), ('seed', seed), ('drawIndex', count)]:
                    require(row[key] == observation[key] == value, 'coordinate mismatch')
                trace = row['word']['trace']['baseSpelling']; production = observation['counts']
                counted = {'words': 1, 'phones': len(trace['phones']),
                           'rootNuclei': sum(phone['segment'] == 'nucleus' for phone in trace['phones']),
                           'unresolvedCells': sum(cell['origin']['kind'] == 'rewrite' for cell in trace['cells'])}
                counted.update(recount_root(trace, config))
                for status in ['unavailable', 'unresolved', 'not-target', 'satisfied', 'satisfied:split', 'satisfied:open']:
                    if trace['version'] in (4, 5):
                        counted.setdefault('finalRoot:' + status, 0)
                if trace['version'] == 5:
                    counted.update(recount_structure(trace, config['splitVowels']['supports']))
                    sampled = recount_completion(trace)
                    for source, target in [('attempts', 'completionAttempts'), ('candidates', 'completionProposals'),
                                           ('draws', 'completionDraws'), ('selected', 'completionReplacements'), ('infeasible', 'completion:infeasible')]:
                        counted[target] = sampled[source]
                    counted['formationAttempts'] = len(trace['split']['attempts'])
                else:
                    counted['formationEligibilityUnavailableWords'] = 1
                for key, value in counted.items():
                    require(value == production.get(key, 0), f"count mismatch {profile['id']} {seed} {count} {key}")
                    comparisons += 1
                subtotal.update(counted); totals.update(counted); count += 1; words += 1
            require(count == manifest['protocol']['wordsPerReplicate'], 'incomplete stream')
            streams.append(dict(profile=profile['id'], seed=seed, words=count, counts=dict(subtotal)))
    require(sorted(expected) == sorted(entry['file'] for entry in manifest['artifacts'] if entry['file'].startswith('words/')), 'extra source streams')
    require(words == seal['words'], 'analysis word count mismatch')
    report = json.loads(artifact(analysis, 'report.json').read_text())
    all_groups = [group for group in report['groups'] if group['dimensions'] == ['all']]
    require(len(all_groups) == 1, 'missing overall group')
    for key, value in totals.items():
        require(value == all_groups[0]['counts'].get(key, 0), 'aggregate mismatch ' + key); comparisons += 1
    verify_files(archive, manifest['artifacts']); verify_files(analysis, seal['artifacts'])
    require(digest(manifest_path) == manifest_sha and digest(seal_path) == seal_sha, 'authority changed')
    require(tool_pins == {path.name: digest(path) for path in Path(__file__).parent.glob('recount_*.py')}, 'recount sources changed')
    return dict(version='q14a-independent-recount-v1', words=words, integerComparisons=comparisons,
                counts=dict(totals), streams=streams, manifestSha256=manifest_sha, analysisSealSha256=seal_sha,
                tools=tool_pins, scope='Independent count, arithmetic, structure and final-root checks; production verifier authenticates eligibility and prior semantic licenses.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for name in ['archive', 'analysis', 'manifest-sha256', 'analysis-sha256', 'out']:
        parser.add_argument('--' + name, required=True)
    args = parser.parse_args()
    result = recount_archive(Path(args.archive), Path(args.analysis), args.manifest_sha256, args.analysis_sha256)
    with open(args.out, 'x') as output:
        json.dump(result, output, indent=2); output.write('\n')
    print(json.dumps({'words': result['words'], 'integerComparisons': result['integerComparisons']}))
