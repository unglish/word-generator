"""Independently recount every complete public-call result in the Q02 parity record."""
from pathlib import Path
import gzip,hashlib,json,itertools
OUT=Path('/private/tmp/q02-corpus-acceptance-revalidation-v1')
def read(path):return json.loads(path.read_text())
def natural(value):return type(value) is int and value>=0
def unique_object(pairs):
 result={}
 for key,value in pairs:
  assert key not in result,('Duplicate JSON key',key)
  result[key]=value
 return result
def reject_constant(value):raise AssertionError(('Nonfinite JSON constant',value))
decoder=json.JSONDecoder(object_pairs_hook=unique_object,parse_constant=reject_constant)
def members(text,start):
 assert text[start]=='{';position=start+1;result={}
 while True:
  if text[position]=='}':return result,position+1
  key,position=decoder.raw_decode(text,position);assert key not in result and text[position]==':'
  value_start=position+1;value,position=decoder.raw_decode(text,value_start);result[key]=(value,value_start,position)
  if text[position]=='}':return result,position+1
  assert text[position]==',';position+=1
def legacy(word):
 result=dict(word);trace=dict(result['trace']);result['trace']=trace
 for key in ['finalWord','writerInput','writerOutput','gapSpellingPass','morphologyPass','pronunciationPasses','morphologyPreparation','morphologyWriting','finalNucleus']:trace.pop(key,None)
 if 'realization' in trace.get('morphology',{}):
  morphology=dict(trace['morphology']);trace['morphology']=morphology;realization=dict(morphology['realization']);morphology['realization']=realization
  for key in ['rootEdits','finalSpelling','phoneAssembly','finalPhones','selectionPhones','configurationIndices']:realization.pop(key,None)
 return result
registration=read(OUT/'trace-parity-registration.json');complete=read(OUT/'trace-parity-complete.json');protocol=read(OUT/'protocol.json');assert complete['passed'] and complete['coordinates']==20000 and complete['publicCalls']==80000
assert complete['registrationSha256']==hashlib.sha256((OUT/'trace-parity-registration.json').read_bytes()).hexdigest()
assert registration['sourceBindingSha256']==hashlib.sha256((OUT/'source-binding.json').read_bytes()).hexdigest()
assert complete['runnerSha256']==registration['runnerSha256']
raw_digest=hashlib.sha256();coordinates=0;archive_matches=0;strata=[];names=['controlOff','controlOn','candidateOff','candidateOn']
with gzip.open(OUT/'trace-parity-full-records.jsonl.gz','rt',encoding='utf-8',newline='') as handle:
 for active in [False,True]:
  for profile in protocol['profiles']:
   for seed in profile['seeds']['development']:
    summaries=[s for s in complete['strata'] if (s['active'],s['profile'],s['seed'])==(active,profile['id'],seed)];assert len(summaries)==1;summary=summaries[0]
    word_hashes={name:hashlib.sha256() for name in names};previous={name:0 for name in names};archives={}
    if active:
     for role in ['control','candidate']:archives[role]=gzip.open(OUT/'archives'/role/'words'/f"{profile['id']}-{seed}.jsonl.gz",'rt',encoding='utf-8')
    try:
     for index in range(500):
      line=next(handle);raw_digest.update(line.encode());top,end=members(line,0);assert line[end:]=='\n' and set(top)=={'active','profile','seed','drawIndex','draws','words'}
      row={key:value[0] for key,value in top.items()};assert type(row['active']) is bool and row['active']==active and natural(row['seed']) and natural(row['drawIndex']);assert (row['profile'],row['seed'],row['drawIndex'])==(profile['id'],seed,index)
      values,end_words=members(line,top['words'][1]);assert end_words==top['words'][2] and list(values)==names;assert set(row['draws'])==set(names)
      words=row['words'];draws=row['draws'];assert 'trace' not in words['controlOff'] and 'trace' not in words['candidateOff']
      assert {key:value for key,value in words['controlOn'].items() if key!='trace'}==words['controlOff'];assert {key:value for key,value in words['candidateOn'].items() if key!='trace'}==words['candidateOff'];assert words['candidateOff']==words['controlOff'];assert legacy(words['candidateOn'])==words['controlOn']
      assert 'finalWord' not in words['controlOn']['trace'] and words['candidateOn']['trace']['finalWord']
      for name in names:
       assert natural(draws[name]) and draws[name]>=previous[name] and draws[name]==draws['controlOff'];previous[name]=draws[name];word_hashes[name].update((line[values[name][1]:values[name][2]]+'\n').encode())
      if active:
       for role,archive in archives.items():
        archived=decoder.decode(next(archive));assert (archived['profile'],archived['seed'],archived['drawIndex'])==(profile['id'],seed,index);assert archived['word']==words[role+'On'];archive_matches+=1
      coordinates+=1
    finally:
     for archive in archives.values():archive.close()
    assert {name:h.hexdigest() for name,h in word_hashes.items()}==summary['completeWordHashes'];assert all(count==summary['drawsEach'] for count in previous.values());assert set(summary['nextValues'])==set(names) and all(value==summary['nextValues']['controlOff'] for value in summary['nextValues'].values());assert summary['wordsEach']==500;strata.append({'active':active,'profile':profile['id'],'seed':seed,'coordinates':500,'drawsEach':summary['drawsEach'],'archiveWordsCompared':1000 if active else 0})
 assert handle.read()==''
assert coordinates==20000 and archive_matches==20000 and len(strata)==40;assert raw_digest.hexdigest()==complete['rawRecordSha256']
for name in ['registrationSha256','runnerSha256']:assert complete[name]
report={'passed':True,'coordinates':coordinates,'completePublicWords':coordinates*4,'withinArmTraceComparisons':coordinates*2,'acrossArmComparisons':coordinates*2,'perCoordinateRngCountQuartets':coordinates,'nextRngValuesChecked':160,'activeFullArchivedWordsCompared':archive_matches,'all160NativeFullWordStreamHashesIndependentlyReconstructed':True,'rawRecordSha256':raw_digest.hexdigest(),'rawCompressedSha256':hashlib.sha256((OUT/'trace-parity-full-records.jsonl.gz').read_bytes()).hexdigest(),'sourceBindingSha256':registration['sourceBindingSha256'],'nativeReportSha256':hashlib.sha256((OUT/'trace-parity-complete.json').read_bytes()).hexdigest(),'strata':strata,'scope':'All20000registeredcoordinates/80000fullpublicWordrecords and exactRNGcounts independentlyrecounted; allactive first500 tracedWordresults match actualoriginalsealedarchive coordinates. Actualnextvalues and allnativewordstream hashes authenticated. No newgenerator call, changedprojection, reducedschedule or all200000-coordinate RNG claim.'}
with (OUT/'trace-parity-independent.json').open('x') as handle:json.dump(report,handle,indent=2);handle.write('\n')
print(json.dumps({'coordinates':coordinates,'publicWords':coordinates*4,'activeArchiveWords':archive_matches,'completeStreamHashes':160,'passed':True}))
