"""Independent recorded boundary identity/adjacency audit; no reading-license proof."""
import gzip,hashlib,json
from pathlib import Path
b=Path('/private/tmp/q14a-completion-prefix-context-evidence-v1');root=b/'candidate-archive'
raw=(root/'manifest.json').read_bytes();manifest=json.loads(raw)['manifest'];words=checked=0
for artifact in manifest['artifacts']:
 if not artifact['file'].startswith('words/'):continue
 p=root/artifact['file'];assert hashlib.sha256(p.read_bytes()).hexdigest()==artifact['sha256'];draws=0
 with gzip.open(p,'rt') as stream:
  for line in stream:
   row=json.loads(line);assert row['drawIndex']==draws;draws+=1;words+=1;t=row['word']['trace']['baseSpelling']
   for entry in t['completion']['attempts']:
    attempt=entry['attempt'];prefix=attempt.get('prefix',{});e=prefix.get('evidence',{})
    if 'writtenBoundaryCellId' not in e:continue
    cursor=attempt['cursor'];cells=[]
    for unit in t['units'][:cursor['lastAppendedUnitId']+1]:
     assert len(unit['sourceCellIds'])==len(unit['afterDoubling'])
     cells.extend(dict(id=identity,text=text,partId=t['phones'][unit['id']]['syllableIndex'],origin=dict(kind='selection',unitId=unit['id'],offset=offset)) for offset,(identity,text) in enumerate(zip(unit['sourceCellIds'],unit['afterDoubling'])))
    for edit in t['edits'][:cursor['nextEditId']]:
     start=edit['start'];assert cells[start:start+len(edit['input'])]==edit['input'];cells[start:start+len(edit['input'])]=edit['output']
    positions=[i for i,c in enumerate(cells) if c['id']==e['writtenBoundaryCellId']];assert len(positions)==1
    i=positions[0];assert i+1<len(cells) and len(cells[i]['text'])==1
    origin=cells[i+1]['origin'];owners=origin.get('sourceUnitIds',[origin.get('unitId')]);assert attempt['nucleusId'] in owners
    assert prefix['prefix']['previousForm']==cells[i]['text'];checked+=1
 assert draws==10000 and hashlib.sha256(p.read_bytes()).hexdigest()==artifact['sha256']
assert words==200000 and (root/'manifest.json').read_bytes()==raw
(b/'written-boundary-proof.json').write_text(json.dumps(dict(words=words,boundaryAttemptsChecked=checked,manifestSha256=hashlib.sha256(raw).hexdigest(),scope='Full-corpus recorded cursor/cell identity and adjacency reconstruction; no independent phonemic licensing or human reading claim.'),indent=2)+'\n')
print(words,checked)
