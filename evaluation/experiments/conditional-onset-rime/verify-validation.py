"""Authenticate packaged bytes and optional measured source identity."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--package', type=Path, default=Path(__file__).parent)
parser.add_argument('--repo', type=Path)
args = parser.parse_args()
index = json.loads((args.package / 'validation-index.json').read_text())
def identity(data):
    return dict(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
seen = set()
for record in index['records']:
    path = Path(record['path'])
    assert not path.is_absolute() and '..' not in path.parts
    assert record['path'] not in seen
    seen.add(record['path'])
    saved = (args.package / path).read_bytes()
    assert identity(saved) == record['saved'], str(path)
    original = gzip.decompress(saved) if record['compression'] == 'gzip' else saved
    assert identity(original) == record['original'], str(path)
if args.repo:
    for path, expected in index['sourcePins'].items():
        assert identity((args.repo / path).read_bytes()) == expected, path
    actual = {p.relative_to(args.repo).as_posix() for p in (args.repo / 'src').rglob('*') if p.is_file()}
    assert actual == {p for p in index['sourcePins'] if p.startswith('src/')}, 'Generator file set changed'
print(json.dumps(dict(passed=True, artifacts=len(seen), sourcesVerified=bool(args.repo),
                     scope='Evidence-byte and measured-source identity; not human or generator quality validation.')))
