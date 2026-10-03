"""Full Q20 common-evaluator/ordinal-stream comparison after reserved timing."""
import hashlib
import json
from pathlib import Path
import subprocess
import time

BASE = Path(__file__).parent
TOOLS = BASE.parent / 'summary-tools'
OUT = Path('/private/tmp/q20-paired-summary-driver-v2')
UPSTREAM = Path('/private/tmp/q20-gates-driver-v2')
NODE = '/Users/ryanbetts/.nvm/versions/node/v24.11.1/bin/node'
LOADER = '/Users/ryanbetts/Code/unglish/word-generator/node_modules/tsx/dist/loader.mjs'


def pin(path):
    raw = path.read_bytes()
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def pins():
    paths = [Path(__file__)] + [path for path in TOOLS.iterdir() if path.is_file()]
    return {str(path): pin(path) for path in sorted(paths)}


OUT.mkdir()
before = pins()
(OUT / 'before.json').write_text(json.dumps({'inputPins': before, 'upstream': str(UPSTREAM),
    'scope': 'All original evaluator measures/strata/seed deltas plus all 400000 ordinal pairs. Run only after reserved original/configured timing; no bulk overlap.'}, indent=2) + '\n')
try:
    print('Q20 full evaluator/400000 ordinal-pair comparison queued after all original/configured gates and timing.', flush=True)
    while not (UPSTREAM / 'complete.json').exists():
        assert not (UPSTREAM / 'failure.json').exists(), 'Gate infrastructure failed; summary not started'
        time.sleep(15)
    gates = json.loads((UPSTREAM / 'complete.json').read_bytes())
    assert gates['passed'] is True and gates['commands'] == 74
    assert gates['nativeTimingRuns'] == 12 and gates['configuredTimingRuns'] == 48
    assert pins() == before
    command = [NODE, '--import', LOADER, str(TOOLS / 'compare-summaries.mjs')]
    with (OUT / 'comparison.log').open('x') as log:
        process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    assert process.returncode == 0, 'Comparison failed; all earlier results and partial evidence retained'
    report_path = Path('/private/tmp/q20-paired-summary-v1/complete.json')
    report = json.loads(report_path.read_bytes())
    assert report['passed'] is True and report['wordsPerArm'] == 400000 and report['pairedWords'] == 400000
    assert len(report['pairedStreams']) == 40 and all(record['words'] == 10000 for record in report['pairedStreams'])
    assert report['before'] == report['after'] and pins() == before
    (OUT / 'complete.json').write_text(json.dumps({'passed': True, 'wordsPerArm': 400000,
        'pairedWords': 400000, 'inputPins': before, 'gateCompletion': pin(UPSTREAM / 'complete.json'),
        'command': command, 'exitCode': process.returncode, 'comparisonCompletion': pin(report_path),
        'scope': 'Full common-evaluator/ordinal-pair summaries; independent law and feature/source survival remain separately bound. Extra RNG draws alter stream alignment. No fixed-phone causal pairing or human-quality claim.'}, indent=2) + '\n')
except Exception as error:
    (OUT / 'failure.json').write_text(json.dumps({'error': str(error), 'type': type(error).__name__}, indent=2) + '\n')
    raise
