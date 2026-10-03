"""Retain and reject four corrupted complete Q20 evidence packages."""
import gzip
import importlib.util
import json
from pathlib import Path
import shutil

HERE = Path(__file__).resolve().parent
STAGE = Path('/private/tmp/q20-publication-stage-v1')
OUT = Path('/private/tmp/q20-publication-corruptions-v1')


if __name__ == '__main__':
    OUT.mkdir(mode=0o700)
    spec = importlib.util.spec_from_file_location('q20_verifier', HERE / 'verify.py')
    verifier = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(verifier)
    results = []
    for name in ('wrong-gate-count', 'forged-native-pass', 'missing-full-stream', 'corrupted-log-byte'):
        root = OUT / name
        shutil.copytree(STAGE, root)
        index = json.loads((root / 'validation-index.json').read_bytes())
        if name == 'wrong-gate-count':
            index['gateOutcomes']['commands'] = 73
        elif name == 'forged-native-pass':
            record = next(record for record in index['records'] if record['origin'] == '/private/tmp/q20-gates-v1/complete.json')
            path = root / record['path']
            raw = path.read_bytes()
            report = json.loads(gzip.decompress(raw) if record['compression'] == 'gzip' else raw)
            next(row for row in report['results'] if row['name'] == 'native-pair-1-candidate')['code'] = 0
            original = (json.dumps(report, indent=2) + '\n').encode()
            saved = gzip.compress(original, mtime=0) if record['compression'] == 'gzip' else original
            path.write_bytes(saved)
            record['saved'], record['original'] = verifier.pin_bytes(saved), verifier.pin_bytes(original)
        elif name == 'missing-full-stream':
            path = root / 'retained-local-index.json'
            local = json.loads(path.read_bytes())
            local['streams'].pop()
            path.write_text(json.dumps(local, indent=2) + '\n')
            index['localIndex'] = verifier.pin(path)
        else:
            record = next(record for record in index['records'] if record['origin'].endswith('/q20-gates-v1/original-candidate-unit.log'))
            path = root / record['path']
            path.write_bytes(path.read_bytes() + b'corrupted')
        (root / 'validation-index.json').write_text(json.dumps(index, indent=2) + '\n')
        try:
            verifier.verify(root)
        except (AssertionError, KeyError, ValueError, OSError) as error:
            results.append({'case': name, 'rejected': True, 'error': repr(error), 'preservedPackage': str(root)})
        else:
            raise AssertionError('Corrupted package accepted: ' + name)
    (OUT / 'complete.json').write_text(json.dumps({'passed': True, 'corruptions': len(results), 'results': results,
        'scope': 'Whole-package corrupted bytes, counts, self-consistent forged native verdict and missing full-stream registration rejected; no original experiment or dataset modified.'}, indent=2) + '\n')
    print(json.dumps({'passed': True, 'corruptions': len(results)}))
