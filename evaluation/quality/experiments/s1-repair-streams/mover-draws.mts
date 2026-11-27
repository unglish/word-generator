/** Replay packet witnesses from their public word keys, with test-only draw counting. */
import { strict as assert } from 'node:assert';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
const [beforeRoot,afterRoot,packet]=process.argv.slice(2);
const rows=JSON.parse(gunzipSync(readFileSync(resolve(packet,'mover-traces.json.gz'))).toString());
const protocol=JSON.parse(readFileSync(resolve(afterRoot,'evaluation/quality/protocol.json'),'utf8'));
const counts=[];
for(const [side,root] of [['before',beforeRoot],['after',afterRoot]]) {
  const moduleAt=file=>pathToFileURL(resolve(root,'src',file)).href;
  const api=await import(moduleAt('index.ts'));
  const {withStageDraws}=await import(moduleAt('test-support/stage-stream-probe.ts'));
  for(const row of rows) {
    const word=row[side], key=word.trace.random.key;
    const hi=parseInt(key.slice(0,8),16), lo=parseInt(key.slice(8),16);
    const draws=[hi/2**32,lo/2**32];
    const options=protocol.profiles.find(p=>p.id===row.id[0]).options;
    const actual=withStageDraws(()=>api.generateWord({...options,rand:()=>draws.shift(),trace:true}));
    assert.equal(JSON.stringify(actual.value),JSON.stringify(word));
    assert.equal(draws.length,0);
    counts.push({id:row.id,side,key,selected:word.trace.selection.selectedAttempt,draws:actual.draws});
  }
}
writeFileSync(resolve(packet,'mover-draws.json'),JSON.stringify(counts,null,2));
