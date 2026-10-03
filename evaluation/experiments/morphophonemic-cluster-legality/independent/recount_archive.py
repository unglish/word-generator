"""Authenticate and independently reconstruct every registered candidate record."""
import argparse
from collections import Counter
import copy
import gzip
import hashlib
import json
from pathlib import Path
import re

import collisions
import lineage_recount
from eligibility import Runtime, verify_profile_word

if not __debug__:
    raise RuntimeError('The independent oracle requires assertions; do not use Python -O')

PROTOCOL_SHA256 = '70d661acae4605ae064d7a194f76a405b452c0124c9e2651e96c666e86b03df9'
CONTROL_COMMIT = '1159465fe6c10f55a97e8c5851e8a75c604450e7'


def pin(path):
    assert path.is_file() and not path.is_symlink(), f'Nonregular input: {path}'
    digest, size = hashlib.sha256(), 0
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
            size += len(chunk)
    return {'bytes': size, 'sha256': digest.hexdigest()}


def load(path):
    return json.loads(path.read_bytes())


def validate_protocol(registration, protocol_bytes):
    assert registration['version'] == 'q11b-morphophonemic-legality-treatment-v1'
    assert registration['arms'] == ['composed-control', 'candidate']
    assert registration['controlCommit'] == CONTROL_COMMIT
    assert registration['protocolSha256'] == hashlib.sha256(protocol_bytes).hexdigest() == PROTOCOL_SHA256
    protocol = json.loads(protocol_bytes)
    assert registration['cohort'] == 'development'
    assert protocol['wordsPerReplicate'] == 10000
    assert registration['profiles'] == protocol['profiles']
    assert len(protocol['profiles']) == 4
    assert len({p['id'] for p in protocol['profiles']}) == 4
    for profile in protocol['profiles']:
        assert re.fullmatch(r'[a-z0-9-]+', profile['id'])
        seeds = profile['seeds']['development']
        assert len(seeds) == len(set(seeds)) == 5
        assert all(type(seed) is int and 0 <= seed <= 4294967295 for seed in seeds)
        assert type(profile['options']['morphology']) is bool
    assert registration['wordsPerPolicyPerArm'] == 200000
    assert registration['wordsPerArm'] == 400000
    return protocol


def authenticate(archive, registration_path, protocol_path, expected_commit):
    assert re.fullmatch(r'[a-f0-9]{40}', expected_commit)
    registration = load(registration_path)
    protocol = validate_protocol(registration, protocol_path.read_bytes())
    freeze = Path(str(archive) + '-freeze')
    seal = load(freeze / 'complete.json')
    before = load(freeze / 'before.json')
    assert seal['passed'] is True and seal['words'] == 200000
    assert pin(freeze / 'before.json')['sha256'] == seal['beforeSha256']
    assert before['before'] == seal['after'], 'Measured execution inputs changed'
    assert before['arm'] == 'candidate' and before['expectedCommit'] == expected_commit
    assert before['registration']['registration'] == registration
    assert before['registration']['registrationSha256'] == pin(registration_path)['sha256']
    assert before['registration']['protocol'] == protocol
    assert before['policy'] in ('default', 'active')
    assert pin(archive / 'manifest.json') == seal['manifest']
    manifest = load(archive / 'manifest.json')['manifest']
    assert manifest['schemaVersion'] == 1 and manifest['cohort'] == 'development'
    assert manifest['id'] == 'q11b-candidate-' + before['policy']
    assert manifest['generator']['commit'] == expected_commit and manifest['generator']['dirty'] is False
    assert manifest['protocol'] == protocol
    control_record = registration['controlArchives'][before['policy']]
    control = Path(control_record['path'])
    assert pin(control / 'manifest.json') == control_record['manifest']
    assert pin(Path(str(control) + '-freeze') / 'complete.json') == control_record['seal']
    control_manifest = load(control / 'manifest.json')['manifest']
    assert control_manifest['generator']['commit'] == CONTROL_COMMIT and control_manifest['generator']['dirty'] is False
    assert control_manifest['protocol'] == protocol
    expected_config = copy.deepcopy(control_manifest['generator']['effectiveConfig'])
    expected_config['morphology']['morphophonemicPolicy'] = registration['candidatePolicy']['morphophonemicPolicy']
    assert expected_config['morphology']['morphophonemicPolicy'] == {'preserveClusterLegality': True}
    assert manifest['generator']['effectiveConfig'] == expected_config, 'Candidate configuration differs from the registered single treatment'
    artifacts = manifest['artifacts']
    assert len({r['file'] for r in artifacts}) == len(artifacts), 'Duplicate artifact'
    expected_files = {f"words/{profile['id']}-{seed}.jsonl.gz" for profile in protocol['profiles']
                      for seed in profile['seeds']['development']}
    assert len(expected_files) == 20
    assert {r['file'] for r in artifacts if r['file'].startswith('words/')} == expected_files
    assert {p.relative_to(archive).as_posix() for p in (archive / 'words').rglob('*') if p.is_file()} == expected_files
    for record in artifacts:
        relative = Path(record['file'])
        assert not relative.is_absolute() and '..' not in relative.parts
        assert pin(archive / relative) == {k: record[k] for k in ('bytes', 'sha256')}, str(relative)
    return {'registration': registration, 'protocol': protocol, 'manifest': manifest, 'seal': seal,
            'policy': before['policy'], 'configuration': expected_config}


def eligibility_counts(result):
    counts = Counter({'eligibility/words/' + result['availability']: 1})
    for row in result['evaluations']:
        counts['eligibility/proposals'] += 1
        counts['eligibility/outcome/' + row['outcome']] += 1
        key = json.dumps([row['affixIndex'], row['boundary'], row['ruleIndex'], row['rule'],
                          (row.get('target') or {}).get('segment'), row['outcome']], separators=(',', ':'))
        counts['eligibility/stratum/' + key] += 1
        guard = row.get('guard')
        if guard:
            counts['eligibility/guardedProposals'] += 1
            assert guard['accepted'] == (row['outcome'] == 'accepted')
            assert guard['accepted'] == (not guard['rejections'])
            for rejection in guard['rejections']:
                counts['eligibility/rejection/' + rejection['reason']] += 1
            counts['eligibility/boundaryRepetitionLicenses'] += len(guard['boundaryRepetitionLicenses'])
    counts['eligibility/acceptedPhoneChanges'] += len(result['acceptedChanges'])
    return counts


def recount_candidate_word(word, runtime, morphology_enabled):
    result = verify_profile_word(word, runtime, morphology_enabled)
    extra, _ = collisions.morphology_collisions(word)
    structural = lineage_recount.recount_word(word)
    assert structural['missingFinalEvidence'] == structural['missingBaseEvidence'] == 0
    assert not any(value for key, value in structural.items() if key.startswith('missingOperationPackets/'))
    return structural + extra + eligibility_counts(result), result


def run(archive, registration_path, protocol_path, expected_commit, output):
    output.mkdir()
    directory = Path(__file__).parent
    inputs = [p for p in directory.iterdir() if p.is_file() and p.suffix in ('.py', '.gz', '.json')]
    inputs += [registration_path, protocol_path, archive / 'manifest.json',
               Path(str(archive) + '-freeze') / 'before.json', Path(str(archive) + '-freeze') / 'complete.json']
    before = {str(p): pin(p) for p in inputs}
    (output / 'before.json').write_text(json.dumps(before, indent=2) + '\n')
    try:
        authenticated = authenticate(archive, registration_path, protocol_path, expected_commit)
        runtime = Runtime(authenticated['configuration'])
        total, groups, witnesses = Counter(), {}, {}
        for profile in authenticated['protocol']['profiles']:
            for seed in profile['seeds']['development']:
                name = f"words/{profile['id']}-{seed}.jsonl.gz"
                counts, rows = Counter(), 0
                with gzip.open(archive / name, 'rt', encoding='utf8') as stream:
                    for index, line in enumerate(stream):
                        row = json.loads(line)
                        assert row['profile'] == profile['id'] and type(row['seed']) is int and row['seed'] == seed
                        assert type(row['drawIndex']) is int and row['drawIndex'] == index
                        word_counts, result = recount_candidate_word(row['word'], runtime, profile['options']['morphology'])
                        counts.update(word_counts)
                        rows += 1
                        for evaluation in result['evaluations']:
                            guard = evaluation.get('guard') or {}
                            key = json.dumps([profile['id'], evaluation['affixIndex'], evaluation['boundary'],
                                              evaluation['ruleIndex'], evaluation['outcome'], guard.get('rejections'),
                                              guard.get('boundaryRepetitionLicenses')], sort_keys=True, separators=(',', ':'))
                            if key not in witnesses:
                                witnesses[key] = {'file': name, 'rowSha256': hashlib.sha256(line.encode()).hexdigest(),
                                                  'record': row, 'evaluation': evaluation}
                assert rows == authenticated['protocol']['wordsPerReplicate'] == 10000
                total.update(counts)
                groups[f"{profile['id']}/{seed}"] = dict(sorted(counts.items()))
                (output / 'progress.json').write_text(json.dumps({'replicates': groups}, indent=2) + '\n')
                print(json.dumps({'profile': profile['id'], 'seed': seed, 'words': rows}), flush=True)
        assert total['words'] == total['morphologyCensus/words'] == 200000
        assert sum(v for k, v in total.items() if k.startswith('eligibility/words/')) == 200000
        assert total['eligibility/words/profile-disabled'] == 100000
        assert authenticate(archive, registration_path, protocol_path, expected_commit) == authenticated
        assert {str(p): pin(p) for p in inputs} == before, 'Verifier or evidence changed during recount'
        report = {'counts': dict(sorted(total.items())), 'replicates': groups, 'policy': authenticated['policy'],
                  'manifest': authenticated['seal']['manifest'], 'expectedCommit': expected_commit, 'inputPins': before,
                  'scope': 'Every successful emitted candidate record: independently configured proposal/atomic transaction/owned assembly/bridge tape/written-half and complete final cell/phone replay. Original evaluator quality metrics, discarded attempts and human preference remain separate.'}
        (output / 'recount.json').write_text(json.dumps(report, indent=2) + '\n')
        with gzip.open(output / 'witnesses.json.gz', 'wt', encoding='utf8') as stream:
            json.dump(witnesses, stream, ensure_ascii=False)
        (output / 'complete.json').write_text(json.dumps({'passed': True, 'words': 200000,
            'policy': authenticated['policy'], 'manifest': authenticated['seal']['manifest'], 'witnessStrata': len(witnesses)}, indent=2) + '\n')
    except Exception as error:
        (output / 'failure.json').write_text(json.dumps({'error': str(error), 'type': type(error).__name__}, indent=2) + '\n')
        raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('registration', type=Path)
    parser.add_argument('protocol', type=Path)
    parser.add_argument('expected_commit')
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    run(args.archive, args.registration, args.protocol, args.expected_commit, args.output)
