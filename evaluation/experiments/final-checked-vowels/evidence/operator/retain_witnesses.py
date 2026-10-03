from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).parent/'audit'))
from final_endpoints import final_counts

OUT=Path('/private/tmp/q10b2-witnesses-v1');OUT.mkdir()
ROOT=Path('/Users/ryanbetts/.codex/worktrees/d9c28566-8f5b-432e-a246-5e4070782624/word-generator')
selected={};counts=Counter();policies={};pins={}
for policy in ['default','active']:
    archive=Path('/private/tmp/q10b2-configured-final-vowel-contract-'+policy+'-v1')
    manifestbytes=(archive/'manifest.json').read_bytes();manifest=json.loads(manifestbytes)['manifest'];seal=json.loads(Path(str(archive)+'-freeze/complete.json').read_bytes())
    assert seal['passed'] is True and hashlib.sha256(manifestbytes).hexdigest()==seal['manifest']['sha256']
    pins[policy]=seal['manifest']['sha256'];policycounts=Counter();artifacts={a['file']:a for a in manifest['artifacts']}
    for profile in manifest['protocol']['profiles']:
        for seed in profile['seeds']['development']:
            name=f"words/{profile['id']}-{seed}.jsonl.gz";path=archive/name
            with path.open('rb') as stream:assert hashlib.file_digest(stream,'sha256').hexdigest()==artifacts[name]['sha256']
            assert path.stat().st_size==artifacts[name]['bytes']
            rows=0
            with gzip.open(path,'rt',encoding='utf8') as stream:
                for line in stream:
                    record=json.loads(line);assert record['drawIndex']==rows and record['seed']==seed and record['profile']==profile['id'];rows+=1
                    word=record['word'];c=final_counts(word);assert c['endpoint/lexical/configuredViolation']==0 and c['endpoint/surface/configuredViolation']==0
                    policycounts.update(c)
                    repairs=[r for r in word['trace']['finalNucleus']['repairs'] if r['rule']=='repairFinalCheckedVowel']
                    template=word['trace'].get('morphology',{}).get('template','no-plan')
                    if repairs:
                        repair=repairs[0];stress=word['syllables'][-1].get('stress','unstressed')
                        category=f"repaired/{template}/{stress}/{repair['before']}->{repair['after']}"
                    else:
                        category=f"unrepaired/{template}/{'closed' if word['syllables'][-1]['coda'] else 'open'}"
                    key=policy+'/'+category
                    if key not in selected:selected[key]={'policy':policy,'category':category,'profile':profile['id'],'seed':seed,'drawIndex':record['drawIndex'],'archive':str(archive),'file':name,'fileSha256':artifacts[name]['sha256'],'lineSha256':hashlib.sha256(line.encode()).hexdigest(),'word':word}
            assert rows==10000
            print(json.dumps({'policy':policy,'profile':profile['id'],'seed':seed,'rows':rows,'cumulativeWords':policycounts['endpoint/words']}),flush=True)
    assert policycounts['endpoint/words']==200000;counts.update(policycounts);policies[policy]=dict(policycounts)
with gzip.open(OUT/'witnesses.json.gz','wt',encoding='utf8') as stream:json.dump(selected,stream,ensure_ascii=False)
(OUT/'selection.json').write_text(json.dumps({'passed':True,'sourceCommit':'8499e925cb69728e38573cceb477f2bb60f90007','words':400000,'witnesses':len(selected),'manifestPins':pins,'policies':policies,'counts':dict(counts),'selectorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'scope':'Full candidate endpoint/source-coordinate check and first-per-observed-stratum unmodified records; full operational and cell/phone replay remain separate'},indent=2)+'\n')
