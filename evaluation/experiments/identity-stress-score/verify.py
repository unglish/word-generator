"""Independent complete archive/score verifier; never calls the TypeScript observer."""
import argparse
from collections import Counter
import gzip
import hashlib
import json
import math
from pathlib import Path
import re


def encoded(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


class NumberToken(str):
    """Keep pinned producer JSON number spellings only for provenance hashes."""


def lexical_json(data):
    def pairs(items):
        result = {}
        for key, value in items:
            assert key not in result, ('duplicate JSON key', key)
            result[key] = value
        return result

    def invalid(value):
        raise ValueError('Non-JSON numeric constant: ' + value)

    return json.loads(data, parse_int=NumberToken, parse_float=NumberToken,
                      object_pairs_hook=pairs, parse_constant=invalid)


def producer_canonical(value):
    if isinstance(value, NumberToken):
        return str(value)
    if value is None or type(value) in (str, bool, int):
        return encoded(value)
    if isinstance(value, list):
        return '[' + ','.join(producer_canonical(item) for item in value) + ']'
    assert type(value) is dict, 'Hashing floats requires trusted original numeric lexemes'

    def order(key):
        index = re.fullmatch(r'0|[1-9][0-9]*', key) and int(key) < 2**32 - 1
        return (0, int(key)) if index else (1, key.encode('utf-16-be'))

    return '{' + ','.join(encoded(key) + ':' + producer_canonical(value[key]) for key in sorted(value, key=order)) + '}'


def producer_digest(value):
    return sha(producer_canonical(value).encode('utf8'))


def sha(value):
    return hashlib.sha256(value).hexdigest()


def file_pin(path):
    digest, size = hashlib.sha256(), 0
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1048576), b''):
            digest.update(block)
            size += len(block)
    return {'bytes': size, 'sha256': digest.hexdigest()}


def read(path):
    return json.loads(path.read_bytes())


def compare(actual, expected, label):
    if isinstance(expected, float):
        assert isinstance(actual, (int, float)) and math.isfinite(actual)
        assert abs(actual - expected) <= 1e-12 + 1e-12 * abs(expected), (label, actual, expected)
    elif isinstance(expected, dict):
        assert isinstance(actual, dict) and actual.keys() == expected.keys(), (label, 'keys')
        for key, value in expected.items():
            compare(actual[key], value, label + '/' + key)
    elif isinstance(expected, list):
        assert isinstance(actual, list) and len(actual) == len(expected), (label, 'length')
        for index, (left, right) in enumerate(zip(actual, expected, strict=True)):
            compare(left, right, label + '/' + str(index))
    else:
        assert type(actual) is type(expected) and actual == expected, (label, actual, expected)


def reference(path, protocol, inventory):
    compressed = path.read_bytes()
    envelope = json.loads(gzip.decompress(compressed))
    artifact = envelope['artifact']
    expected = protocol['declaredDataDependency']
    assert sha(compressed) == expected['artifactFileSha256']
    assert producer_digest(lexical_json(gzip.decompress(compressed))['artifact']) == envelope['digest'] == expected['artifactDigest']
    assert artifact['source']['sha256'] == expected['sourceSha256']
    assert artifact['population']['entryDigest'] == expected['selectedEntryDigest']
    tables = artifact['transitions']
    assert tables['entries'] == artifact['population']['accepted'] == expected['entries']
    assert tables['entryDigest'] == expected['selectedEntryDigest']
    total = tables['entries'] + tables['phoneEvents']
    assert total == expected['eventsPerView']
    collapsed, compiled = {}, {}
    for view in ('native', 'base'):
        table = tables[view]
        vocabulary = table['vocabulary']
        assert len(vocabulary) == len(set(vocabulary)) and '#' in vocabulary
        rows, columns = Counter(), Counter()
        for first, row in table['counts'].items():
            assert first in vocabulary and row
            for second, count in row.items():
                assert second in vocabulary and (first, second) != ('#', '#')
                assert type(count) is int and 0 < count < 2**53
                rows[first] += count
                columns[second] += count
                if view == 'native':
                    left, right = re.sub('[012]$', '', first), re.sub('[012]$', '', second)
                    collapsed.setdefault(left, Counter())[right] += count
        assert set(rows) == set(columns) == set(vocabulary)
        assert dict(rows) == dict(columns) == table['rowTotals']
        assert sum(rows.values()) == table['total'] == total and rows['#'] == tables['entries']
        for token in vocabulary:
            base = re.sub('[012]$', '', token)
            if token != '#':
                kinds = {kind for _, (code, kind) in inventory.items() if code == base}
                assert len(kinds) == 1
                assert (view == 'base' and token == base) or (view == 'native' and (next(iter(kinds)) == 'vowel') == bool(re.search('[012]$', token)))
        compiled[view] = {first: {second: -math.log2((table['counts'][first].get(second, 0) + .5) / (rows[first] + .5 * len(vocabulary))) for second in vocabulary} for first in vocabulary}
    assert {key: dict(row) for key, row in collapsed.items()} == tables['base']['counts']
    return compiled


def stress(syllable):
    value = syllable.get('stress')
    mark = 'unmarked' if 'stress' not in syllable else {'ˈ': 'primary', 'ˌ': 'secondary'}.get(value, 'invalid')
    return {'mark': mark, 'raw': value}


def surface_marks(word, observed_syllables):
    pattern = word.get('trace', {}).get('stressPattern')
    if not isinstance(pattern, dict):
        return None, 'missing-stress-pattern'
    if type(pattern.get('version')) is not int or pattern['version'] not in (1, 2):
        return None, 'unsupported-stress-pattern-version'
    if not isinstance(pattern.get('snapshots'), list):
        return None, 'missing-snapshots'
    surfaces = [item for item in pattern['snapshots'] if isinstance(item, dict) and item.get('domain') == 'surface-after-realization']
    if len(surfaces) != 1:
        return None, 'missing-or-duplicate-surface-snapshot'
    surface = surfaces[0]
    event_count = surface.get('eventCount')
    if surface.get('coordinates') != 'word' or type(event_count) is not int or not 0 <= event_count < 2**53 or not isinstance(surface.get('syllables'), list) or len(surface['syllables']) != len(word['syllables']):
        return None, 'surface-coordinate-mismatch'
    marks = []
    for actual, snapshot, observed in zip(word['syllables'], surface['syllables'], observed_syllables, strict=True):
        if not isinstance(snapshot, dict) or snapshot.get('mark') not in ('primary', 'secondary', 'unmarked'):
            return None, 'invalid-surface-mark'
        if observed['stress']['mark'] == 'invalid' or snapshot['mark'] != observed['stress']['mark']:
            return None, 'surface-stress-mismatch'
        for slot in ('onset', 'nucleus', 'coda'):
            phones = snapshot.get(slot)
            if not isinstance(phones, list) or len(phones) != len(actual[slot]) or (slot == 'nucleus' and len(phones) == 0):
                return None, 'surface-phone-count-mismatch'
            if any(not isinstance(phone, dict) or phone.get('sound') != raw['sound'] for phone, raw in zip(phones, actual[slot], strict=True)):
                return None, 'surface-phone-mismatch'
        marks.append('unstressed' if snapshot['mark'] == 'unmarked' else snapshot['mark'])
    return marks, None


def scored(tokens, compiled, missing):
    reasons = list(missing)
    if not tokens:
        reasons.append('empty-word')
    for index, token in enumerate(tokens):
        if token is None:
            reasons.append(f'projection:{index}')
        elif token == '#' or token not in compiled:
            reasons.append(f'reference:{index}')
    if reasons:
        return {'status': 'unavailable', 'tokens': tokens, 'unavailable': list(dict.fromkeys(reasons)), 'transitions': 0, 'bitsPerTransition': None}
    sequence = ['#', *tokens, '#']
    bits = sum(compiled[first][second] for first, second in zip(sequence, sequence[1:]))
    return {'status': 'scored', 'tokens': tokens, 'unavailable': [], 'transitions': len(sequence) - 1, 'bitsPerTransition': bits / (len(sequence) - 1)}


def project(draw, inventory, compiled):
    word = draw['word']
    syllables = [{'stress': stress(syllable), 'nucleusSize': len(syllable['nucleus'])} for syllable in word['syllables']]
    segments, coarse, losses, strict = [], [], [], []
    for si, syllable in enumerate(word['syllables']):
        for slot in ('onset', 'nucleus', 'coda'):
            for index, phone in enumerate(syllable[slot]):
                raw = phone['sound']
                stripped = raw[:-1] if raw.endswith('ʰ') else raw
                base = {'iː': 'i:', 'ɡ': 'g'}.get(stripped, stripped)
                entry = inventory.get(base)
                state = 'unknown' if entry is None else 'ambiguous' if base == 'ɜ' else 'resolved'
                identity = {'status': state, 'id': None if entry is None else 'english-legacy:' + '-'.join(format(ord(char), 'x') for char in base), 'kind': None if entry is None else entry[1]}
                coordinates = {'syllable': si, 'slot': slot, 'index': index}
                segments.append({'coordinates': coordinates, 'rawSound': raw, 'baseSound': base, 'identity': identity})
                legacy = inventory.get(raw.replace('ʰ', ''), ({'e': 'EH', 'o': 'OW'}.get(raw.replace('ʰ', '')), None))[0]
                coarse.append(legacy)
                losses.append({'sourceIndex': len(losses), 'token': legacy, 'losses': {
                    'aspiration': 'ʰ' in raw or phone.get('aspirated') is True, 'stress': slot == 'nucleus',
                    'mergedIdentity': legacy in ('AH', 'ER', 'EH', 'OW'), 'unresolvedIdentity': state != 'resolved'}})
                strict.append((si, slot, entry, state))
    binding = encoded({'contractVersion': 'phoneme-identity-v1', 'sourceProfile': 'english-legacy-v1', 'layer': 'surface', 'syllables': syllables, 'segments': segments})
    explicit_marks = [item['stress']['mark'] if item['stress']['mark'] in ('primary', 'secondary') else 'unavailable' for item in syllables]
    explicit = {'version': 'explicit-syllable-marks-v1', 'marks': explicit_marks, 'unavailable': [f'stress:{index}' for index, mark in enumerate(explicit_marks) if mark == 'unavailable'], 'wordBinding': binding}
    marks, reason = surface_marks(word, syllables)
    trace = {'version': 'stress-pattern-surface-v1', 'marks': marks if reason is None else ['unavailable'] * len(syllables), 'unavailable': [] if reason is None else [reason], 'wordBinding': binding}
    supported = len(syllables) > 0 and all(item['nucleusSize'] > 0 for item in syllables)

    def native(evidence):
        tokens = []
        for si, slot, entry, state in strict:
            if not supported or state != 'resolved' or entry is None or (entry[1] == 'vowel') != (slot == 'nucleus'):
                tokens.append(None)
            elif slot != 'nucleus':
                tokens.append(entry[0])
            else:
                digit = {'primary': '1', 'secondary': '2', 'unstressed': '0'}.get(evidence['marks'][si])
                tokens.append(None if digit is None else entry[0] + digit)
        return scored(tokens, compiled['native'], evidence['unavailable'])

    morphology = word.get('trace', {}).get('morphology', {})
    actual = morphology.get('template') if morphology.get('template') != 'bare' and (morphology.get('prefix') or morphology.get('suffix')) else 'bare'
    return {'profile': draw['profile'], 'seed': draw['seed'], 'drawIndex': draw['drawIndex'], 'syllables': len(syllables), 'segments': len(segments),
            'writtenCodePoints': len(word['written']['clean']), 'morphology': actual,
            'coarse': scored(coarse, compiled['base'], []), 'nativeExplicit': native(explicit), 'nativeTrace': native(trace),
            'explicitEvidence': explicit, 'traceEvidence': trace, 'losses': losses}


def metric():
    return {'words': 0, 'transitions': 0, 'sum': 0.0, 'sumSquares': 0.0, 'minimum': None, 'maximum': None, 'unavailable': {}}


def counts():
    return {'words': 0, 'segments': 0, 'matchedExplicit': 0, 'matchedTrace': 0,
            **{view: metric() for view in ('coarse', 'nativeExplicit', 'nativeTrace', 'matchedExplicitCoarse', 'matchedTraceCoarse', 'matchedExplicitNative', 'matchedTraceNative')}, 'losses': {}}


def accumulate(target, value):
    if value['status'] == 'unavailable':
        for reason in value['unavailable']:
            target['unavailable'][reason] = target['unavailable'].get(reason, 0) + 1
        return
    number = value['bitsPerTransition']
    target['words'] += 1
    target['transitions'] += value['transitions']
    target['sum'] += number
    target['sumSquares'] += number * number
    target['minimum'] = number if target['minimum'] is None else min(target['minimum'], number)
    target['maximum'] = number if target['maximum'] is None else max(target['maximum'], number)


def aggregate(target, row):
    target['words'] += 1
    target['segments'] += row['segments']
    for view in ('coarse', 'nativeExplicit', 'nativeTrace'):
        accumulate(target[view], row[view])
    for evidence in ('Explicit', 'Trace'):
        if row['coarse']['status'] == row['native' + evidence]['status'] == 'scored':
            target['matched' + evidence] += 1
            accumulate(target['matched' + evidence + 'Coarse'], row['coarse'])
            accumulate(target['matched' + evidence + 'Native'], row['native' + evidence])
    for item in row['losses']:
        for loss, present in item['losses'].items():
            if present:
                target['losses'][loss] = target['losses'].get(loss, 0) + 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('out', type=Path)
    parser.add_argument('proof', type=Path)
    args = parser.parse_args()
    experiment = Path(__file__).resolve().parent
    root = experiment.parents[2]
    frozen_bytes = (experiment / 'freeze-v1.json').read_bytes()
    freeze = json.loads(frozen_bytes)

    def verify_sources():
        assert (experiment / 'freeze-v1.json').read_bytes() == frozen_bytes
        for item in freeze['files']:
            assert file_pin(root / item['path']) == {'bytes': item['bytes'], 'sha256': item['sha256']}, item['path']

    verify_sources()
    protocol = read(experiment / 'protocol-v1.json')
    inventory_source = (root / 'src/phonology/identity.ts').read_text()
    inventory = {sound: (code, kind) for sound, code, kind in re.findall(r'entry\("([^"]+)", "([A-Z]+)", "(vowel|consonant)"\)', inventory_source)}
    assert len(inventory) == 41
    compiled = reference(experiment / 'reference.json.gz', protocol, inventory)
    report_path = args.out / 'report.json'
    report = read(report_path)
    assert report['freezeSha256'] == sha(frozen_bytes)
    assert len(report['arms']) == len(protocol['archives']) == 3
    checked = []
    maximum_difference = 0.0
    for archive, arm in zip(protocol['archives'], report['arms'], strict=True):
        directory = Path(archive['path'])
        manifest_path = directory / 'manifest.json'
        envelope = read(manifest_path)
        manifest = envelope['manifest']
        lexical_manifest = lexical_json(manifest_path.read_bytes())['manifest']
        assert producer_digest(lexical_manifest) == envelope['digest'] == arm['manifestDigest']
        assert file_pin(manifest_path) == arm['manifestFile']
        assert arm['manifestFile'] == next(item['manifestFile'] for item in freeze['archives'] if item['role'] == archive['role'])
        assert arm['role'] == archive['role'] and arm['path'] == archive['path']
        assert arm['rawArtifacts'] == manifest['artifacts'] and arm['generator'] == manifest['generator']
        expected_files = {f"words/{profile['id']}-{seed}.jsonl.gz" for profile in manifest['protocol']['profiles'] for seed in profile['seeds']['development']}
        assert expected_files == {item['file'] for item in manifest['artifacts'] if item['file'].startswith('words/')} == {f'words/{path.name}' for path in (directory / 'words').iterdir()}
        assert len(expected_files) == archive['streams'] == len(arm['streams']) == 20
        for item in manifest['artifacts']:
            assert file_pin(directory / item['file']) == {'bytes': item['bytes'], 'sha256': item['sha256']}
        sources = lexical_json(gzip.decompress((directory / 'sources.json.gz').read_bytes()))
        summary = read(directory / 'summary.json')
        lexical_summary = lexical_json((directory / 'summary.json').read_bytes())
        assert producer_digest(sources['generator']) == manifest['generator']['sourceDigest']
        assert producer_digest({'files': sources['evaluator'], 'definitions': lexical_summary['definitions']}) == manifest['evaluatorDigest']
        assert producer_digest(lexical_manifest['protocol']) == manifest['protocolDigest']
        schedule = [{'profile': profile['id'], 'seed': seed, 'words': manifest['protocol']['wordsPerReplicate']} for profile in manifest['protocol']['profiles'] for seed in profile['seeds']['development']]
        if summary.get('schemaVersion') == 'q09-raw-capture-v1':
            assert summary['profiles'] == [] and summary['captureOnly']['metricStatus'] == 'not-evaluated'
            assert summary['captureOnly']['streams'] == schedule and summary['captureOnly']['words'] == archive['words']
        else:
            assert [{'profile': profile['id'], 'seed': replicate['seed'], 'words': replicate['words']} for profile in summary['profiles'] for replicate in profile['replicates']] == schedule
            assert sum(profile['words'] for profile in summary['profiles']) == archive['words']
        totals, profiles, strata, witnesses = counts(), {}, {}, {}
        cursor = 0
        for profile in manifest['protocol']['profiles']:
            for seed in profile['seeds']['development']:
                relative = f"words/{profile['id']}-{seed}.jsonl.gz"
                expected_stream = arm['streams'][cursor]
                cursor += 1
                target = f"{archive['role']}-{profile['id']}-{seed}.jsonl.gz"
                assert expected_stream['profile'] == profile['id'] and expected_stream['seed'] == seed
                assert expected_stream['scoreStream'] == {'file': target, **file_pin(args.out / target)}
                stream, uncompressed = counts(), hashlib.sha256()
                with gzip.open(directory / relative, 'rb') as raw, gzip.open(args.out / target, 'rb') as scores:
                    for index, (line, score_line) in enumerate(zip(raw, scores, strict=True)):
                        draw = json.loads(line)
                        assert (draw['profile'], draw['seed'], draw['drawIndex']) == (profile['id'], seed, index)
                        expected = project(draw, inventory, compiled)
                        observed = json.loads(score_line)
                        compare(observed, expected, target + '/' + str(index))
                        uncompressed.update(score_line)
                        for view in ('coarse', 'nativeExplicit', 'nativeTrace'):
                            if expected[view]['status'] == 'scored':
                                maximum_difference = max(maximum_difference, abs(expected[view]['bitsPerTransition'] - observed[view]['bitsPerTransition']))
                        aggregate(stream, expected)
                        aggregate(totals, expected)
                        aggregate(profiles.setdefault(profile['id'], counts()), expected)
                        stratum = f"{profile['id']}/{expected['morphology']}/syllables:{expected['syllables']}/segments:{expected['segments']}/writtenCodePoints:{expected['writtenCodePoints']}"
                        aggregate(strata.setdefault(stratum, counts()), expected)
                        for view in ('coarse', 'nativeExplicit', 'nativeTrace'):
                            value = expected[view]
                            witnesses.setdefault(f"{profile['id']}/{view}/{value['status']}", draw)
                            for reason in value['unavailable']:
                                witnesses.setdefault(f"{profile['id']}/{view}/{reason}", draw)
                assert stream['words'] == manifest['protocol']['wordsPerReplicate'] == 10000
                compare(expected_stream['counts'], stream, target + '/counts')
                checked.append({'arm': archive['role'], 'stream': relative, 'words': stream['words'], 'entireScoreStreamSha256': uncompressed.hexdigest()})
                print(f"verified {archive['role']}/{profile['id']}/{seed}", flush=True)
        assert totals['words'] == archive['words'] == 200000
        compare(arm['totals'], totals, archive['role'] + '/totals')
        compare(arm['profiles'], profiles, archive['role'] + '/profiles')
        compare(arm['strata'], strata, archive['role'] + '/strata')
        assert arm['witnesses'] == witnesses
        assert file_pin(manifest_path) == arm['manifestFile']
        for item in manifest['artifacts']:
            assert file_pin(directory / item['file']) == {'bytes': item['bytes'], 'sha256': item['sha256']}
    verify_sources()
    reference(experiment / 'reference.json.gz', protocol, inventory)
    proof = {'version': 'q16b-independent-score-proof-v1', 'words': sum(item['words'] for item in checked),
             'streams': checked, 'report': file_pin(report_path), 'freezeSha256': sha(frozen_bytes),
             'maximumPerWordScoreAbsoluteDifference': maximum_difference,
             'tolerance': {'absolute': 1e-12, 'relative': 1e-12},
             'scope': 'All 600000 archived words, every aligned projection/evidence/binding/loss/transition/score, all stream/profile/morphology/syllable/segment strata and deterministic witnesses. Entire pinned reference and all integer conservation relations authenticated; all raw/source files rehashed before and after. No generator calls or TypeScript scoring imports.'}
    with args.proof.open('x') as stream:
        json.dump(proof, stream, indent=2)
        stream.write('\n')


if __name__ == '__main__':
    main()
