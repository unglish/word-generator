import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
import crypto from 'node:crypto';
import { createGenerator, englishConfig } from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/src/index.ts';
const root='/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function sources(dir=root+'/src') { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?sources(dir+'/'+x.name):x.name.endsWith('.ts')?[dir+'/'+x.name]:[]); }
const sourceHashes=Object.fromEntries(sources().sort().map(p=>[p.slice(root.length+1),sha(fs.readFileSync(p))]));
const gen=createGenerator(englishConfig);const witnesses=[];const summary=[];
for(let seed=0;seed<10000;seed++) {
 const word=gen.generateWord({seed,morphology:false,trace:true});const clean=word.written.clean.toLowerCase();
 if(!clean.includes('ck') || !/([bcdfglmnprst])\1/.test(clean))continue;
 const plain=gen.generateWord({seed,morphology:false});
 if(JSON.stringify({...word,trace:undefined})!==JSON.stringify(plain))throw Error('Trace mode mismatch');
 const base=word.trace.baseSpelling;
 if(base.surface.toLowerCase()!==clean)throw Error('Surface alignment unavailable');
 function spans(pattern) { return [...clean.matchAll(pattern)].map(m=>({text:m[0],index:m.index,cells:base.cells.slice(m.index,m.index+m[0].length).map(c=>({id:c.id,origin:c.origin})),units:[...new Set(base.cells.slice(m.index,m.index+m[0].length).flatMap(c=>c.origin.kind==='rewrite'?c.origin.sourceUnitIds:[c.origin.unitId]))].map(id=>({id,sound:base.phones[id].soundAtSpelling,selected:base.units[id].selected,afterDoubling:base.units[id].afterDoubling,doublingIncrement:base.units[id].doublingIncrement}))})); }
 witnesses.push({seed,word}); summary.push({seed,clean,ipa:word.pronunciation,actualOriginalDoublingIncrements:base.units.reduce((n,u)=>n+u.doublingIncrement,0),ck:spans(/ck/g),doubles:spans(/([bcdfglmnprst])\1/g),normalizationEpisodes:base.normalization.episodes});
}
for(const[p,h]of Object.entries(sourceHashes))if(sha(fs.readFileSync(root+'/'+p))!==h)throw Error('Source changed');
const raw=gzipSync(JSON.stringify({version:'q13c-doubling-gate-traces-v1',sourceHashes,witnesses})+'\n',{mtime:0});
fs.writeFileSync('/private/tmp/q13c-doubling-gate-traces-v1.json.gz',raw,{flag:'wx'});
const result={version:'q13c-doubling-gate-diagnostic-v1',scope:'Exact existing test seeds0..9999,morphologyfalse; all generated via publicAPI with traces. Supplementary diagnostic, not formal candidate corpus. Rewrite ancestry is not exact ownership.',generated:10000,matching:summary.length,traceModeChecks:summary.length,sourceHashes,traceArchiveSha256:sha(raw),summary};
fs.writeFileSync('/private/tmp/q13c-doubling-gate-diagnostic-v1.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({matching:summary.length,words:summary.map(x=>({seed:x.seed,clean:x.clean,doubling:x.actualOriginalDoublingIncrements,ck:x.ck.map(s=>s.units),doubles:x.doubles.map(s=>s.units)}))}));
