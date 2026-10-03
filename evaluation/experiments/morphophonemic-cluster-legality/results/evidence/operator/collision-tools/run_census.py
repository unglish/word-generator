import argparse
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path
import collisions
import lineage_recount

parser = argparse.ArgumentParser()
parser.add_argument('archive', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
args.output.mkdir()
def pin(path):
    digest = hashlib.sha256()
    size = 0
    with path.open('rb') as stream:
        for data in iter(lambda: stream.read(1024 * 1024), b''):
            size += len(data)
            digest.update(data)
    return dict(bytes=size, sha256=digest.hexdigest())
tools = Path(__file__).parent
tool_pins = {p.name: pin(p) for p in tools.iterdir() if p.suffix == '.py'}
archive = args.archive
freeze = Path(str(archive) + '-freeze')
seal = json.loads((freeze / 'complete.json').read_text())
assert seal['passed'] and seal['words'] == 200000
assert pin(freeze / 'before.json')['sha256'] == seal['beforeSha256']
before = json.loads((freeze / 'before.json').read_text())
assert before['before'] == seal['after']
assert before['expectedCommit'] == '1159465fe6c10f55a97e8c5851e8a75c604450e7'
assert before['registration']['registration']['version'] == 'q11b-morphology-cluster-baseline-v1'
assert before['registration']['registrationSha256'] == '3a8540bc6363da0cab32b84eaebb1232af9c3ced9605dfd27d4b7811e141d01b'
assert pin(archive / 'manifest.json') == seal['manifest']
manifest_raw = (archive / 'manifest.json').read_bytes()
manifest = json.loads(manifest_raw)['manifest']
assert manifest['generator']['commit'] == before['expectedCommit']
assert manifest['protocol'] == before['registration']['protocol']
def artifacts():
    for record in manifest['artifacts']:
        path = Path(record['file'])
        assert not path.is_absolute() and '..' not in path.parts
        assert pin(archive / path) == {key: record[key] for key in ['bytes', 'sha256']}, str(path)
artifacts()
witnesses = {}
protocol = manifest['protocol']
expected = {f"words/{profile['id']}-{seed}.jsonl.gz" for profile in protocol['profiles']
            for seed in profile['seeds']['development']}
assert len(expected) == 20
assert {r['file'] for r in manifest['artifacts'] if r['file'].startswith('words/')} == expected
assert {p.relative_to(archive).as_posix() for p in (archive/'words').rglob('*') if p.is_file()} == expected
total, groups = Counter(), {}
for profile in protocol['profiles']:
    for seed in profile['seeds']['development']:
        name = f"words/{profile['id']}-{seed}.jsonl.gz"
        counts, rows = Counter(), 0
        with gzip.open(archive / name, 'rt', encoding='utf8') as stream:
          for index, line in enumerate(stream):
            row = json.loads(line)
            assert row['profile'] == profile['id'] and row['seed'] == seed and row['drawIndex'] == index
            extra, events = collisions.morphology_collisions(row['word'])
            counts.update(lineage_recount.recount_word(row['word']) + extra)
            rows += 1
            for event in events:
                key = json.dumps([row['profile'], event['rule'], event['created'], event['parts'],
                                  event['sameSyllable'], event['sameSegment'], event['segments']], separators=(',', ':'))
                if key not in witnesses:
                    witnesses[key] = dict(archiveFile=name, archiveRowSha256=hashlib.sha256(line.encode()).hexdigest(),
                                          record=row, event=event)
        assert rows == protocol['wordsPerReplicate'] == 10000
        total.update(counts)
        groups[f"{profile['id']}/{seed}"] = dict(sorted(counts.items()))
        print(json.dumps(dict(profile=profile['id'], seed=seed, words=rows)), flush=True)
assert total['words'] == total['morphologyCensus/words'] == 200000
assert (archive / 'manifest.json').read_bytes() == manifest_raw
artifacts()
assert tool_pins == {p.name: pin(p) for p in tools.iterdir() if p.suffix == '.py'}
result = dict(counts=dict(sorted(total.items())), replicates=groups, manifestSha256=seal['manifest']['sha256'],
              policy=before['policy'], toolPins=tool_pins,
              scope='Independent complete archived cell/phone replay plus transformation-created equality census; configured rule eligibility and linguistic treatment are separate.')
(args.output / 'census.json').write_text(json.dumps(result, indent=2) + '\n')
with gzip.open(args.output / 'witnesses.json.gz', 'wt', encoding='utf8') as stream:
    json.dump(witnesses, stream, ensure_ascii=False)
(args.output / 'complete.json').write_text(json.dumps(dict(passed=True, words=200000, policy=before['policy'],
                                                        witnessStrata=len(witnesses), manifest=seal['manifest']), indent=2)+'\n')
print(json.dumps(dict(passed=True, policy=before['policy'], witnessStrata=len(witnesses),
                     counts={key:value for key,value in result['counts'].items() if key.startswith('morphologyCensus/')})), flush=True)
