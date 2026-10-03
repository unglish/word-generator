import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import lineage_recount
from final_endpoints import final_counts

parser = argparse.ArgumentParser()
parser.add_argument('archive'); parser.add_argument('output')
args = parser.parse_args()
archive = Path(args.archive); freeze = Path(args.archive + '-freeze')
seal = json.loads((freeze / 'complete.json').read_bytes())
assert seal['passed'] is True and type(seal['words']) is int and seal['words'] == 200000
before_bytes = (freeze / 'before.json').read_bytes()
assert hashlib.sha256(before_bytes).hexdigest() == seal['beforeSha256']
before = json.loads(before_bytes)
assert before['before'] == seal['after'], 'Frozen source/dependency/environment evidence differs'
registration = before['registration']['registration']
assert registration['version'] == 'q10b2-final-checked-vowels-v1'
assert registration['wordsPerPolicyPerArm'] == 200000 and registration['wordsPerArm'] == 400000
manifest_bytes = (archive / 'manifest.json').read_bytes()
manifest_hash = hashlib.sha256(manifest_bytes).hexdigest()
assert manifest_hash == seal['manifest']['sha256'] and len(manifest_bytes) == seal['manifest']['bytes']
manifest = json.loads(manifest_bytes)['manifest']
assert manifest['generator']['commit'] == before['expectedCommit']
base_count = lineage_recount.recount_word

def count(word):
    return base_count(word) + final_counts(word)

lineage_recount.recount_word = count
result = lineage_recount.recount_archive(archive, manifest_hash, before['registration']['protocol'])
assert result['counts']['words'] == 200000
assert result['counts']['endpoint/words'] == 200000
if before['arm'] == 'configured-final-vowel-contract':
    assert result['counts'].get('endpoint/lexical/configuredViolation', 0) == 0
    assert result['counts'].get('endpoint/surface/configuredViolation', 0) == 0
result.update(arm=before['arm'], policy=before['policy'], sourceCommit=before['expectedCommit'],
              registrationSha256=before['registration']['registrationSha256'],
              beforeSha256=seal['beforeSha256'],
              scope='Independent archived-JSON cell/phone replay, lexical/surface ending counts and checked-repair root-coordinate binding; configured sampling replay is separate')
with Path(args.output).open('x') as out: json.dump(result,out,indent=2);out.write('\n')
print(json.dumps({'passed':True,'arm':before['arm'],'policy':before['policy'],'words':200000,'counts':{k:v for k,v in result['counts'].items() if k.startswith('endpoint/')}}),flush=True)
