import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=process.argv[2];
const {compareDistributions}=await import(pathToFileURL(root+'/src/core/distribution-quality.ts'));
const read=p=>JSON.parse(readFileSync(p));
const reference=read(root+'/data/cmu/cmu-lexicon-trigrams.json');
const prior=read('/tmp/pr313-recalibration/development-policy-verification.json');
const report=[];
for(const name of ['control','z-only','n-only','combined']){const d=read('/tmp/pr313-weight-nudge/'+name+'.json');
 if(name==='control')for(const r of d.results){const p=prior.results.find(p=>p.seed===r.seed);assert.equal(p.draws,r.draws);assert.equal(p.totalVariationPct,r.metrics.totalVariationPct);assert.deepEqual(p.phonemes,r.metrics.topOverRepresented);}
 report.push({name,weights:d.weights,seeds:d.results.map(r=>({seed:r.seed,z:r.metrics.topOverRepresented.find(p=>p.phoneme==='z'),n:r.metrics.topOverRepresented.find(p=>p.phoneme==='n'),totalVariationPct:r.metrics.totalVariationPct,violations:r.violations,nonCmu:r.metrics.nonCmuMassPct,missing:r.metrics.cmuOnlyKeyCount,losses:r.losses,traceRoot:r.trace.root,traceFinal:r.trace.final,rootDuplicates:r.trace.rootDuplicates??0})),defaultText:{unique:d.defaultText.unique,trigramComparison:compareDistributions(d.defaultText.trigrams,reference),rootDuplicates:d.defaultText.trace.rootDuplicates??0,ksts:d.defaultText.trace.ksts??0,root:d.defaultText.trace.root,final:d.defaultText.trace.final},determinismChecks:d.determinismChecks});
}
writeFileSync('/tmp/pr313-weight-nudge/summary.json',JSON.stringify(report,null,2));
for(const r of report)console.log(JSON.stringify({name:r.name,seeds:r.seeds.map(s=>({seed:s.seed,z:s.z.ratio,nGap:s.n.absGapPct,tv:s.totalVariationPct,failures:s.violations})),text:r.defaultText}));
