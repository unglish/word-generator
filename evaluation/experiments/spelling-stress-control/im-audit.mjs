import { writeFileSync } from 'node:fs';
const arms={parent:'/private/tmp/q02-parent-0d841bd/src/index.ts',control:'/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/src/index.ts'};
const results={};
for(const [arm,path] of Object.entries(arms)){
 const {generateWord,createSeededRng}=await import(path);const rand=createSeededRng(20260926);
 const result={words:10000,affixed:0,plannedIn:0,eligible:0,selectedIm:0,missed:0,unexpected:0,lostSurface:0,witnesses:[]};
 for(let index=0;index<10000;index++){
  const w=generateWord({rand,trace:true});const r=w.trace.morphology?.realization;if(!r)continue;result.affixed++;
  const p=r.prefix;if(p?.planned.written!=='in')continue;result.plannedIn++;
  const eligible=p.boundaryPhoneme?.placeOfArticulation==='bilabial',selected=p.resolved.written==='im';
  result.eligible+=+eligible;result.selectedIm+=+selected;result.missed+=+(eligible&&!selected);result.unexpected+=+(!eligible&&selected);result.lostSurface+=+(selected&&!w.written.clean.startsWith('im'));
  result.witnesses.push({index,word:w});
 }
 results[arm]=result;console.log(arm,JSON.stringify({...result,witnesses:result.witnesses.length}));
}
writeFileSync('/private/tmp/q02-im-audit.json',JSON.stringify(results));
