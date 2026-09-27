"""Run the complete independent recount only after production sealing."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

pins_path = Path('/private/tmp/q14b-full-recount-source-pins-v1.json')
pins = json.loads(pins_path.read_text())
archive = Path('/private/tmp/q14a-split-vowels-candidate-v2')
analysis = Path('/private/tmp/q14b-control-analysis-v1')
output = Path('/private/tmp/q14b-control-independent-v1.json')
authority = Path('/private/tmp/q14b-control-independent-authority-v1.json')

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def verify_sources():
    for path, expected in pins['sources'].items():
        assert digest(path) == expected, path
    assert sys.executable == pins['python'] and sys.version == pins['pythonVersion']

verify_sources()
assert not output.exists() and not authority.exists(), 'refuse to overwrite evidence'
assert digest(archive / 'manifest.json') == pins['manifestSha256']
complete_hash = digest(analysis / 'complete.json')
complete = json.loads((analysis / 'complete.json').read_text())
assert complete['passed'] is True and complete['words'] == 200000
runner = next(path for path in pins['sources'] if path.endswith('/recount_corpus.py'))
result = subprocess.run([sys.executable, runner, str(archive), str(analysis), pins['manifestSha256'], complete_hash], env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'}, text=True, capture_output=True)
if result.returncode:
    sys.stderr.write(result.stderr)
    sys.stderr.write(result.stdout)
    raise SystemExit(result.returncode)
report = json.loads(result.stdout)
assert report['passed'] is True and report['words'] == 200000
verify_sources()
assert digest(analysis / 'complete.json') == complete_hash
output.write_text(json.dumps(report, indent=2) + '\n')
authority.write_text(json.dumps({'sourcePins': pins, 'sourcePinsSha256': digest(pins_path), 'completeSha256': complete_hash, 'reportSha256': digest(output), 'wrapperSha256': digest(__file__)}, indent=2) + '\n')
print(json.dumps(report, indent=2), flush=True)
