"""Run only after the parent reserves an idle window; use the unchanged perf suite."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import statistics
import subprocess
import sys

candidate = Path('/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator')
original = Path('/private/tmp/q13-budget-original-runtime')
output = Path(sys.argv[1])
output.mkdir(exist_ok=False)
utc = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
registration = json.loads((candidate/'evaluation/quality/probes/linear-spelling-budget/preregistration.json').read_text())
protocol = json.loads((candidate/'evaluation/quality/probes/linear-spelling-budget/protocol.json').read_text())
parity = json.loads(Path('/private/tmp/q13-budget-exact-parity.json').read_text())
assert parity['result'] == 'pass' and parity['apiCalls'] == 800000
assert parity['candidateGeneratorDigest'] == '3dfffb12c5f595507276983f0eae78fedf010726c928ed69cd182db987c3da5b'
roots = {'A': original, 'B': candidate}
harness = ['src/core/generate.perf.test.ts', 'vitest.perf.config.ts', 'package.json', 'package-lock.json']

def verify():
    for root, files in zip([original, candidate], parity['runtimeFiles']):
        for file in files:
            assert sha(root/file['file']) == file['sha256'], file['file']
    for file in registration['definitions'] + registration['fixedDependencies']:
        assert sha(candidate/file['file']) == file['sha256'], file['file']
    for file in harness:
        assert (original/file).read_bytes() == (candidate/file).read_bytes(), file

def save(name, data):
    with (output/name).open('x') as target:
        target.write(json.dumps(data, indent=2) + '\n')

verify()
environment = dict(os.environ)
environment.pop('CI', None)
before = {'createdAt': utc(), 'order': protocol['performance']['pairOrder'],
          'node': subprocess.check_output(['node', '--version'], text=True).strip(),
          'npm': subprocess.check_output(['npm', '--version'], text=True).strip(),
          'platform': platform.platform(), 'machine': platform.machine(),
          'cpuModel': subprocess.check_output(['node', '-e', 'console.log(require("node:os").cpus()[0]?.model ?? "unavailable")'], text=True).strip(),
          'CI': None, 'command': ['npm', 'run', 'test:perf'], 'freshProcessPerRun': True,
          'scriptSha256': sha(Path(__file__)), 'parityReportSha256': sha(Path('/private/tmp/q13-budget-exact-parity.json')),
          'roots': {key: str(value) for key, value in roots.items()},
          'runtimeDigests': {'A': parity['originalGeneratorDigest'], 'B': parity['candidateGeneratorDigest']},
          'harness': [{'file': file, 'sha256': sha(candidate/file)} for file in harness],
          'preregistrationSha256': sha(candidate/'evaluation/quality/probes/linear-spelling-budget/preregistration.json'),
          'precision': 'Throughput and batch milliseconds are rounded by the unchanged harness; variance is printed to two decimals. Gate assertions use unrounded values. Ratios below use the consistently reported integer throughput.'}
save('inputs.json', before)
runs = []
for pair, versions in enumerate(protocol['performance']['pairOrder'], start=1):
    for position, version in enumerate(versions, start=1):
        path = output/f'{pair:02}-{position}-{version}.log'
        started = utc()
        with path.open('x') as log:
            result = subprocess.run(before['command'], cwd=roots[version], env=environment,
                                    stdout=log, stderr=subprocess.STDOUT)
        ended = utc()
        text = re.sub(r'\x1b\[[0-9;]*m', '', path.read_text())
        rate = re.search(r'Performance: (\d+) words/sec \(10000 words in (\d+)ms\)', text)
        variance = re.search(r'Batch variance trials: ([\d.x, ]+) \(median ([\d.]+)x\)', text)
        floor_status = re.search(r'^\s*([✓×]) .* > should generate at least 4500 words/sec', text, re.MULTILINE)
        variance_status = re.search(r'^\s*([✓×]) .* > should not degrade significantly with sequential seeds', text, re.MULTILINE)
        record = {'pair': pair, 'position': position, 'version': version, 'startedAt': started, 'endedAt': ended,
                  'exitCode': result.returncode, 'log': path.name, 'logSha256': sha(path)}
        if not all([rate, variance, floor_status, variance_status]) or result.returncode not in [0, 1]:
            runs.append(record)
            save('interrupted.json', {'reason': 'Process or expected-harness-output failure; retain this entire series. A new quiet window and complete series are required.', 'inputs': before, 'runs': runs})
            raise RuntimeError(f'Unexpected performance process outcome in {path}; series retained')
        record.update({'reportedWordsPerSecond': int(rate[1]), 'reportedBatchMilliseconds': int(rate[2]),
                       'reportedVarianceTrials': variance[1], 'reportedMedianVariance': float(variance[2]),
                       'floorGatePassed': floor_status[1] == '✓', 'varianceGatePassed': variance_status[1] == '✓'})
        assert result.returncode == (0 if record['floorGatePassed'] and record['varianceGatePassed'] else 1)
        runs.append(record)
        print(json.dumps(record), flush=True)
verify()
assert sha(Path(__file__)) == before['scriptSha256'], 'Performance observer changed during the series'
pairs = []
for pair in range(1, 7):
    rows = {row['version']: row for row in runs if row['pair'] == pair}
    a, b = rows['A']['reportedWordsPerSecond'], rows['B']['reportedWordsPerSecond']
    pairs.append({'pair': pair, 'BoverA': b/a, 'roundingInterval': [(b-0.5)/(a+0.5), (b+0.5)/(a-0.5)]})
ratios = [pair['BoverA'] for pair in pairs]
median = statistics.median(ratios)
positive = sum(ratio > 1 for ratio in ratios)
save('report.json', {'id': 'linear-spelling-budget-isolated-six-pairs', 'completedAt': utc(), 'inputs': before,
     'inputsSha256': sha(output/'inputs.json'), 'sourcesAndDefinitionsUnchanged': True, 'runs': runs, 'pairs': pairs,
     'medianPairedThroughputRatio': median, 'pairedRatioRange': [min(ratios), max(ratios)], 'positivePairs': positive,
     'versionMedians': {version: statistics.median(row['reportedWordsPerSecond'] for row in runs if row['version'] == version) for version in ['A','B']},
     'floorPasses': {version: sum(row['floorGatePassed'] for row in runs if row['version'] == version) for version in ['A','B']},
     'variancePasses': {version: sum(row['varianceGatePassed'] for row in runs if row['version'] == version) for version in ['A','B']},
     'registeredLocalImprovementCriterionMet': median > 1 and positive >= 5,
     'scope': 'One preordered isolated local series on the same machine; no claim of general speed or restored quality gates. No post-hoc tuning.'})
print(json.dumps({'result': 'completed', 'medianPairedRatio': median, 'positivePairs': positive}), flush=True)
