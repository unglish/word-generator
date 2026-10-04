import argparse,gzip,hashlib,json
from pathlib import Path
if not __debug__:raise RuntimeError('Assertions required')
a=argparse.ArgumentParser();a.add_argument('--repository-root',type=Path,required=True);root=a.parse_args().repository_root
p=Path(__file__).parent;e=root/'evaluation/experiments/unit-normalization'
for r in json.loads((p/'index.json').read_bytes())['records']:
 f=Path(r['path']);assert not f.is_absolute() and '..' not in f.parts
 d=(p/f).read_bytes();assert len(d)==r['bytes'] and hashlib.sha256(d).hexdigest()==r['sha256']
def unpack(path):return gzip.decompress(path.read_bytes())
proof=json.loads(unpack(e/'evidence/q13c-unit-normalization-independent-proof-v1.json.gz'))
assert hashlib.sha256(unpack(p/'analysis-renewed.json.gz')).hexdigest()==proof['targetReportSha256']
assert hashlib.sha256(unpack(p/'analyzer-freeze-renewed.json.gz')).hexdigest()==proof['sourceFreezeSha256']
new=json.loads((p/'independent-renewed.json').read_bytes());assert new['passed'] and new['words']==200000 and new['integerLeavesCompared']==13835 and new['allOriginalCountsAndReplaySummariesEqual']
raw=unpack(p/'parity-renewed.json.inputs.json.gz');new=json.loads(raw);old=json.loads(unpack(e/'evidence/q13c-formal-parity-result-v1.json.inputs.json.gz'));new['original']=old['original'];assert new==old
new=json.loads(unpack(p/'parity-renewed.json.gz'));old=json.loads((e/'evidence/q13c-formal-parity-result-v1.json').read_bytes());assert new['inputsSha256']==hashlib.sha256(raw).hexdigest();new['inputsSha256']=old['inputsSha256'];assert new==old and new['scheduledGenerationCalls']==120000 and new['supplementalMutationCalls']==8
print('Verified compact integrity, exact original analyzer/report bytes, full parity correspondence and scoped original independent recount receipt.')
