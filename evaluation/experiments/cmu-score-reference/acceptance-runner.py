"""Preregistered score-reference construction/CLI acceptance. Frozen before execution."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path('/Users/ryanbetts/.codex/worktrees/linguistic-rejection/word-generator')
DIRECTORY = Path('/private/tmp/q15-score-acceptance-v1')
SOURCE = Path('/private/tmp/q15c2-acceptance-v1/raw source.dict')
FREEZE = ROOT / 'evaluation/experiments/cmu-score-reference/source-review-freeze-v1.json'
REVIEW = Path('/private/tmp/q15-score-parent-source-review-v1.json')
sha = lambda data: hashlib.sha256(data).hexdigest()


def save(path, value):
    with path.open('x', encoding='utf-8') as handle:
        json.dump(value, handle, indent=2); handle.write('\n')


DIRECTORY.mkdir()
freeze_bytes, review_bytes = FREEZE.read_bytes(), REVIEW.read_bytes()
assert sha(freeze_bytes) == 'cb0e284b1b694b51308df3e13223b018f9dc4a7201e9f1df9b0e5f95e0ee92d1'
assert sha(review_bytes) == 'f792ed0863de483a442aa3a7c2ce633cbbc92df712544b4ff591ed21c11e4ef6'
freeze = json.loads(freeze_bytes)
old = json.loads((ROOT / 'evaluation/experiments/cmu-score-reference/parent-files.json').read_bytes())
allowed = {'TUNING.md', 'docs/phonotactic-scoring.md', 'scripts/generate-baseline.ts'}
protected = {path: identity for path, identity in old.items() if path not in allowed}
raw = SOURCE.read_bytes()
assert sha(raw) == '81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22'
local_source = DIRECTORY / 'raw source.dict'; local_source.write_bytes(raw)
(DIRECTORY / 'parent-source-review.json').write_bytes(review_bytes)
frozen_files = [{'path': item['path'], 'content': (ROOT / item['path']).read_text()} for item in freeze['files']]
(DIRECTORY / 'source-review-files.json.gz').write_bytes(gzip.compress((json.dumps(frozen_files, ensure_ascii=False) + '\n').encode(), mtime=0))
alias = DIRECTORY / 'score builder alias.ts'; alias.symlink_to(ROOT / 'scripts/generate-baseline.ts')
node = ['node', '--import', 'tsx', str(ROOT / 'scripts/generate-baseline.ts')]
tsx = [str(ROOT / 'node_modules/.bin/tsx'), str(alias)]
first, second = DIRECTORY / 'node artifact.json', DIRECTORY / 'alias artifact.json'
common = ['--policy', 'cmu-ascii-first-v1', '--projection', 'cmu-arpabet-base-v1', '--scorer', 'legacy-arpabet-add-one-log2-v1']


def build_args(source, out):
    return ['--source', str(source), *common, '--out', str(out)]


def stable():
    assert FREEZE.read_bytes() == freeze_bytes and REVIEW.read_bytes() == review_bytes
    for item in freeze['files']:
        value = (ROOT / item['path']).read_bytes()
        assert len(value) == item['bytes'] and sha(value) == item['sha256'], item['path']
    for path, identity in protected.items():
        assert sha((ROOT / path).read_bytes()) == identity, path
    assert SOURCE.read_bytes() == local_source.read_bytes() == raw


cases = []

def case(name, command, cwd=ROOT, code=1, stderr=None, stdout=None, absent=None):
    cases.append({'name': name, 'command': command, 'cwd': str(cwd), 'expectedExitCode': code,
                  'stderrContains': stderr, 'stdoutContains': stdout, 'absentOutput': str(absent) if absent else None})


case('help', tsx + ['--help'], DIRECTORY, 0, stdout='legacy-arpabet-add-one-log2-v1')
case('no-arguments', node, stderr='All five source, policy, projection, scorer and output arguments are required.')
case('first-build', node + build_args(local_source, first), code=0, stdout='"entries":117485')
case('second-build', tsx + build_args('raw source.dict', 'alias artifact.json'), DIRECTORY, 0, stdout='"entries":117485')
case('existing-output', node + build_args(local_source, first), stderr='Output already exists')
for name, target in [('existing-symlink', first), ('dangling-symlink', DIRECTORY / 'never-created.json')]:
    link = DIRECTORY / (name + '.json'); link.symlink_to(target)
    case(name, node + build_args(local_source, link), stderr='Output already exists')
case('source-as-output', node + build_args(local_source, local_source), stderr='Output is a protected')
hard = DIRECTORY / 'source hardlink.dict'; os.link(local_source, hard)
case('source-hardlink-output', node + build_args(local_source, hard), stderr='Output already exists')
directory_alias = DIRECTORY / 'source directory alias'; directory_alias.symlink_to(DIRECTORY, target_is_directory=True)
case('source-directory-alias-output', node + build_args(local_source, directory_alias / local_source.name), stderr='Output is a protected')
for name, content in [('empty-source', b''), ('truncated-source', raw[:500]), ('invalid-utf8', b'\xff'), ('changed-source-case', raw.upper())]:
    bad, out = DIRECTORY / (name + '.dict'), DIRECTORY / (name + '.json'); bad.write_bytes(content)
    case(name, node + build_args(bad, out), stderr='Raw source bytes differ from pinned UTF-8 dictionary.', absent=out)
missing_out = DIRECTORY / 'missing-source.json'
case('missing-source', node + build_args(DIRECTORY / 'missing.dict', missing_out), stderr='ENOENT', absent=missing_out)
for name, extra in [('unknown-table-option', ['--table', 'new-transition-reference.json']), ('duplicate-argument', ['--source', str(local_source)]), ('valueless-argument', ['--out'])]:
    out = DIRECTORY / (name + '.json')
    case(name, node + build_args(local_source, out) + extra, stderr='Invalid, repeated, or valueless argument:', absent=out)
for name, old_value, replacement in [('unsupported-policy', 'cmu-ascii-first-v1', 'all'), ('unsupported-projection', 'cmu-arpabet-base-v1', 'native'), ('unsupported-scorer', 'legacy-arpabet-add-one-log2-v1', 'new-table')]:
    out = DIRECTORY / (name + '.json')
    args = [replacement if value == old_value else value for value in build_args(local_source, out)]
    case(name, node + args, stderr='Unsupported population, projection or scorer profile.', absent=out)
for name, target in [('protected-active-score-baseline', ROOT / 'src/phonotactic/english-baseline.json'), ('protected-active-table', ROOT / 'src/phonotactic/arpabet-bigrams.ts'), ('protected-prior-transition-package', ROOT / 'evaluation/experiments/cmu-transition-builder/score-must-not-exist.json'), ('protected-demo', ROOT / 'demo/score-must-not-exist.json')]:
    case(name, node + build_args(local_source, target), stderr='Output is a protected', absent=None if target.exists() else target)
for name, target in [('protected-evidence-alias', ROOT / 'evaluation/experiments'), ('protected-runtime-alias', ROOT / 'src')]:
    link = DIRECTORY / name; link.symlink_to(target, target_is_directory=True)
    out = link / 'score-must-not-exist.json'
    case(name, node + build_args(local_source, out), stderr='Output is a protected', absent=out)
case('missing-output-parent', node + build_args(local_source, DIRECTORY / 'missing/out.json'), stderr='ENOENT', absent=DIRECTORY / 'missing/out.json')
# Isolated entrypoint copies exercise real provenance failures without changing protected original files.
for name, changed_path, expected_error in [
    ('changed-historical-table', 'src/phonotactic/arpabet-bigrams.ts', 'pinned historical table'),
    ('changed-historical-scorer', 'src/phonotactic/score.ts', 'pinned historical scorer'),
    ('changed-published-parent', 'evaluation/experiments/cmu-matched-reference/reference.json.gz', 'compressed parent bytes'),
]:
    clone = DIRECTORY / name; clone.mkdir()
    for path in [*freeze['production']['paths'], 'package.json', 'evaluation/experiments/cmu-matched-reference/reference.json.gz']:
        target = clone / path; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes((ROOT / path).read_bytes())
    with (clone / changed_path).open('ab') as handle: handle.write(b'\n// provenance fixture\n')
    out = DIRECTORY / (name + '.json')
    command = ['node', '--import', 'tsx', str(clone / 'scripts/generate-baseline.ts'), *build_args(local_source, out)]
    case(name, command, stderr=expected_error, absent=out)
case('independent-full-row-recount', ['python3', str(ROOT / 'evaluation/corpus/verify-score-reference.py'), '--root', str(ROOT), '--source', str(local_source), '--artifact', str(first), '--out', str(DIRECTORY / 'verification.json')], code=0, stdout='"allOrderedRowsCompared": true')
plan = {'version': 'cmu-score-reference-formal-cli-matrix-v1', 'runnerSha256': sha(Path(__file__).read_bytes()),
        'reviewFreezeSha256': sha(freeze_bytes), 'parentReviewSha256': sha(review_bytes), 'sourceSha256': sha(raw),
        'constructionOrder': ['node-import-tsx-root-cwd', 'symlinked-tsx-unrelated-cwd-relative-spaced-paths'],
        'twoBuildsMustBeByteIdentical': True, 'fullIndependentRowsAndMetadataRequired': True,
        'numericTolerance': {'absolute': 1e-10, 'relative': 1e-12}, 'allInputsAndFrozenImplementationMustRemainStable': True, 'commands': cases}
save(DIRECTORY / 'execution-plan.json', plan)
stable(); records = []; artifact_bytes = None
for item in cases:
    if item['absentOutput']: assert not Path(item['absentOutput']).exists(), item['name']
    result = subprocess.run(item['command'], cwd=item['cwd'], text=True, capture_output=True)
    record = {**item, 'exitCode': result.returncode, 'stdout': result.stdout, 'stderr': result.stderr}
    save(DIRECTORY / ('command-' + item['name'] + '.json'), record); records.append(record)
    stable()
    assert result.returncode == item['expectedExitCode'], record
    for stream in ['stdout', 'stderr']:
        expected = item[stream + 'Contains']
        if expected: assert expected in record[stream], record
    if item['absentOutput']: assert not Path(item['absentOutput']).exists(), item['name']
    if item['name'] == 'first-build':
        artifact_bytes = first.read_bytes()
        artifact = json.loads(artifact_bytes)
        assert artifact['artifact']['implementation']['digest'] == freeze['production']['digest']
    if item['name'] == 'second-build': assert second.read_bytes() == artifact_bytes
    print(json.dumps({'case': item['name'], 'exitCode': result.returncode}), flush=True)
assert first.read_bytes() == second.read_bytes() == artifact_bytes
assert not (DIRECTORY / 'never-created.json').exists()
assert hard.read_bytes() == raw
proof = json.loads((DIRECTORY / 'verification.json').read_bytes())
stable()
report = {'version': 'cmu-legacy-score-reference-formal-acceptance-v1', 'executionPlanSha256': sha((DIRECTORY / 'execution-plan.json').read_bytes()),
          'runnerSha256': sha(Path(__file__).read_bytes()), 'reviewFreezeSha256': sha(freeze_bytes), 'parentReviewSha256': sha(review_bytes),
          'artifactSha256': sha(artifact_bytes), 'artifactDigest': artifact['digest'], 'implementationDigest': artifact['artifact']['implementation']['digest'],
          'independentVerificationSha256': sha((DIRECTORY / 'verification.json').read_bytes()), 'entries': proof['entries'],
          'phoneEvents': proof['phoneEvents'], 'transitionEvents': proof['transitionEvents'], 'historicalModel': proof['historicalModel'],
          'summary': artifact['artifact']['scores']['summary'], 'numericComparison': proof['numericComparison'],
          'twoFreshBuildsByteIdentical': True, 'allOrderedRowsCompared': proof['allOrderedRowsCompared'], 'allMetadataExact': proof['allMetadataExact'],
          'sourceAndArtifactStable': proof['sourceAndArtifactStable'], 'protectedParentFilesUnchanged': len(protected),
          'commands': [{'name': item['name'], 'exitCode': item['exitCode'], 'expectedExitCode': item['expectedExitCode']} for item in records]}
save(DIRECTORY / 'acceptance.json', report)
print(json.dumps(report, indent=2))
