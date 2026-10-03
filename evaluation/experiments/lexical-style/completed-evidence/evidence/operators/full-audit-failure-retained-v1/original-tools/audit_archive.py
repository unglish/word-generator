"""Full independent Q20 law/lineage audit with explicit development preflight."""
from collections import Counter
import gzip
import hashlib
import json
import math
from pathlib import Path
import platform
import subprocess
import sys

from feature_lineage import verify_feature_lineage
from independent_model import SpellingLaw, verify_word_law

BASE = Path(__file__).parent
BINDING = BASE.parent / 'capture-tools/execution-registration.json'


def pin(path):
    digest, size = hashlib.sha256(), 0
    assert path.is_file()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block); size += len(block)
    return {'bytes': size, 'sha256': digest.hexdigest()}


def strip_assessments(value):
    if isinstance(value, list):
        return [strip_assessments(item) for item in value]
    if isinstance(value, dict):
        return {key: strip_assessments(item) for key, item in value.items() if key != 'originAssessment'}
    return value


def authenticate_tree(root, records, prefix=''):
    result = {}
    for name, expected in records.items():
        relative = prefix + name
        if 'sha256' in expected and 'bytes' in expected:
            assert pin(root / relative) == expected, relative
            result[relative] = expected
        else:
            result.update(authenticate_tree(root, expected, relative + '/'))
    return result


def source_identity(root, commit, frozen):
    git = lambda *args: subprocess.check_output(['git', *args], cwd=root, text=True).strip()
    assert git('rev-parse', 'HEAD') == commit
    assert git('status', '--porcelain', '--untracked-files=no') == ''
    files = authenticate_tree(root, frozen['files'])
    dependency_files = {}
    for package in frozen['dependencies']['packages'].values():
        for record in package['files'].values():
            path = Path(record['path']); expected = {'bytes': record['bytes'], 'sha256': record['sha256']}
            assert pin(path) == expected
            dependency_files[str(path)] = expected
    return {'commit': commit, 'files': files, 'recordedDependencyFiles': dependency_files}


def execute(arm, policy, preflight):
    assert arm in ['control', 'candidate'] and policy in ['default', 'active']
    binding = json.loads(BINDING.read_bytes())
    archive = Path(binding['controlArchives'][policy]['path'] if arm == 'control' else f'/private/tmp/q20-candidate-{policy}-v1')
    root = Path(binding[arm + 'Root']); commit = binding[arm + 'Commit']
    label = 'preflight' if preflight else 'independent'
    out = Path(f'/private/tmp/q20-{arm}-{policy}-{label}-v1')
    out.mkdir()
    completed, coordinate = 0, None
    def save(name, value):
        with (out / name).open('x') as stream:
            stream.write(json.dumps(value, indent=2, allow_nan=False) + '\n')
    try:
        seal_path, frozen_path = Path(str(archive) + '-freeze/complete.json'), Path(str(archive) + '-freeze/before.json')
        seal, frozen = json.loads(seal_path.read_bytes()), json.loads(frozen_path.read_bytes())
        assert seal['passed'] is True and seal['words'] == 200000 and seal['beforeSha256'] == pin(frozen_path)['sha256']
        assert frozen['before'] == seal['after'] and frozen['policy'] == policy
        assert pin(archive / 'manifest.json') == seal['manifest']
        manifest = json.loads((archive / 'manifest.json').read_bytes())['manifest']
        assert manifest['generator']['commit'] == commit and manifest['generator']['dirty'] is False
        assert manifest['generator']['patch'] == '' and manifest['cohort'] == 'development'
        if arm == 'candidate':
            assert frozen['binding'] == binding and frozen['before']['binding'] == pin(BINDING)
            assert seal['candidateCommit'] == commit and frozen['binding']['candidateRoot'] == str(root)
            frozen_source = frozen['before']['candidate']
        else:
            assert frozen['root'] == str(root) and frozen['arm'] == 'composed-control' and frozen['expectedCommit'] == commit
            assert pin(archive / 'manifest.json') == binding['controlArchives'][policy]['manifest']
            assert pin(seal_path) == binding['controlArchives'][policy]['seal']
            frozen_source = frozen['before']
        for record in [binding['preimplementation'], binding['protocol'], binding['activePolicy']]:
            assert pin(Path(binding['candidateRoot']) / record['path']) == record['pin']
        protocol = json.loads((root / binding['protocol']['path']).read_bytes())
        assert manifest['protocol'] == protocol and protocol['wordsPerReplicate'] == 10000
        assert len(protocol['profiles']) == 4 and all(len(profile['seeds']['development']) == 5 for profile in protocol['profiles'])
        baseline_path = Path(binding['controlArchives'][policy]['path']) / 'manifest.json'
        assert pin(baseline_path) == binding['controlArchives'][policy]['manifest']
        baseline = json.loads(baseline_path.read_bytes())['manifest']
        config = manifest['generator']['effectiveConfig']
        config_base = {key: value for key, value in config.items() if key != 'lexicalStyle'}
        assert strip_assessments(config_base) == baseline['generator']['effectiveConfig']
        profile = json.loads((Path(binding['candidateRoot']) / binding['preimplementation']['path']).read_bytes())['profile']
        candidate_config = json.loads(Path('/private/tmp/q20-independent-fixture-capture-v1/default-config.json').read_bytes())
        features = candidate_config['lexicalStyle']['policy']['features']
        assert candidate_config['lexicalStyle']['id'] == profile['id']
        assert candidate_config['lexicalStyle']['policy']['strength'] == profile['strength']
        assert [{'phoneme': feature['phoneme'], 'form': feature['form'], 'multipliers':
                 {item['style_id']: item['multiplier'] for item in feature['associations']}} for feature in features] == profile['features']
        if arm == 'candidate':
            assert config['lexicalStyle'] == candidate_config['lexicalStyle']
        else:
            assert 'lexicalStyle' not in config
        law = SpellingLaw(config, features)
        artifacts = {record['file']: {'bytes': record['bytes'], 'sha256': record['sha256']} for record in manifest['artifacts']}
        assert len(artifacts) == len(manifest['artifacts'])
        expected_files = {f"words/{p['id']}-{seed}.jsonl.gz" for p in protocol['profiles'] for seed in p['seeds']['development']}
        assert len(expected_files) == 20 and {name for name in artifacts if name.startswith('words/')} == expected_files
        assert {str(path.relative_to(archive)) for path in (archive / 'words').rglob('*') if path.is_file()} == expected_files
        def snapshot():
            return {'source': source_identity(root, commit, frozen_source), 'manifest': pin(archive / 'manifest.json'),
                'seal': pin(seal_path), 'frozen': pin(frozen_path), 'binding': pin(BINDING), 'baselineManifest': pin(baseline_path),
                'fixtureConfiguration': pin(Path('/private/tmp/q20-independent-fixture-capture-v1/default-config.json')),
                'tools': {path.name: pin(path) for path in sorted(BASE.iterdir()) if path.is_file()},
                'python': sys.version, 'platform': platform.platform(), 'executable': pin(Path(sys.executable).resolve())}
        before = snapshot(); save('before.json', before)
        def authenticate_artifacts():
            for name, expected in artifacts.items():
                assert not Path(name).is_absolute() and '..' not in Path(name).parts
                assert pin(archive / name) == expected, name
        if not preflight:
            authenticate_artifacts()
        totals, groups, census = Counter(), {}, {}
        for profile in protocol['profiles']:
            census[profile['id']] = Counter()
            for seed in profile['seeds']['development']:
                group = f"{profile['id']}/{seed}"
                counts, rows = Counter(), 0
                with gzip.open(archive / f"words/{profile['id']}-{seed}.jsonl.gz", 'rt') as stream:
                    for index, line in enumerate(stream):
                        if preflight and index == 10:
                            break
                        coordinate = (profile['id'], seed, index)
                        row = json.loads(line)
                        assert row['profile'] == profile['id'] and row['seed'] == seed and row['drawIndex'] == index
                        observed = verify_word_law(law, row['word'])
                        observed.update(verify_feature_lineage(law, row['word']))
                        counts.update(observed)
                        style = row['word']['trace'].get('lexicalStyle', {}).get('style_id', 'omitted')
                        groups.setdefault(group + '/style/' + style, Counter()).update(observed)
                        census[profile['id']][row['word']['written']['clean']] += 1
                        rows += 1; completed += 1
                assert rows == (10 if preflight else 10000)
                groups[group] = counts; totals.update(counts)
                print(f'{arm}/{policy}/{group}: {rows} words independently reconstructed', flush=True)
        assert completed == (200 if preflight else 200000)
        if not preflight:
            authenticate_artifacts()
        after = snapshot(); assert before == after
        save('census.json', {profile: dict(sorted(values.items())) for profile, values in census.items()})
        diversity = {}
        for name, values in census.items():
            n = sum(values.values())
            diversity[name] = {'words': n, 'unique': len(values), 'uniqueRatio': len(values) / n,
                'shannonEntropyBits': -sum(amount / n * math.log2(amount / n) for amount in values.values())}
        save('complete.json', {'passed': True, 'preflight': preflight, 'arm': arm, 'policy': policy, 'words': completed,
            'streams': 20, 'sourceCommit': commit, 'manifest': seal['manifest'], 'before': before, 'after': after,
            'counts': dict(totals), 'groups': {key: dict(value) for key, value in groups.items()}, 'diversity': diversity,
            'census': pin(out / 'census.json'),
            'scope': 'Independent accepted-word hard support, actual style law, all local weights/doubling, full conditioned state graph/mass/sampled path, base/final cell/phone structural lineage and feature source survival. Preflight uses fixed first ten words/stream and is not a corpus substitute. Semantic licensing of every repair, rejected retry attempts and human preference are not certified by this operator.'})
    except Exception as error:
        save('failure.json', {'error': str(error), 'type': type(error).__name__, 'completed': completed, 'coordinate': coordinate})
        raise


if __name__ == '__main__':
    assert len(sys.argv) in [3, 4]
    preflight = len(sys.argv) == 4
    if preflight:
        assert sys.argv[3] == '--preflight'
    execute(sys.argv[1], sys.argv[2], preflight)
