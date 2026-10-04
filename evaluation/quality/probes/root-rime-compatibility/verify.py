"""Independent archive counter for the frozen TypeScript observer; no generation."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


def load_json(path):
    return json.loads(path.read_bytes())


def count(shapes, excluded):
    totals = dict(observedWords=1, unavailableWords=0, wordsWithViolation=0,
                  syllables=len(shapes), nuclearSegments=0, codaSegments=0,
                  crossPairs=0, violatingPairs=0, violatingNuclei=0, violatingSyllables=0)
    for shape in shapes:
        nuclei, codas = shape['nucleus'], shape['coda']
        totals['nuclearSegments'] += len(nuclei)
        totals['codaSegments'] += len(codas)
        totals['crossPairs'] += len(nuclei) * len(codas)
        hits = [sum((nucleus, coda) in excluded for coda in codas) for nucleus in nuclei]
        totals['violatingPairs'] += sum(hits)
        totals['violatingNuclei'] += sum(hit > 0 for hit in hits)
        totals['violatingSyllables'] += any(hits)
    totals['wordsWithViolation'] = int(totals['violatingPairs'] > 0)
    return totals


def verify(directory, report_path):
    manifest = load_json(directory / 'manifest.json')['manifest']
    report = load_json(report_path)
    protocol = manifest['protocol']
    expected = {f"words/{profile['id']}-{seed}.jsonl.gz"
                for profile in protocol['profiles'] for seed in profile['seeds']['development']}
    artifacts = {artifact['file']: artifact for artifact in manifest['artifacts']}
    assert len(artifacts) == len(manifest['artifacts']), 'Duplicate pinned artifact'
    assert expected == {name for name in artifacts if name.startswith('words/')}
    assert expected == {f'words/{path.name}' for path in (directory / 'words').iterdir()}

    def pinned(name):
        data = (directory / name).read_bytes()
        assert len(data) == artifacts[name]['bytes']
        assert hashlib.sha256(data).hexdigest() == artifacts[name]['sha256']
        return data

    sources = json.loads(gzip.decompress(pinned('sources.json.gz')))
    canonical_sources = json.dumps(sources['generator'], sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()
    assert hashlib.sha256(canonical_sources).hexdigest() == manifest['generator']['sourceDigest']
    assert report['run']['generator'] == manifest['generator']
    assert [item['id'] for item in report['profiles']] == [item['id'] for item in protocol['profiles']]
    rules = manifest['generator']['effectiveConfig'].get('codaConstraints', {}).get('bannedNucleusCodaCombinations', [])
    excluded = {(nucleus, coda) for rule in rules for nucleus in rule['nucleus'] for coda in rule['coda']}
    expected_witnesses = {}
    for bucket in report['witnesses'].values():
        for draw in bucket:
            key = (draw['profile'], draw['seed'], draw['drawIndex'])
            assert key not in expected_witnesses or expected_witnesses[key] == draw
            expected_witnesses[key] = draw
    witness_count = len(expected_witnesses)
    results, draws = [], 0
    layer_names = {'generatedRoot': ('generateSyllables', 'after'), 'structuralRoot': ('applyStress', 'before'),
                   'stressedRoot': ('repairStressedNuclei', 'after'), 'preparedRoot': ('generateWrittenForm', 'before')}
    for profile, observed in zip(protocol['profiles'], report['profiles']):
        totals = {name: {} for name in [*layer_names, 'output']}
        repairs = {'stressRepair': 0, 'edgeRepair': 0}
        assert [entry['seed'] for entry in observed['replicates']] == profile['seeds']['development']
        for seed, replica in zip(profile['seeds']['development'], observed['replicates']):
            lines = gzip.decompress(pinned(f"words/{profile['id']}-{seed}.jsonl.gz")).splitlines()
            assert len(lines) == protocol['wordsPerReplicate'] == replica['counts']['words']
            for index, line in enumerate(lines):
                draw = json.loads(line)
                assert (draw['profile'], draw['seed'], draw['drawIndex']) == (profile['id'], seed, index)
                witness_key = (profile['id'], seed, index)
                if witness_key in expected_witnesses:
                    assert draw == expected_witnesses.pop(witness_key), 'Witness differs from archived draw'
                stages = {}
                for stage in draw['word']['trace']['stages']:
                    assert stage['name'] not in stages, 'Duplicate stage'
                    stages[stage['name']] = stage
                layers = {name: stages[stage][side] if stage in stages else None for name, (stage, side) in layer_names.items()}
                layers['output'] = [{part: [phone['sound'] for phone in shape[part]] for part in ['onset', 'nucleus', 'coda']}
                                    for shape in draw['word']['syllables']]
                for name, shapes in layers.items():
                    counts = {'unavailableWords': 1} if shapes is None else count(shapes, excluded)
                    for key, value in counts.items():
                        totals[name][key] = totals[name].get(key, 0) + value
                for phase, rule in [('stressRepair', 'repairStressedNuclei'), ('edgeRepair', 'repairNucleusWordPositions')]:
                    repairs[phase] += sum(event['rule'] == rule for event in draw['word']['trace']['repairs'])
                draws += 1
        for name, values in totals.items():
            for key, value in values.items():
                assert observed['totals']['layers'][name][key] == value, (profile['id'], name, key)
        for phase, value in repairs.items():
            assert observed['totals']['replacements'][phase]['observedRepairs'] == value
        results.append({'profile': profile['id'], 'layers': totals, 'repairs': repairs})
    assert draws == sum(item['totals']['words'] for item in report['profiles'])
    assert not expected_witnesses, 'Witness coordinate missing from archive'
    return {'verifiedWords': draws, 'verifiedWitnesses': witness_count, 'archiveId': manifest['id'], 'generatorDigest': manifest['generator']['sourceDigest'],
            'observerDigest': report['observer']['digest'], 'reportSha256': hashlib.sha256(report_path.read_bytes()).hexdigest(),
            'verifierSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'profiles': results}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('report', type=Path)
    parser.add_argument('output', type=Path)
    arguments = parser.parse_args()
    result = verify(arguments.archive, arguments.report)
    with arguments.output.open('x') as output:
        json.dump(result, output, indent=2)
        output.write('\n')
    print(f"Independently verified {result['verifiedWords']} draws and all layer denominators/counts.")
