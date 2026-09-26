"""Fixed six pairs; source/dependency preparation and tests do not authorize timing."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import statistics
import subprocess
import sys

ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator')
CONTROL = Path('/private/tmp/q13c-performance-control-v1')
CONTROL_PIN = Path('/private/tmp/q13c-performance-control-v1.json')
CONTROL_SHA = '01e9b7ec18bbe4efff8320fa897dfa25671b37034684d5bfb63d8edb67dbe6bb'
FREEZE = Path('/private/tmp/q13c-formal-parity-freeze-v1.json')
FREEZE_SHA = 'fee661104514e33487c95eaa948b0acb1d41e78b1fc956412e4228f1b49e820e'
PLAN = Path('/private/tmp/q13c-performance-plan-v2.md')
PLAN_SHA = '8d5c6f4d2d590d2891a5af41d68cf56748f214fea08e32496f9aa87c99915ab3'
ORIGINAL = Path('/Users/ryanbetts/.codex/worktrees/d9c28566-8f5b-432e-a246-5e4070782624/word-generator')
ARCHIVE = Path('/private/tmp/q13c-unit-normalization-candidate-v1')
ORDER = ('AB', 'BA', 'AB', 'BA', 'AB', 'BA')
HARNESS = ('src/core/generate.perf.test.ts', 'vitest.perf.config.ts', 'package.json', 'package-lock.json')
CACHE_DIRS = frozenset({'.cache', '.vite', '.vite-temp', '.vitest'})
OVERRIDES = ('NODE_OPTIONS', 'NODE_PATH', 'ESBUILD_BINARY_PATH', 'npm_config_node_options', 'npm_config_script_shell')
ENV_RECORDED = (*OVERRIDES, 'NODE_ENV', 'VITEST_POOL', 'VITEST_MAX_THREADS', 'VITEST_MIN_THREADS', 'FORCE_COLOR', 'NO_COLOR')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def require(ok, message):
    if not ok:
        raise ValueError(message)


def save(directory, name, value):
    with (directory / name).open('x') as target:
        json.dump(value, target, indent=2, allow_nan=False); target.write('\n')


def regular(path, directory=False):
    path = path.absolute()
    for index, entry in enumerate([path, *path.parents]):
        require(not entry.is_symlink(), f'Aliased source: {entry}')
        require(entry.is_dir() if index or directory else entry.is_file(), f'Nonregular source: {entry}')
    return path


def parse_log(text):
    text = re.sub(r'\x1b\[[0-9;]*m', '', text)
    def one(pattern):
        found = list(re.finditer(pattern, text, re.MULTILINE))
        require(len(found) <= 1, 'Ambiguous duplicate measurement or gate lines')
        return found[0] if found else None
    rate = one(r'Performance: (\d+) words/sec \(10000 words in (\d+)ms\)')
    variance = one(r'Batch variance trials: ([\d.x, ]+) \(median ([\d.]+)x\)')
    floor = one(r'^\s*([✓×]) .* > should generate at least 4500 words/sec')
    gate = one(r'^\s*([✓×]) .* > should not degrade significantly with sequential seeds')
    if variance:
        trials = [float(v.strip().removesuffix('x')) for v in variance[1].split(',')]
        require(len(trials) == 3 and all(v >= 1 for v in trials), 'Malformed variance trials')
        require(float(variance[2]) == sorted(trials)[1], 'Printed variance median is inconsistent')
    return {'reportedWordsPerSecond': int(rate[1]) if rate else None,
            'reportedBatchMilliseconds': int(rate[2]) if rate else None,
            'reportedVarianceTrials': variance[1] if variance else None,
            'reportedMedianVariance': float(variance[2]) if variance else None,
            'floorGatePassed': floor[1] == '✓' if floor else None,
            'varianceGatePassed': gate[1] == '✓' if gate else None}


def summarize(runs):
    schedule = [(pair, position, version) for pair, order in enumerate(ORDER, 1) for position, version in enumerate(order, 1)]
    require(all(type(r['pair']) is int and type(r['position']) is int for r in runs), 'Invalid slot coordinates')
    actual = [(r['pair'], r['position'], r['version']) for r in runs]
    require(actual == schedule[:len(actual)], 'Runs must be the exact scheduled prefix, without duplicates/reordering')
    pairs = []
    for pair in range(1, 7):
        rows = {r['version']: r for r in runs if r['pair'] == pair}
        a = rows.get('A', {}).get('reportedWordsPerSecond')
        b = rows.get('B', {}).get('reportedWordsPerSecond')
        valid = type(a) is int and type(b) is int and a > 0 and b > 0
        pairs.append({'pair': pair, 'BoverA': b/a if valid else None,
                      'roundingInterval': [(b-.5)/(a+.5), (b+.5)/(a-.5)] if valid else None})
    ratios = [p['BoverA'] for p in pairs if p['BoverA'] is not None]
    gates = {}
    for version in ('A', 'B'):
        selected = [r for r in runs if r['version'] == version]
        gates[version] = {key: {**{state: sum(r.get(key) is value for r in selected)
                                  for state, value in [('passed', True), ('failed', False), ('unavailable', None)]},
                               'notRun': 6-len(selected)} for key in ('floorGatePassed', 'varianceGatePassed')}
    return {'pairs': pairs, 'availablePairs': len(ratios),
            'medianPairedThroughputRatio': statistics.median(ratios) if len(ratios) == 6 else None,
            'pairedRatioRange': [min(ratios), max(ratios)] if ratios else None, 'gates': gates}


def control_source_set(root, expected):
    actual = []
    for path in sorted((root / 'src').rglob('*')):
        require(not path.is_symlink(), f'Aliased control source: {path}')
        if path.is_file():
            regular(path); actual.append(str(path.relative_to(root)))
        else:
            require(path.is_dir(), f'Nonregular control source: {path}')
    require(actual == sorted(p for p in expected if p.startswith('src/')), 'Control source file set changed')


def package_lookup(name, origin):
    require(re.fullmatch(r'(?:@[A-Za-z0-9_.-]+/)?[A-Za-z0-9_.-]+', name) is not None, 'Invalid dependency name')
    for parent in (origin, *origin.parents):
        if parent.name == 'node_modules':
            continue
        path = parent / 'node_modules' / name / 'package.json'
        if path.is_file():
            return path.parent.resolve()
        require(not path.is_symlink(), f'Dangling package alias: {path}')
    return None


def installed_tree(root, boundaries, skip_nested_modules):
    files = {}
    def visit(directory, prefix, ancestors):
        physical = directory.resolve()
        require(physical not in ancestors, 'Dependency directory cycle')
        require(any(physical.is_relative_to(boundary) for boundary in boundaries), 'Dependency resolves outside pinned install trees')
        for path in sorted(directory.iterdir()):
            rel = prefix + path.name
            if path.is_dir() and (path.name in CACHE_DIRS or skip_nested_modules and path.name == 'node_modules'):
                continue
            if path.is_symlink():
                target = path.resolve(strict=True)
                require(any(target.is_relative_to(boundary) for boundary in boundaries), 'Dependency link escapes pinned install trees')
                files[rel] = {'kind': 'link', 'link': os.readlink(path), 'resolved': str(target)}
                if target.is_dir():
                    visit(path, rel+'/', {*ancestors, physical})
                else:
                    require(target.is_file(), 'Nonregular dependency link target')
                    files[rel].update(bytes=target.stat().st_size, sha256=sha(target))
            elif path.is_dir():
                visit(path, rel+'/', {*ancestors, physical})
            else:
                require(path.is_file(), 'Nonregular installed dependency')
                files[rel] = {'kind': 'file', 'bytes': path.stat().st_size, 'sha256': sha(path)}
    visit(root, '', set())
    return files


def dependency_snapshot(a, b, node):
    shared = (a / 'node_modules').resolve(strict=True)
    require((b / 'node_modules').resolve(strict=True) == shared and shared.is_dir(), 'Checkouts do not share the same installed dependencies')
    node = node.resolve(strict=True); regular(node)
    npm_cli = (node.parent / 'npm').resolve(strict=True); regular(npm_cli)
    npm_root = npm_cli.parent.parent; regular(npm_root / 'package.json')
    metadata = json.loads((npm_root / 'package.json').read_bytes())
    require(metadata['name'] == 'npm' and npm_cli.name == 'npm-cli.js', 'Expected npm CLI from the frozen Node installation')
    boundaries = (shared, npm_root)
    queue = []
    for name in ('vitest', 'vite-node', 'tsx'):
        package = package_lookup(name, a)
        require(package is not None and package.is_relative_to(shared), f'Missing relevant package {name}')
        queue.append(package)
    packages, edges = {}, []
    while queue:
        package = queue.pop(0)
        if str(package) in packages:
            continue
        require(package.is_relative_to(shared), 'Package resolves outside shared dependencies')
        definition = json.loads((package / 'package.json').read_bytes())
        packages[str(package)] = {'name': definition['name'], 'version': definition['version'],
                                 'files': installed_tree(package, boundaries, True)}
        dependencies = {**definition.get('peerDependencies', {}), **definition.get('optionalDependencies', {}), **definition.get('dependencies', {})}
        required = set(definition.get('dependencies', {})) - set(definition.get('optionalDependencies', {}))
        for name in sorted(dependencies):
            target = package_lookup(name, package)
            require(target is not None or name not in required, f'Missing required package {name}')
            edges.append({'from': str(package), 'name': name, 'declaredRange': dependencies[name], 'resolved': str(target) if target else None})
            if target:
                queue.append(target)
    bin_path = shared / '.bin/vitest'; require(bin_path.is_file(), 'Missing Vitest command')
    require(bin_path.resolve().is_relative_to(shared), 'Vitest command escaped shared install')
    return {'sharedDirectory': str(shared), 'checkoutNodeModules': {str(a): str((a/'node_modules').resolve()), str(b): str((b/'node_modules').resolve())},
            'node': {'path': str(node), 'sha256': sha(node)},
            'npm': {'cli': str(npm_cli), 'sha256': sha(npm_cli), 'version': metadata['version'], 'root': str(npm_root), 'files': installed_tree(npm_root, boundaries, False)},
            'vitestBin': {'path': str(bin_path), 'resolved': str(bin_path.resolve()), 'sha256': sha(bin_path)},
            'packages': dict(sorted(packages.items())), 'resolutions': sorted(edges, key=lambda row: (row['from'], row['name'])),
            'excludedGeneratedCacheDirectories': sorted(CACHE_DIRS),
            'scope': 'Installed declared dependency/optional/installed-peer closure, npm bundled files; no registry-authenticity or all-unrelated-installs claim'}


def benchmark_environment(node, roots, source):
    npm_overrides = {key.lower() for key in OVERRIDES if key.startswith('npm_')}
    for key, value in source.items():
        if key in OVERRIDES or key.lower() in npm_overrides:
            require(not value, f'Unpinned execution override is active: {key}')
    for root in roots:
        for ancestor in (root, *root.parents):
            shadow = ancestor / 'node_modules/.bin/node'
            if shadow.exists() or shadow.is_symlink():
                require(shadow.resolve(strict=True) == node, f'npm PATH would shadow frozen Node: {shadow}')
    env = dict(source); env.pop('CI', None)
    env['PATH'] = str(node.parent) + os.pathsep + env.get('PATH', '')
    record = {'CI': None, 'PATH': env['PATH'], 'recorded': {k: env.get(k) for k in ENV_RECORDED},
              'npmOverrideAliases': {k: v for k, v in env.items() if k.lower() in npm_overrides},
              'policy': 'Only CI unset and frozen Node bin prepended; listed loader/binary/shell overrides rejected; other environment inherited, not a hermetic host claim'}
    return env, record


def npm_execution_config(node, npm_cli, roots, env, out, label):
    results = []
    for root in roots:
        for key in ('node-options', 'script-shell'):
            command = [str(node), str(npm_cli), 'config', 'get', key]
            row = {'command': command, 'cwd': str(root)}
            try:
                process = subprocess.run(command, cwd=root, env=env, text=True, capture_output=True)
                row.update(exitCode=process.returncode, stdout=process.stdout, stderr=process.stderr)
            except BaseException as error:
                row['error'] = {'name': type(error).__name__, 'message': str(error)}
                results.append(row)
                save(out, label, results)
                raise
            results.append(row)
    save(out, label, results)
    require(all(row['exitCode'] == 0 and row['stdout'].strip() == 'null' for row in results),
            'Effective npm node-options/script-shell must be default null; retained preflight contains details')
    return results


def fresh_output(out, protected):
    out = out.absolute()
    require(out.parent.resolve(strict=True) == out.parent, 'Output parent is aliased or not canonical')
    require(not out.exists() and not out.is_symlink(), 'Output already exists')
    require(all(not out.is_relative_to(root.resolve()) for root in protected), 'Output overlaps protected source/archive/dependency input')
    return out


def process_slot(out, pair, position, version, command, cwd, env, wait=None):
    stem = f'{pair:02}-{position}-{version}'; log = out / f'{stem}.log'
    started = {'pair': pair, 'position': position, 'version': version, 'status': 'started', 'startedAt': utc(),
               'command': command, 'cwd': str(cwd), 'log': log.name}
    save(out, f'{stem}.started.json', started)
    process = None; error = None; exit_code = None; measurements = parse_log('')
    try:
        with log.open('x') as stream:
            process = subprocess.Popen(command, cwd=cwd, env=env, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
            exit_code = (wait or (lambda child: child.wait()))(process)
    except BaseException as caught:
        error = caught
        if process is not None:
            if process.poll() is None:
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                    process.wait()
            exit_code = process.returncode
    measurement_error = None
    if log.is_file():
        try:
            measurements = parse_log(log.read_text())
        except Exception as caught:
            measurement_error = {'name': type(caught).__name__, 'message': str(caught)}
            if error is None:
                error = caught
    status = 'completed'
    if error:
        status = 'interrupted' if isinstance(error, KeyboardInterrupt) else 'error'
    terminal = {**started, 'status': status,
                'endedAt': utc(), 'exitCode': exit_code, 'logSha256': sha(log) if log.is_file() else None,
                'error': {'name': type(error).__name__, 'message': str(error)} if error else None,
                'measurementError': measurement_error, **measurements}
    save(out, f'{stem}.json', terminal)
    return terminal, error


def run(out, expected_self):
    require(__debug__, 'Optimized Python is unsupported')
    require(sha(regular(Path(__file__))) == expected_self, 'Unreviewed runner')
    require(sha(regular(PLAN)) == PLAN_SHA, 'Unreviewed plan')
    require(sha(regular(CONTROL_PIN)) == CONTROL_SHA and sha(regular(FREEZE)) == FREEZE_SHA, 'Unreviewed control/candidate freeze')
    control = json.loads(CONTROL_PIN.read_bytes()); frozen = json.loads(FREEZE.read_bytes())
    node = Path(frozen['executable']['path']).resolve(strict=True)
    require(sha(regular(node)) == frozen['executable']['sha256'], 'Frozen Node bytes differ')
    install_roots = [(root/'node_modules').resolve(strict=True) for root in (CONTROL, ROOT)]
    npm_root = (node.parent/'npm').resolve(strict=True).parent.parent
    out = fresh_output(out, [ROOT, CONTROL, ORIGINAL, ARCHIVE, *install_roots, npm_root])
    out.mkdir()
    runs = []
    try:
        dependencies = dependency_snapshot(CONTROL, ROOT, node)
        require(str((CONTROL/'node_modules').resolve()) == str(Path(control['sharedDependencies']).resolve()), 'Control dependency metadata differs')
        save(out, 'dependencies.json', dependencies)
        harness_pins = {name: sha(regular(ROOT/name)) for name in HARNESS}
        def verify():
            require(sha(regular(Path(__file__))) == expected_self and sha(regular(PLAN)) == PLAN_SHA, 'Runner or plan changed')
            require(sha(regular(CONTROL_PIN)) == CONTROL_SHA and sha(regular(FREEZE)) == FREEZE_SHA, 'Control or candidate freeze changed')
            control_source_set(CONTROL, [row['path'] for row in control['files']])
            for row in control['files']:
                require(sha(regular(CONTROL/row['path'])) == row['sha256'], f'Control bytes changed: {row["path"]}')
            for row in frozen['files']:
                require(sha(regular(ROOT/row['file'])) == row['sha256'], f'Candidate bytes changed: {row["file"]}')
            for name, expected in harness_pins.items():
                require(sha(regular(ROOT/name)) == expected and sha(regular(CONTROL/name)) == expected, f'Unchanged harness differs: {name}')
            require(sha(regular(node)) == frozen['executable']['sha256'], 'Node changed')
            require(sha(regular(Path(dependencies['npm']['cli']))) == dependencies['npm']['sha256'], 'npm CLI changed')
            require((ROOT/'node_modules').resolve() == (CONTROL/'node_modules').resolve() == Path(dependencies['sharedDirectory']), 'Shared dependency links changed')
            benchmark_environment(node, (ROOT, CONTROL), os.environ)
        env, env_policy = benchmark_environment(node, (ROOT, CONTROL), os.environ)
        def closure(name):
            code = "import {verifyAnalyzerFreeze} from './evaluation/quality/probes/unit-normalization/analyze-current.mjs'; await verifyAnalyzerFreeze(process.argv[1],process.argv[2]);"
            with (out/name).open('x') as log:
                process = subprocess.run([str(node), '--import', 'tsx', '--input-type=module', '-e', code, str(FREEZE), FREEZE_SHA], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
            require(process.returncode == 0, f'Candidate closure check failed: {name}')
        verify(); closure('closure-before.log')
        npm_execution_config(node, dependencies['npm']['cli'], (CONTROL, ROOT), env, out, 'npm-config-before.json')
        require(subprocess.check_output([str(node), '--version'], text=True).strip() == frozen['node'], 'Frozen Node version differs')
        command = [str(node), dependencies['npm']['cli'], 'run', 'test:perf']
        inputs = {'schema': 'q13c-performance-series-v2', 'startedAt': utc(), 'order': ORDER,
                  'controlManifestSha256': CONTROL_SHA, 'candidateFreezeSha256': FREEZE_SHA, 'scriptSha256': expected_self, 'planSha256': PLAN_SHA,
                  'harness': harness_pins, 'node': frozen['node'], 'command': command, 'environment': env_policy,
                  'dependencyManifestSha256': sha(out/'dependencies.json'),
                  'precision': 'Unchanged suite rounds rates/milliseconds/variance; full-precision assertions decide gates.',
                  'roots': {'A': str(CONTROL), 'B': str(ROOT)}}
        save(out, 'inputs.json', inputs)
        for pair, order in enumerate(ORDER, 1):
            for position, version in enumerate(order, 1):
                verify()
                npm_execution_config(node, dependencies['npm']['cli'], (CONTROL, ROOT), env, out, f'{pair:02}-{position}-{version}.npm-config.json')
                row, error = process_slot(out, pair, position, version, command, CONTROL if version == 'A' else ROOT, env)
                runs.append(row); print(json.dumps(row), flush=True)
                if error:
                    raise error
        verify(); closure('closure-after.log')
        npm_execution_config(node, dependencies['npm']['cli'], (CONTROL, ROOT), env, out, 'npm-config-after.json')
        require(dependency_snapshot(CONTROL, ROOT, node) == dependencies, 'Installed dependencies changed during series')
        report = {'completed': True, 'sourcesUnchanged': True, 'installedDependenciesUnchanged': True,
                  'inputsSha256': sha(out/'inputs.json'), 'runs': runs, **summarize(runs),
                  'scope': 'Fixed local series; all gate outcomes retained, no quality or general speed claim.'}
        save(out, 'report.json', report)
        return report
    except BaseException as error:
        save(out, 'failure.json', {'completed': False, 'runs': runs, 'summary': summarize(runs),
                                  'error': {'name': type(error).__name__, 'message': str(error)}})
        raise


def interrupt_series(signum, _frame):
    raise KeyboardInterrupt(f'Received signal {signum}')


if __name__ == '__main__':
    require(__debug__, 'Optimized Python is unsupported')
    require(len(sys.argv) == 3 and re.fullmatch(r'[a-f0-9]{64}', sys.argv[2]) is not None,
            'Usage: python3 q13c-performance-series-v2.py FRESH_OUTPUT EXTERNALLY_REVIEWED_RUNNER_SHA')
    signal.signal(signal.SIGTERM, interrupt_series)
    run(Path(sys.argv[1]), sys.argv[2])
