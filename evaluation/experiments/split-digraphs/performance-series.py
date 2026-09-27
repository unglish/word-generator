"""Six fresh process pairs in registered AB/BA order, retaining failed gates."""
import argparse
import hashlib
import json
import statistics
import subprocess
from pathlib import Path

ORDER = ['A', 'B', 'B', 'A', 'A', 'B', 'B', 'A', 'A', 'B', 'B', 'A']


def summarize(records):
    if [entry['variant'] for entry in records] != ORDER:
        raise ValueError('Wrong performance order')
    pairs = []
    for offset in range(0, 12, 2):
        pair = {entry['variant']: entry for entry in records[offset:offset + 2]}
        pairs.append((pair['B']['wordsPerSec'] / pair['A']['wordsPerSec'] - 1) * 100)
    return dict(pairedPercentChanges=pairs, medianPairedPercentChange=statistics.median(pairs),
                gates={variant: {gate: sum(record[gate] for record in records if record['variant'] == variant)
                                 for gate in ['speedPass', 'variancePass']} for variant in ['A', 'B']})


def main(args):
    root = Path(args.candidate); control = Path(args.control); out = Path(args.out)
    freeze = json.loads(Path(args.capture_complete).read_text())
    if freeze.get('passed') is not True or freeze['words'] != 200000:
        raise ValueError('Requires completed registered candidate capture')
    expected_candidate = freeze['after']['files']['src']
    materialization = json.loads(Path(args.control_materialization).read_text())
    expected_control = {name[4:]: value for name, value in materialization['files'].items() if name.startswith('src/')}
    if materialization['revision'] != '5f9b3ebd495857e02e4104a3b02f89e9c06bfc8c':
        raise ValueError('Wrong control revision')
    measurement = json.loads((root / 'evaluation/experiments/split-digraphs/measurement.json').read_text())
    if measurement['performanceOrder'] != ORDER:
        raise ValueError('Changed registered order')
    out.mkdir(); records = []
    runner = root / 'evaluation/experiments/split-digraphs/performance-one.mjs'
    runner_sha = hashlib.sha256(runner.read_bytes()).hexdigest()
    for index, variant in enumerate(ORDER):
        destination = out / f'{index + 1:02d}-{variant}.json'
        command = [args.node, '--import', 'tsx', str(runner), str(control if variant == 'A' else root), variant, str(destination)]
        with (out / f'{index + 1:02d}-{variant}.log').open('x') as log:
            subprocess.run(command, cwd=root, stdout=log, stderr=subprocess.STDOUT, check=True)
        record = json.loads(destination.read_text())
        expected = expected_control if variant == 'A' else expected_candidate
        if record['source'] != expected:
            raise ValueError('Performance sources differ from pinned experiment')
        if variant == 'B' and record['configuration']['splitVowels'] != measurement['splitVowels']:
            raise ValueError('Inactive candidate performance configuration')
        if records and (record['executableSha256'] != records[0]['executableSha256'] or record['environment'] != records[0]['environment']):
            raise ValueError('Performance runtime changed')
        records.append(record)
        print(json.dumps(dict(slot=index + 1, variant=variant, wordsPerSec=record['wordsPerSec'])), flush=True)
    if hashlib.sha256(runner.read_bytes()).hexdigest() != runner_sha:
        raise ValueError('Runner changed')
    with (out / 'report.json').open('x') as target:
        json.dump(dict(order=ORDER, runnerSha256=runner_sha, **summarize(records)), target, indent=2)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for name in ['candidate', 'control', 'out', 'capture-complete', 'control-materialization', 'node']:
        parser.add_argument('--' + name, required=True)
    main(parser.parse_args())
