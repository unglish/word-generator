import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {generateWord, createSeededRng} = await import(pathToFileURL(process.argv[2]).href);

for(const [mode,seed,count] of [['lexicon',20261124,20000],['lexicon',495550,10000],['text',40959,10000]]) {
  const rand=createSeededRng(seed);
  const result={mode,seed,count,mismatches:0,softRepairedWords:0,hardCRepairs:0,attempts:0};
  for(let i=0;i<count;i++) {
    const w=generateWord({mode,rand,trace:true});
    const t=w.trace, b=t.baseSpelling;
    const parts=t.morphology.realization?.emittedParts;
    if(parts) assert.equal(parts.map(p=>p.text).join(''),w.written.clean);
    const root=parts?.find(p=>p.role==='root')?.text??b.surface;
    const suffix=parts?.find(p=>p.role==='suffix')?.text??'';
    assert.equal(b.cells.map(c=>c.text).join(''),b.surface);
    let kept=0;
    while(kept<b.surface.length&&b.surface[kept]===root[kept])kept++;
    for(let j=0;j<kept;j++){
      if(root[j]!=='c'||!/[aou]/.test(root[j+1]??suffix[0]??'')) continue;
      const cell=b.cells[j],o=cell.origin;
      const ids=o.kind==='rewrite'?o.sourceUnitIds.filter(id=>b.units[id].afterDoubling.includes('c')):[o.unitId];
      if(ids.length!==1) continue;
      if(b.phones[b.units[ids[0]].phoneIds[0]].soundAtSpelling==='s') result.mismatches++;
    }
    result.softRepairedWords+=+t.repairs.some(r=>r.rule==='letterContext:soft-c');
    result.hardCRepairs+=t.repairs.filter(r=>r.rule==='letterContext:hard-c-onset').length;
    result.attempts+=t.selection.attemptsExecuted;
  }
  console.log(JSON.stringify(result));
}
