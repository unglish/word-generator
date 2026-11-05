import pathlib,json,hashlib,sys,gzip
root=pathlib.Path(__file__).resolve().parent
def read(name):
 p=root/name
 if p.exists():return json.loads(p.read_text())
 return json.loads(gzip.decompress((root/(name+'.gz')).read_bytes()))
protocol=read('protocol.json');limits=read('thresholds.json')
assert hashlib.sha256((root/'protocol.json').read_bytes()).hexdigest()=='63a9bca846007c9c05ed27d014c640eed9f3cffc247a1d2d579f50fb480992dd'
assert 'phonemeOverrides' not in limits
reports={};allrows=[]
for cohort in ['development','confirmation']:
 if not (root/(cohort+'.json')).exists() and not (root/(cohort+'.json.gz')).exists():continue
 data=read(cohort+'.json');assert data['sampleSize']==200000
 assert [r['seed']for r in data['results']]==protocol[cohort+'Seeds']
 violations=[]
 for r in data['results']:
  allrows.append(r)
  for key,bound in [('totalVariationPct','maxTotalVariationPct'),('nonCmuMassPct','maxGeneratedOnlyMassPct'),('cmuOnlyKeyCount','maxCmuOnlyKeyCount')]:
   if r[key]>limits[bound]:violations.append({'seed':r['seed'],'metric':key,'value':r[key],'limit':limits[bound]})
  assert r['normalizationLosses']==0
  assert len(r['phonemes'])>20
  for p in r['phonemes']:
   for metric,key,upper in [('ratio','maxOverRepresentation',True),('ratio','minRepresentation',False),('absGapPct','maxAbsoluteGapPct',True)]:
    if (p[metric]>limits[key] if upper else p[metric]<limits[key]):violations.append({'seed':r['seed'],'phoneme':p['phoneme'],'metric':key,'value':p[metric],'limit':limits[key]})
 reports[cohort]={'words':len(data['results'])*data['sampleSize'],'violations':violations,'maximumRatio':max(r['maxOverRepresentation']for r in data['results']),'maximumGap':max(r['maxAbsoluteGapPct']for r in data['results']),'maximumTV':max(r['totalVariationPct']for r in data['results'])}
C=2**32;inv=pow(0x6d2b79f5,-1,C)
for a in allrows:
 for b in allrows:
  if a is not b:assert ((b['seed']-a['seed'])*inv)%C>=a['draws']
for seed in protocol['confirmationSeeds']:
 for old in protocol['previousConfirmationSeeds']:assert min(((seed-old)*inv)%C,((old-seed)*inv)%C)>=20000000
(root/'gate-verification.json').write_text(json.dumps(reports,indent=2)+'\n')
print(json.dumps(reports,indent=2))
if any(r['violations']for r in reports.values()):sys.exit(1)
