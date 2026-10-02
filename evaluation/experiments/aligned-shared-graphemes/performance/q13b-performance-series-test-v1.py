"""Synthetic tests only: no corpus scan or actual benchmark is invoked."""
import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch

RUNNER = Path('/private/tmp/q13b-performance-series-v1.py')
m = ModuleType('timing_v2')
m.__file__ = str(RUNNER)
exec(compile(RUNNER.read_bytes(), str(RUNNER), 'exec'), m.__dict__)
FAKE_LOG = ('Performance: 4500 words/sec (10000 words in 2222ms)\n'
            'Batch variance trials: 1.00x, 2.00x, 3.00x (median 2.00x)\n'
            ' × src/core/generate.perf.test.ts > Word Generation Performance > should generate at least 4500 words/sec\n'
            ' ✓ src/core/generate.perf.test.ts > Word Generation Performance > should not degrade significantly with sequential seeds\n')


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value)


class Fixture(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='q13b-perf-synthetic-', dir='/private/tmp')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def installed(self):
        a, b, shared = self.root / 'A', self.root / 'B', self.root / 'installed/node_modules'
        for path in (a, b, shared):
            path.mkdir(parents=True)
        for path in (a, b):
            (path / 'node_modules').symlink_to(shared, target_is_directory=True)
        node = self.root / 'engine/bin/node'
        write(node, 'synthetic-node-bytes')
        npm = self.root / 'engine/lib/node_modules/npm'
        write(npm / 'package.json', json.dumps({'name': 'npm', 'version': '1.0.0'}))
        write(npm / 'bin/npm-cli.js', 'synthetic-npm-cli')
        write(npm / 'node_modules/bundled/index.js', 'synthetic-bundled-dependency')
        (node.parent / 'npm').symlink_to('../lib/node_modules/npm/bin/npm-cli.js')
        definitions = {
            'vitest': {'dependencies': {'core': '1'}, 'optionalDependencies': {'optional-missing': '1'}, 'peerDependencies': {'peer': '1'}},
            'vite-node': {'dependencies': {'core': '1'}},
            'tsx': {'dependencies': {'native': '1'}},
            'core': {}, 'native': {}, 'peer': {},
        }
        for name, extra in definitions.items():
            write(shared / name / 'package.json', json.dumps({'name': name, 'version': '1.0.0', **extra}))
            write(shared / name / 'index.js', f'synthetic {name}')
        write(shared / 'native/bin/native', 'synthetic-native-bytes')
        write(shared / 'unrelated/package.json', '{"name":"unrelated","version":"1"}')
        write(shared / 'unrelated/index.js', 'unrelated')
        (shared / '.bin').mkdir()
        (shared / '.bin/vitest').symlink_to('../vitest/index.js')
        return a, b, shared, node, npm


class ParserTests(unittest.TestCase):
    def test_logged_gate_status_not_rounded_rate_decides(self):
        row = m.parse_log(FAKE_LOG)
        self.assertEqual(row['reportedWordsPerSecond'], 4500)
        self.assertIs(row['floorGatePassed'], False)
        self.assertIs(row['varianceGatePassed'], True)
        self.assertEqual(row, m.parse_log('\x1b[31m' + FAKE_LOG + '\x1b[0m'))

    def test_missing_observation_is_unavailable(self):
        self.assertTrue(all(value is None for value in m.parse_log('process failed').values()))

    def test_duplicate_measurements_or_gate_are_errors(self):
        for line in FAKE_LOG.splitlines():
            with self.subTest(line=line), self.assertRaisesRegex(ValueError, 'Ambiguous'):
                m.parse_log(FAKE_LOG + line + '\n')

    def test_malformed_variance_trials_and_median_are_errors(self):
        for changed in ('1.00x, 2.00x', '0.00x, 2.00x, 3.00x', '1.00x, 3.00x, 4.00x'):
            with self.subTest(changed=changed), self.assertRaises(ValueError):
                m.parse_log(FAKE_LOG.replace('1.00x, 2.00x, 3.00x', changed))

    def rows(self):
        return [{'pair': pair, 'position': position, 'version': version,
                 'reportedWordsPerSecond': 1000 if version == 'A' else 500,
                 'floorGatePassed': False, 'varianceGatePassed': True}
                for pair, order in enumerate(m.ORDER, 1) for position, version in enumerate(order, 1)]

    def test_exact_six_pairs_and_partial_accounting(self):
        rows = self.rows()
        summary = m.summarize(rows)
        self.assertEqual(summary['medianPairedThroughputRatio'], .5)
        self.assertEqual(summary['gates']['B']['floorGatePassed'], {'passed': 0, 'failed': 6, 'unavailable': 0, 'notRun': 0})
        self.assertEqual(summary['pairs'][0]['roundingInterval'], [(500-.5)/(1000+.5), (500+.5)/(1000-.5)])
        summary = m.summarize(rows[:-1])
        self.assertEqual(summary['availablePairs'], 5)
        self.assertIsNone(summary['medianPairedThroughputRatio'])
        self.assertEqual(summary['gates']['A']['floorGatePassed']['notRun'], 1)
        rows[0]['floorGatePassed'] = None
        rows[0]['reportedWordsPerSecond'] = None
        summary = m.summarize(rows)
        self.assertEqual(summary['gates']['A']['floorGatePassed']['unavailable'], 1)
        self.assertIsNone(summary['pairs'][0]['BoverA'])

    def test_scheduled_prefix_rejects_duplicates_reordering_boolean_coordinates(self):
        rows = self.rows()
        for bad in ([rows[0], rows[0]], [rows[1], rows[0]], rows[1:], [{**rows[0], 'pair': True}]):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                m.summarize(bad)


class DependencyTests(Fixture):
    def test_reachable_packages_npm_native_and_resolution_records_are_pinned(self):
        a, b, shared, node, npm = self.installed()
        snap = m.dependency_snapshot(a, b, node)
        self.assertEqual(len(snap['packages']), 6)
        self.assertNotIn(str(shared / 'unrelated'), snap['packages'])
        self.assertIn('bin/native', snap['packages'][str(shared / 'native')]['files'])
        self.assertIn('node_modules/bundled/index.js', snap['npm']['files'])
        self.assertEqual([e['resolved'] for e in snap['resolutions'] if e['name'] == 'optional-missing'], [None])
        for path in (shared / 'native/bin/native', npm / 'bin/npm-cli.js', npm / 'node_modules/bundled/index.js', node):
            before = path.read_bytes()
            path.write_bytes(before + b'changed')
            self.assertNotEqual(snap, m.dependency_snapshot(a, b, node))
            path.write_bytes(before)
        self.assertEqual(snap, m.dependency_snapshot(a, b, node))

    def test_generated_caches_and_unrelated_installs_are_excluded_but_extra_runtime_file_is_not(self):
        a, b, shared, node, npm = self.installed()
        snap = m.dependency_snapshot(a, b, node)
        for cache in m.CACHE_DIRS:
            write(shared / 'vitest' / cache / 'generated.js', 'cache')
            write(npm / cache / 'generated.js', 'cache')
        write(shared / 'unrelated/new-runtime.js', 'unrelated')
        self.assertEqual(snap, m.dependency_snapshot(a, b, node))
        write(shared / 'vitest/new-runtime.js', 'relevant')
        self.assertNotEqual(snap, m.dependency_snapshot(a, b, node))

    def test_new_installed_optional_and_nested_resolution_change_snapshot(self):
        a, b, shared, node, _ = self.installed()
        snap = m.dependency_snapshot(a, b, node)
        write(shared / 'optional-missing/package.json', '{"name":"optional-missing","version":"1"}')
        self.assertNotEqual(snap, m.dependency_snapshot(a, b, node))
        nested = shared / 'vitest/node_modules/core'
        write(nested / 'package.json', '{"name":"core","version":"2"}')
        changed = m.dependency_snapshot(a, b, node)
        self.assertIn(str(nested), changed['packages'])
        self.assertEqual(next(e['resolved'] for e in changed['resolutions'] if e['from'] == str(shared / 'vitest') and e['name'] == 'core'), str(nested))

    def test_distinct_install_links_and_missing_required_package_reject(self):
        a, b, shared, node, _ = self.installed()
        other = self.root / 'other'; other.mkdir()
        (b / 'node_modules').unlink(); (b / 'node_modules').symlink_to(other)
        with self.assertRaisesRegex(ValueError, 'same installed'):
            m.dependency_snapshot(a, b, node)
        (b / 'node_modules').unlink(); (b / 'node_modules').symlink_to(shared)
        (shared / 'core/package.json').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing required'):
            m.dependency_snapshot(a, b, node)

    def test_dependency_links_record_inbounds_target_and_reject_escape_cycle(self):
        a, b, shared, node, _ = self.installed()
        alias = shared / 'vitest/runtime-alias'
        alias.symlink_to('../core/index.js')
        snap = m.dependency_snapshot(a, b, node)
        self.assertEqual(snap['packages'][str(shared / 'vitest')]['files']['runtime-alias']['link'], '../core/index.js')
        alias.unlink(); write(self.root / 'outside.js', 'outside'); alias.symlink_to(self.root / 'outside.js')
        with self.assertRaisesRegex(ValueError, 'escapes'):
            m.dependency_snapshot(a, b, node)
        alias.unlink(); alias.symlink_to(shared / 'vitest', target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'cycle'):
            m.dependency_snapshot(a, b, node)


class BoundariesTests(Fixture):
    def test_control_exact_source_set_rejects_extra_test_and_parent_alias(self):
        control = self.root / 'control'
        write(control / 'src/a.ts', 'a')
        m.control_source_set(control, ['src/a.ts', 'package.json'])
        write(control / 'src/extra.perf.test.ts', 'test')
        with self.assertRaisesRegex(ValueError, 'file set'):
            m.control_source_set(control, ['src/a.ts'])
        (control / 'src/extra.perf.test.ts').unlink()
        alias = self.root / 'alias'; alias.symlink_to(control, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'Aliased'):
            m.control_source_set(alias, ['src/a.ts'])

    def test_output_rejects_existing_dangling_alias_and_all_protected_descendants(self):
        protected = self.root / 'original'; protected.mkdir()
        self.assertEqual(m.fresh_output(self.root / 'new', [protected]), self.root / 'new')
        with self.assertRaises(ValueError):
            m.fresh_output(protected / 'new', [protected])
        existing = self.root / 'exists'; existing.mkdir()
        dangling = self.root / 'dangling'; dangling.symlink_to(self.root / 'missing')
        alias = self.root / 'alias'; alias.symlink_to(protected, target_is_directory=True)
        for path in (existing, dangling, alias / 'new'):
            with self.subTest(path=path), self.assertRaises(ValueError):
                m.fresh_output(path, [protected])

    def test_node_environment_policy_and_npm_case_aliases(self):
        a, b, shared, node, _ = self.installed()
        env, record = m.benchmark_environment(node, (a, b), {'PATH': '/synthetic/bin', 'CI': 'true', 'NO_COLOR': '1', 'KEEP': 'yes'})
        self.assertNotIn('CI', env)
        self.assertEqual(env['PATH'], f'{node.parent}:/synthetic/bin')
        self.assertEqual(env['KEEP'], 'yes')
        self.assertNotIn('KEEP', record['recorded'])
        for key in (*m.OVERRIDES, 'NPM_CONFIG_NODE_OPTIONS', 'NPM_CONFIG_SCRIPT_SHELL'):
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, 'override'):
                m.benchmark_environment(node, (a, b), {key: 'active'})
        (shared / '.bin/node').symlink_to(node)
        m.benchmark_environment(node, (a, b), {})
        (shared / '.bin/node').unlink(); (shared / '.bin/node').symlink_to(shared / 'native/bin/native')
        with self.assertRaisesRegex(ValueError, 'shadow'):
            m.benchmark_environment(node, (a, b), {})

    def test_effective_npm_preflight_retains_success_failure_and_error(self):
        a, b = self.root / 'A', self.root / 'B'
        output = self.root / 'output'; output.mkdir()
        node, cli = Path('/synthetic/node'), Path('/synthetic/npm-cli.js')
        with patch.object(m.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout='null\n', stderr='')) as call:
            m.npm_execution_config(node, cli, (a, b), {}, output, 'pass.json')
            self.assertEqual(call.call_count, 4)
            self.assertEqual(call.call_args_list[0].args[0], [str(node), str(cli), 'config', 'get', 'node-options'])
        with patch.object(m.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout='/custom/shell\n', stderr='')):
            with self.assertRaisesRegex(ValueError, 'default null'):
                m.npm_execution_config(node, cli, (a, b), {}, output, 'fail.json')
        self.assertEqual(len(json.loads((output / 'fail.json').read_text())), 4)
        with patch.object(m.subprocess, 'run', side_effect=OSError('synthetic spawn failure')):
            with self.assertRaises(OSError):
                m.npm_execution_config(node, cli, (a, b), {}, output, 'error.json')
        self.assertEqual(json.loads((output / 'error.json').read_text())[0]['error']['name'], 'OSError')

    def test_optimized_python_rejects_before_launch(self):
        output = self.root / 'must-not-be-created'
        process = subprocess.run([sys.executable, '-O', str(RUNNER), str(output), '0'*64], text=True, capture_output=True)
        self.assertNotEqual(process.returncode, 0)
        self.assertIn('Optimized Python is unsupported', process.stderr)
        self.assertFalse(output.exists())


class ProcessRetentionTests(Fixture):
    def execute(self, code, wait=None):
        return m.process_slot(self.root, 1, 1, 'A', [sys.executable, '-c', code], self.root, dict(os.environ), wait)

    def assert_retained(self, row):
        self.assertEqual(json.loads((self.root / '01-1-A.json').read_bytes()), row)
        self.assertEqual(row['logSha256'], m.sha(self.root / row['log']))
        started = json.loads((self.root / '01-1-A.started.json').read_bytes())
        self.assertEqual(started['status'], 'started')
        self.assertEqual(started['startedAt'], row['startedAt'])

    def test_nonzero_suite_is_completed_retained_and_not_retried(self):
        row, error = self.execute(f'print({FAKE_LOG!r}); raise SystemExit(1)')
        self.assertIsNone(error)
        self.assertEqual(row['status'], 'completed')
        self.assertEqual(row['exitCode'], 1)
        self.assertIs(row['floorGatePassed'], False)
        self.assertEqual(row['reportedWordsPerSecond'], 4500)
        self.assert_retained(row)
        self.assertEqual(len(list(self.root.glob('*.log'))), 1)

    def test_spawn_failure_has_started_error_and_empty_log_hash(self):
        row, error = m.process_slot(self.root, 1, 1, 'A', ['/synthetic/nonexistent/program'], self.root, dict(os.environ))
        self.assertIsInstance(error, FileNotFoundError)
        self.assertEqual(row['status'], 'error')
        self.assertIsNone(row['exitCode'])
        self.assertIsNone(row['reportedWordsPerSecond'])
        self.assert_retained(row)

    def test_parser_ambiguity_retains_raw_log_and_error(self):
        row, error = self.execute(f'print({(FAKE_LOG + FAKE_LOG)!r})')
        self.assertIsInstance(error, ValueError)
        self.assertEqual(row['status'], 'error')
        self.assertEqual(row['exitCode'], 0)
        self.assertEqual(row['measurementError']['name'], 'ValueError')
        self.assert_retained(row)

    def test_interruption_keeps_started_partial_metrics_and_kills_child_group(self):
        sentinel = self.root / 'ready'
        code = f'import pathlib,time; print({FAKE_LOG!r},flush=True); pathlib.Path({str(sentinel)!r}).write_text("ready"); time.sleep(30)'
        child = []
        def interrupt(process):
            child.append(process)
            deadline = time.monotonic() + 5
            while not sentinel.exists() and time.monotonic() < deadline:
                time.sleep(.01)
            self.assertTrue(sentinel.exists())
            self.assertTrue((self.root / '01-1-A.started.json').exists())
            raise KeyboardInterrupt('synthetic interruption')
        row, error = self.execute(code, interrupt)
        self.assertIsInstance(error, KeyboardInterrupt)
        self.assertEqual(row['status'], 'interrupted')
        self.assertLess(row['exitCode'], 0)
        self.assertIsNotNone(child[0].poll())
        self.assertEqual(row['reportedWordsPerSecond'], 4500)
        self.assert_retained(row)


class PreparationTests(Fixture):
    def prepared(self):
        a, b, _shared, node, _npm = self.installed()
        for path in m.HARNESS:
            write(a / path, 'identical synthetic harness')
            write(b / path, 'identical synthetic harness')
        control = self.root / 'control-pin.json'
        freeze = self.root / 'candidate-freeze.json'
        plan = self.root / 'plan.md'
        write(control, json.dumps({'sharedDependencies': str(b/'node_modules'), 'files': [
            {'path': path, 'sha256': m.sha(a/path)} for path in m.HARNESS]}))
        write(freeze, json.dumps({'executable': {'path': str(node), 'sha256': m.sha(node)},
                                  'node': 'synthetic-node-version', 'files': [
                                      {'file': path, 'sha256': m.sha(b/path)} for path in m.HARNESS]}))
        write(plan, 'Synthetic plan: no real timing')
        overrides = {'ROOT': b, 'CONTROL': a, 'ORIGINAL': self.root/'original', 'ARCHIVE': self.root/'archive',
                     'CONTROL_PIN': control, 'CONTROL_SHA': m.sha(control), 'FREEZE': freeze, 'FREEZE_SHA': m.sha(freeze),
                     'PLAN': plan, 'PLAN_SHA': m.sha(plan)}
        return overrides, node

    def test_dependency_preflight_error_is_retained_before_any_slot(self):
        overrides, _ = self.prepared()
        output = self.root / 'retained-failure'
        with patch.multiple(m, **overrides), patch.object(m, 'dependency_snapshot', side_effect=ValueError('synthetic dependency failure')):
            with self.assertRaisesRegex(ValueError, 'synthetic dependency'):
                m.run(output, m.sha(RUNNER))
        failure = json.loads((output/'failure.json').read_bytes())
        self.assertFalse(failure['completed'])
        self.assertEqual(failure['runs'], [])
        self.assertEqual(failure['summary']['gates']['A']['floorGatePassed']['notRun'], 6)
        self.assertEqual(list(output.glob('*.started.json')), [])

    def test_full_control_flow_uses_frozen_node_npm_and_fixed_schedule_with_mock_children(self):
        overrides, node = self.prepared()
        output = self.root / 'synthetic-series'
        calls = []
        def fake_slot(out, pair, position, version, command, cwd, env):
            calls.append((pair, position, version, command, str(cwd), env['PATH']))
            return {'pair': pair, 'position': position, 'version': version, 'status': 'completed', 'exitCode': 1,
                    **m.parse_log(FAKE_LOG)}, None
        with patch.multiple(m, **overrides), patch.object(m, 'process_slot', side_effect=fake_slot), \
             patch.object(m.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout='null\n', stderr='')), \
             patch.object(m.subprocess, 'check_output', return_value='synthetic-node-version\n'), \
             contextlib.redirect_stdout(io.StringIO()):
            report = m.run(output, m.sha(RUNNER))
        self.assertEqual([(p, q, v) for p, q, v, *_ in calls], [(p, q, v) for p, order in enumerate(m.ORDER, 1) for q, v in enumerate(order, 1)])
        expected_command = [str(node), str((node.parent/'npm').resolve()), 'run', 'test:perf']
        self.assertTrue(all(row[3] == expected_command for row in calls))
        self.assertTrue(all(row[5].startswith(str(node.parent)+os.pathsep) for row in calls))
        self.assertEqual(report['gates']['A']['floorGatePassed']['failed'], 6)
        self.assertEqual(report['gates']['B']['floorGatePassed']['failed'], 6)
        self.assertTrue(report['installedDependenciesUnchanged'])
        self.assertEqual(len(list(output.glob('*.npm-config.json'))), 12)
        self.assertTrue((output/'closure-before.log').exists() and (output/'closure-after.log').exists())

    def test_exclusive_publication_and_sigterm_handler(self):
        m.save(self.root, 'one.json', {'first': True})
        with self.assertRaises(FileExistsError):
            m.save(self.root, 'one.json', {'second': True})
        self.assertEqual(json.loads((self.root/'one.json').read_text()), {'first': True})
        with self.assertRaisesRegex(KeyboardInterrupt, 'signal 15'):
            m.interrupt_series(15, None)


if __name__ == '__main__':
    unittest.main(verbosity=2)
