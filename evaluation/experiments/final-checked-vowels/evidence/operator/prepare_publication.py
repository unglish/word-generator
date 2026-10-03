"""Build a reviewable evidence package only after the registered pipeline terminates."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

base=Path(__file__).parent
candidate=Path('/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator')
measured='8499e925cb69728e38573cceb477f2bb60f90007'
subprocess.run(['python3',str(base/'publication_readiness.py')],check=True)
assert json.loads((base/'publication-readiness.json').read_text())['evidenceStagesComplete'] is True
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=candidate,text=True).strip()==measured
assert not subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=candidate,text=True).strip()
freeze=json.loads(Path('/private/tmp/q10b2-configured-final-vowel-contract-default-v1-freeze/before.json').read_text())
expected=freeze['before']['files']['src']
def digest(raw):return hashlib.sha256(raw).hexdigest()
actual={p.relative_to(candidate/'src').as_posix():{'bytes':p.stat().st_size,'sha256':digest(p.read_bytes())} for p in (candidate/'src').rglob('*') if p.is_file()}
assert actual==expected,'Measured generator source changed'

stage=Path('/private/tmp/q10b2-publication-stage-v1');stage.mkdir()
records=[]
def retain(source,relative):
 raw=source.read_bytes()
 compress=source.suffix=='.log' or (len(raw)>128000 and source.suffix!='.gz')
 target=relative+'.gz' if compress else relative
 saved=gzip.compress(raw,mtime=0) if compress else raw
 destination=stage/target;destination.parent.mkdir(parents=True,exist_ok=True)
 with destination.open('xb') as stream:stream.write(saved)
 assert (gzip.decompress(destination.read_bytes()) if compress else destination.read_bytes())==raw
 records.append({'path':target,'bytes':len(saved),'sha256':digest(saved),'origin':str(source),
                 'originalBytes':len(raw),'originalSha256':digest(raw),'compression':'gzip' if compress else 'unchanged'})
def directory(source,prefix):
 for path in sorted(source.rglob('*')):
  if path.is_file() and '__pycache__' not in path.parts:
   retain(path,prefix+'/'+path.relative_to(source).as_posix())

for name in ['gate-summary.json','gate-failure-classification.json','timing-summary.json','publication-readiness.json','captures.json',
             'default-capture-integrity.json','active-capture-integrity.json','active-control-reproduction.json',
             'default-candidate-endpoint-agreement.json','timing-registration.json','registered-trace-parity.mjs',
             'verify-witnesses.mjs','verify-witnesses-v1.mjs','retain_witnesses.py','performance-one.mjs',
             'run_checks.py','run_checks_v2.py','run_performance.py','run_performance_v2.py','run_diagnostics.py',
             'run_diagnostics_v2.py','publication_readiness.py','prepare_publication.py']:
 retain(base/name,'evidence/operator/'+name)
for name in ['audit','active-quality']:
 directory(base/name,'evidence/tools/'+name)
for name in ['audit-v1','audit-v2','audit-v3','checks-v2','performance-v2','diagnostics-v2','witnesses-v1','default-comparison-v1','active-comparison-v1']:
 directory(Path('/private/tmp/q10b2-'+name),'evidence/'+name)
retain(Path('/private/tmp/q10b2-registered-trace-parity.json'),'evidence/registered-trace-parity.json')
for arm in ['fixed-control','configured-final-vowel-contract']:
 for policy in ['default','active']:
  archive=Path(f'/private/tmp/q10b2-{arm}-{policy}-v1')
  prefix=f'evidence/captures/{arm}-{policy}'
  directory(Path(str(archive)+'-freeze'),prefix+'/freeze')
  for name in ['manifest.json','sources.json.gz','summary.json','distributions.json.gz']:
   retain(archive/name,prefix+'/'+name)
for path in sorted((candidate/'evaluation/experiments/final-checked-vowels').glob('*.log')):
 retain(path,'evidence/preimplementation/'+path.name)

# Confirm diagnostic reports came from successful commands, not a stale preexisting copy.
diagnostics=json.loads(Path('/private/tmp/q10b2-diagnostics-v2/complete.json').read_text())
for arm in ['control','candidate']:
 for kind in ['compile','trigrams','trace']:
  row=next(r for r in diagnostics['results'] if r['arm']==arm and r['stage']==kind)
  assert row['exitCode']==0,(arm,kind,'Diagnostic failed; review before finalizing report')
 trigram=json.loads(Path(f'/private/tmp/q10b2-diagnostics-v2/trigrams-{arm}.json').read_text())
 assert trigram['config']['totalWords']==2000000 and trigram['config']['countPerSeed']==400000
 source_root=Path(next(r['cwd'] for r in diagnostics['results'] if r['arm']==arm))
 for suffix in ['json','md']:
  assert Path(f'/private/tmp/q10b2-diagnostics-v2/trigrams-{arm}.{suffix}').read_bytes()==(source_root/'memory'/('trigram-2m-analysis.'+suffix)).read_bytes()
 trace=json.loads(Path(f'/private/tmp/q10b2-diagnostics-v2/trace-{arm}.json').read_text())
 assert trace['config']['count']==50000,(arm,'Default trace sample changed')

index={'version':'q10b2-completed-evidence-v1','measuredGeneratorCommit':measured,'controlCommit':'4a5defa56c7649145bfa9c953e698dc57a2d0acd',
       'records':records,'sourcePins':actual,'rawTraceArchives':'Four original 200000-word captures remain separately archived at their recorded local paths; manifests retain all raw artifact hashes. Raw shards are not duplicated in Git.',
       'scope':'Completed measurement evidence with original failures retained. Completeness is not gate success or a release recommendation.'}
(stage/'validation-index.json').write_text(json.dumps(index,indent=2)+'\n')
print(json.dumps({'stage':str(stage),'artifacts':len(records),'savedBytes':sum(r['bytes'] for r in records)}))
