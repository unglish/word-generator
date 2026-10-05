"""Independent surface-context audit; does not reconstruct unknown phone readings."""
import gzip
import hashlib
import json
from pathlib import Path

root = Path('/private/tmp/q14a-completion-context-evidence-v1/candidate-archive')
out = Path('/private/tmp/q14a-completion-context-evidence-v1/opaque-context-proof.json')

def owners(cell):
    origin = cell['origin']
    return origin.get('sourceUnitIds', [origin.get('unitId')])

def unchanged(before, after, unit_id):
    footprint = [i for i, cell in enumerate(before) if unit_id in owners(cell)]
    if not footprint:
        return False
    by_id = {cell['id']: i for i, cell in enumerate(after)}
    for index in footprint:
        cell = before[index]
        position = by_id.get(cell['id'])
        if position is None or after[position] != cell:
            return False
        old_next = before[index + 1]['text'].lower() if index + 1 < len(before) else ''
        new_next = after[position + 1]['text'].lower() if position + 1 < len(after) else ''
        if old_next != new_next:
            return False
    return True

# Deliberately exercise changed adjacency, removal, and missing footprint.
a = dict(id=0, text='c', partId=0, origin=dict(kind='rewrite', sourceUnitIds=[0]))
b = dict(id=1, text='a', partId=0, origin=dict(kind='selection', unitId=1))
assert unchanged([a,b], [a,b], 0)
assert not unchanged([a,b], [a,dict(b,text='e')], 0)
assert not unchanged([a,b], [b], 0)
assert not unchanged([a,b], [a,b], 2)

manifest_bytes = (root / 'manifest.json').read_bytes()
manifest = json.loads(manifest_bytes)['manifest']
pins = {entry['file']: entry for entry in manifest['artifacts']}
words = certificates = checked = 0
witnesses = []
for profile in manifest['protocol']['profiles']:
    for seed in profile['seeds']['development']:
        name = f"words/{profile['id']}-{seed}.jsonl.gz"
        path = root / name
        pin = pins[name]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == pin['sha256']
        draws = 0
        with gzip.open(path, 'rt') as stream:
            for line in stream:
                row = json.loads(line)
                assert row['profile'] == profile['id'] and row['seed'] == seed and row['drawIndex'] == draws
                draws += 1
                trace = row['word']['trace']['baseSpelling']
                for certificate in trace['completion']['certificates']:
                    certificates += 1
                    cursor = certificate['attempt']['cursor']
                    cells = []
                    for unit in trace['units'][:cursor['lastAppendedUnitId'] + 1]:
                        assert len(unit['sourceCellIds']) == len(unit['afterDoubling'])
                        cells.extend(dict(id=identity, text=text, partId=trace['phones'][unit['id']]['syllableIndex'],
                                          origin=dict(kind='selection',unitId=unit['id'],offset=offset))
                                     for offset,(identity,text) in enumerate(zip(unit['sourceCellIds'],unit['afterDoubling'])))
                    for edit in trace['edits'][:cursor['nextEditId']]:
                        start = edit['start']
                        assert cells[start:start + len(edit['input'])] == edit['input']
                        cells[start:start + len(edit['input'])] = edit['output']
                    edit = trace['edits'][certificate['editId']]
                    assert certificate['editId'] == cursor['nextEditId']
                    start = edit['start']
                    assert cells[start:start + len(edit['input'])] == edit['input']
                    after = cells[:start] + edit['output'] + cells[start + len(edit['input']):]
                    affected = {certificate['partId']}
                    for neighbor in [cells[start - 1] if start else None,
                                     cells[start + len(edit['input'])] if start + len(edit['input']) < len(cells) else None]:
                        if neighbor is not None and neighbor['partId'] is not None:
                            affected.add(neighbor['partId'])
                    opaque_ids = {identity for cell in cells if cell['origin']['kind'] == 'rewrite'
                                  for identity in owners(cell)
                                  if trace['phones'][identity]['syllableIndex'] in affected}
                    for identity in opaque_ids:
                        assert unchanged(cells, after, identity), (profile['id'],seed,row['drawIndex'],identity)
                        checked += 1
                        if len(witnesses) < 20:
                            witnesses.append(dict(profile=profile['id'],seed=seed,drawIndex=row['drawIndex'],
                                                  certificateId=certificate['id'],opaqueUnitId=identity))
                words += 1
        assert draws == 10000
        assert hashlib.sha256(path.read_bytes()).hexdigest() == pin['sha256']
        print(profile['id'],seed,words,flush=True)
assert words == 200000
assert (root / 'manifest.json').read_bytes() == manifest_bytes
out.write_text(json.dumps(dict(words=words,completionCertificates=certificates,opaqueUnitContextsChecked=checked,
                              witnesses=witnesses,manifestSha256=hashlib.sha256(manifest_bytes).hexdigest(),
                              scope='Independent recorded-cell and following-letter preservation only; unknown readings remain unknown.'),indent=2)+'\n')
