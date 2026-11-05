import json,hashlib,pathlib,statistics,math,gzip
root=pathlib.Path(__file__).resolve().parent
def read(name):
 p=root/name
 if p.exists():return json.loads(p.read_text())
 return json.loads(gzip.decompress((root/(name+'.gz')).read_bytes()))
protocol=read('protocol.json');proposal=read('frozen-proposal.json')
assert hashlib.sha256((root/'frozen-proposal.json').read_bytes()).hexdigest()=='aafc52c97f76d1bb29e404afbffb7716c1d08fe5984fde051c9204db825dc5d7'
original=read('candidate-development.json');replay=read('development-policy-verification.json');confirmation=read('confirmation.json');baseline=read('main-development.json')
assert [r['seed']for r in original['results']]==protocol['developmentSeeds']
assert [r['seed']for r in confirmation['results']]==protocol['confirmationSeeds']
for a,b in zip(original['results'],replay['results']):
 assert all(a[k]==b[k]for k in a),a['seed']
assert all(r['maxOverPhoneme']=='z' and r['maxGapPhoneme']=='n' for r in original['results'])
for phone,metric in [('z','maxOverRepresentation'),('n','maxAbsoluteGapPct')]:
 values=[r[metric]for r in original['results']]
 value=math.ceil((max(values)+3*statistics.stdev(values))*1000-1e-9)/1000
 assert proposal['overrides'][phone][metric]==value
limits=read('adopted-thresholds.json')
assert limits['phonemeOverrides']==proposal['overrides']
for dataset in [replay,confirmation]:
 assert dataset['sampleSize']==200000
 for r in dataset['results']:
  assert not r['phonemeGateViolations'],r['seed']
  assert r['normalizationLosses']==r['nonCmuMassPct']==r['cmuOnlyKeyCount']==0
  assert r['totalVariationPct']<=limits['maxTotalVariationPct']
  assert len(r['phonemes'])>20
  for row in r['phonemes']:
   bound={**limits,**limits['phonemeOverrides'].get(row['phoneme'],{})}
   assert row['ratio']<=bound['maxOverRepresentation'],(r['seed'],row)
   assert row['ratio']>=limits['minRepresentation'],(r['seed'],row)
   assert row['absGapPct']<=bound['maxAbsoluteGapPct'],(r['seed'],row)
C=2**32;inv=pow(0x6d2b79f5,-1,C)
for rows in [baseline['results'],replay['results']+confirmation['results']]:
 for a in rows:
  for b in rows:
   if a is not b:assert ((b['seed']-a['seed'])*inv)%C>=a['draws']
for arm in ['main','candidate']:
 for r in read(arm+'-n-trace.json')['runs']:
  delta=sum(d['gained']-d['lost']for k,d in r['stages'].items()if k!='generateSyllables')
  assert r['root']['n']+delta==r['final']['n']
print('Verified frozen bounds, exact development replay, all per-phone/global limits, 40 disjoint candidate streams, and n trace accounting.')
