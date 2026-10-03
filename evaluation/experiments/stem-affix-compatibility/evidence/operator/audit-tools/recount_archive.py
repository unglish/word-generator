import hashlib
import json
import sys
from pathlib import Path
from collections import Counter
import lineage_recount
from category_recount import eligible_paths, recount

archive=Path(sys.argv[1])
freeze=Path(str(archive)+'-freeze')
seal=json.loads((freeze/'complete.json').read_bytes())
assert seal['passed'] is True and seal['words']==200000
before_bytes=(freeze/'before.json').read_bytes()
assert hashlib.sha256(before_bytes).hexdigest()==seal['beforeSha256']
before=json.loads(before_bytes)
assert before['before']==seal['after']
registration=before['registration']['registration']
assert registration['version']=='q18-category-capture-v1'
assert registration['candidateCommit']=='11bdf6a90ed28e1aba09c40b3901c54c6308437f'
assert registration['categoryProfile']['sha256']=='51750a29cbfe89d6d9cc6c7b9fd5ab67ee9e8ec0d9203f00f2b52e3a6c0ee266'
manifest_bytes=(archive/'manifest.json').read_bytes()
assert hashlib.sha256(manifest_bytes).hexdigest()==seal['manifest']['sha256']
assert len(manifest_bytes)==seal['manifest']['bytes']
manifest=json.loads(manifest_bytes)['manifest']
assert manifest['generator']['commit']==registration['candidateCommit']
configuration=manifest['generator']['effectiveConfig']
assert configuration['morphology']['categories']
profile_bytes=Path(sys.argv[2]).read_bytes()
assert hashlib.sha256(profile_bytes).hexdigest()==registration['categoryProfile']['sha256']
profile=json.loads(profile_bytes)
assert configuration['morphology']['categories']==profile['model']
assert [a['written'] for a in configuration['morphology']['prefixes']]==profile['inventory']['prefixes']
assert [a['written'] for a in configuration['morphology']['suffixes']]==profile['inventory']['suffixes']
pools={}
for entry in manifest['protocol']['profiles']:
    options=entry['options']
    pools[entry['id']]={template:eligible_paths(profile['model'],template,configuration['morphology'],options.get('syllableCount',0)) for template in ('bare','prefixed','suffixed','both')}
# Archive callback receives the complete word; choose the registered profile via its public option-derived morphology state.
# The current profiles have a single morphology-enabled forced-count policy (zero); the forced-one profile explicitly disables morphology.
options_by_id={entry['id']:entry['options'] for entry in manifest['protocol']['profiles']}
assert all(not options.get('morphology',True) or not options.get('syllableCount',0) for options in options_by_id.values())
original=lineage_recount.recount_word
unforced=next(pools[name] for name,options in options_by_id.items() if options.get('morphology',True))

def count(word):
    # Profile coordinates are authenticated by recount_archive. Enabled traces are required for the registered enabled profiles.
    enabled=bool(word['trace'].get('morphology'))
    return original(word)+recount(word,configuration,{'morphology':enabled},unforced)
lineage_recount.recount_word=count
result=lineage_recount.recount_archive(archive,seal['manifest']['sha256'],before['registration']['protocol'])
assert result['counts']['category/words']==200000
# Validate profile-specific category assignment denominators, catching missing traces instead of accepting them as disabled.
for entry in manifest['protocol']['profiles']:
 for seed in entry['seeds']['development']:
  counts=result['replicates'][f"{entry['id']}/{seed}"]
  expected='category/assigned' if entry['options'].get('morphology',True) else 'category/unassigned'
  assert counts.get(expected,0)==10000,(entry['id'],seed,'assignment denominator')
result.update(passed=True,policy=before['policy'],sourceCommit=registration['candidateCommit'],profileSha256=registration['categoryProfile']['sha256'],
              scope='Independent complete archived category path/weight/projection reconstruction plus cell/phone lineage replay. Configured production replay and cross-arm quality/performance comparisons remain separate.')
with Path(sys.argv[3]).open('x') as out:json.dump(result,out,indent=2);out.write('\n')
print(json.dumps({'passed':True,'words':200000,'policy':before['policy'],'categoryCounters':sum(key.startswith('category/') for key in result['counts'])}),flush=True)
