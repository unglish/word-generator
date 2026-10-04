from pathlib import Path
import gzip,hashlib,json,statistics,math,re
OUT=Path('/private/tmp/q02-corpus-acceptance-revalidation-v1');HIST=OUT/'historical';STREAM=Path('/private/tmp/q02-stream-acceptance-revalidation-v1')
def read(path):return json.loads(path.read_text())
def original(relative):return json.loads(gzip.decompress((HIST/relative).read_bytes()))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def text(relative):return gzip.decompress((HIST/relative).read_bytes()).decode()
measurement=read(OUT/'measurement.json');registration_sha=sha(OUT/'measurement.json');protocol_sha=sha(OUT/'protocol.json');summaries={};seals={};manifests={}
for role in ['control','candidate']:
 directory=OUT/'archives'/role;before=read(directory.with_name(role+'-freeze')/'before.json');complete=read(directory.with_name(role+'-freeze')/'complete.json');assert before['before']==complete['after'];assert before['registration']['registration']==measurement and before['registration']['registrationSha256']==registration_sha
 assert complete['manifest']=={'bytes':(directory/'manifest.json').stat().st_size,'sha256':sha(directory/'manifest.json')} and complete['words']==200000 and complete['passed'];seals[role]={'allBeforeAfterSourceDependencyEnvironmentAndNodePinsExact':True,'beforeSha256':sha(directory.with_name(role+'-freeze')/'before.json'),'completionSha256':sha(directory.with_name(role+'-freeze')/'complete.json')}
 manifests[role]=read(directory/'manifest.json')['manifest'];summaries[role]=read(directory/'summary.json')
source_equivalence=original('context/publication-source-equivalence.json.gz');assert source_equivalence['allSourceBytesIdentical'] and len(source_equivalence['sourceFiles'])==176
for name,pin in source_equivalence['sourceFiles'].items():
 p=STREAM/'candidate-checkout'/name;assert p.stat().st_size==pin['bytes'] and sha(p)==pin['sha256']
assert summaries['candidate']['profiles']==summaries['control']['profiles'];common=original('context/common-summary-equality.json.gz');assert common['allProfileSummaryFieldsEqual'] and common['wordsPerArm']==200000 and common['profiles']==4 and common['replicates']==20
for role in ['control','candidate']:assert common[role+'SummarySha256']==sha(OUT/'archives'/role/'summary.json')
rng=original('context/q02-registered-rng-parity.json.gz');assert rng['runnerSha256']==sha(HIST/'tools/registered-rng-parity.mjs') and rng['registrationSha256']==registration_sha and rng['protocolSha256']==protocol_sha and rng['node']=='v24.11.1'
new=read(OUT/'trace-parity-complete.json');assert len(rng['strata'])==len(new['strata'])==40
for role in ['control','candidate']:
 expected=read(OUT/'archives'/(role+'-freeze')/'before.json')['before']['files']['src'];assert rng['source'][role]==expected
for a,b in zip(rng['strata'],new['strata']):assert (a['enabled'],a['profile'],a['seed'],a['comparisons'],a['draws'],a['nextProbe'])==(b['active'],b['profile'],b['seed'],b['wordsEach'],b['drawsEach'],True)
assert sum(s['drawsEach'] for s in new['strata'])==rng['draws']==1926655 and rng['comparisons']==20000 and rng['publicCalls']==40000 and rng['nextValueProbes']==40 and rng['rngDrawAndNextProbeDifferences']==0
timing_complete=original('performance/complete.json.gz');assert timing_complete['order']==['control' if x=='control' else 'candidate' for x in measurement['performanceOrder']];assert len(timing_complete['slots'])==12;timings=[]
for slot in timing_complete['slots']:
 number=slot['slot'];role=slot['arm'];v=original(f'performance/{number:02d}-{role}.json.gz');assert slot['exitCode']==0 and v['sampleSize']==10000 and v['floor']==4500 and v['varianceLimit']==3 and v['speedPass'] is False and v['variancePass'] is True
 assert v['registrationSha256']==registration_sha and v['node']=='v24.11.1' and v['source']==rng['source'][role] and v['environment']['NODE_OPTIONS'] is None
 assert math.isclose(v['wordsPerSec'],10000/(v['elapsed']/1000),rel_tol=1e-15);assert v['configuration']==manifests[role]['generator']['effectiveConfig'];assert v['variancePass']==(v['medianVariance']<3) and v['speedPass']==(v['wordsPerSec']>=4500)
 timings.append({'slot':number,'role':role,'wordsPerSec':v['wordsPerSec'],'medianVariance':v['medianVariance'],'speedPass':v['speedPass'],'variancePass':v['variancePass']})
paired=[]
for number in range(6):
 pair=timings[number*2:number*2+2];a=next(x for x in pair if x['role']=='control');b=next(x for x in pair if x['role']=='candidate');paired.append({'pair':number+1,'controlWordsPerSec':a['wordsPerSec'],'candidateWordsPerSec':b['wordsPerSec'],'relativeChange':b['wordsPerSec']/a['wordsPerSec']-1})
historical_timing=original('context/performance-summary.json.gz');assert historical_timing['pairs']==paired and historical_timing['medianPairedThroughputChange']==statistics.median(x['relativeChange'] for x in paired);assert historical_timing['controlSpeedPasses']==historical_timing['candidateSpeedPasses']==0 and historical_timing['variancePasses']==12
checks=original('checks/complete.json.gz');assert len(checks['results'])==8 and all(x['exitCode']==1 for x in checks['results']);check_counts={}
for role,passed,failed in [('control',1034,4),('candidate',1060,5)]:
 log=text('checks/full-'+role+'.log.gz');assert re.search(r'Tests\s+'+str(failed)+r' failed \| '+str(passed)+r' passed \| 1 skipped',log);assert all(name in log for name in ['no 5+ consonant grapheme runs','no 5+ consonant letter runs','no 4+ consonant grapheme runs','ck counts toward maxPerWord doubling limit'])
 assert ('Test timed out in 60000ms.' in log)==(role=='candidate');quality=text('checks/default-quality-'+role+'.log.gz');assert '1 failed | 11 passed' in quality and '70' in quality
 active=text('checks/active-quality-'+role+'.log.gz');assert 'Hook timed out in 120000ms.' in active;assert ('6 passed | 6 skipped' if role=='control' else '2 failed | 7 passed | 3 skipped') in active
 perf=text('checks/default-perf-'+role+'.log.gz');assert '1 failed | 1 passed' in perf and ('3208 words/sec' if role=='control' else '2903 words/sec') in perf;check_counts[role]={'fullPassed':passed,'fullFailed':failed,'fullSkipped':1,'defaultQualityPassed':11,'defaultQualityFailed':1,'activeQualityPassed':6 if role=='control' else 7,'activeQualityFailed':0 if role=='control' else 2,'activeQualitySkipped':6 if role=='control' else 3,'activeHookTimeoutMs':120000,'defaultPerformanceSpeedFailed':True}
diagnostics=original('diagnostics/complete.json.gz');assert next(x for x in diagnostics['results'] if x['arm']=='candidate' and x['stage']=='trace')['exitCode']==-6
report={'passed':True,'sourceCaptureSeals':seals,'all176PublishedSourceFilesExact':True,'allCommonProfileSummaryFieldsExact':True,'original20kUntracedRngProofSourceAndDrawCountsExactToFresh80kCalls':True,'originalRequiredChecksAuthenticated':check_counts,'allEightOriginalRequiredCommandsFailedRetained':True,'originalTimingSlotsIndependentlyReconstructed':timings,'originalPairedTimingSummaryExact':historical_timing,'originalBulkCandidateOomRetained':True,'scope':'All originalcapturedsource/dependency/environment/runtime seals, originalbound RNG/context, exactsummaries and all8historicalgate outcomes/12timingrecords authenticated and mathematicallyreconciled. No fresh8suite/12timing rerun claimed; source/test/package/threshold bytes unchanged. Candidate60s timeout and activehook failures preventadoptionrecommendation. Original4000earlierprototype proof is contextual; freshformal80kcall evidence supplies currenttraceparity.'}
with (OUT/'original-gate-timing-reconciliation.json').open('x') as handle:json.dump(report,handle,indent=2);handle.write('\n')
print(json.dumps({'originalGateCommands':8,'originalGateFailures':8,'timingSlots':12,'speedPasses':0,'variancePasses':12,'originalRngDraws':1926655,'sourceSealsExact':True,'passedReconciliation':True}))
