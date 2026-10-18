import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root='/private/tmp/q12c-performance-results-v1';
const sha=b=>createHash('sha256').update(b).digest('hex');
const reportBytes=await readFile(root+'/report.json');
const report=JSON.parse(reportBytes);
assert(report.completed && report.sourcesUnchanged && report.installedDependenciesUnchanged);
assert.equal(report.runs.length,12);
const ratios=[];const gates={A:{floor:0,variance:0},B:{floor:0,variance:0}};
for(let pair=1;pair<=6;pair++) {
 const order=pair%2?'AB':'BA';const rates={};
 for(let position=1;position<=2;position++) {
  const version=order[position-1];const stem=`${String(pair).padStart(2,'0')}-${position}-${version}`;
  const slot=JSON.parse(await readFile(`${root}/${stem}.json`));
  assert.deepEqual(slot,report.runs[(pair-1)*2+position-1]);
  assert.equal(slot.status,'completed');assert.equal(slot.error,null);
  const bytes=await readFile(`${root}/${stem}.log`);assert.equal(sha(bytes),slot.logSha256);
  const log=bytes.toString().replace(/\x1b\[[0-9;]*m/g,'');
  const matches=[...log.matchAll(/Performance: (\d+) words\/sec/g)];assert.equal(matches.length,1);
  rates[version]=Number(matches[0][1]);assert.equal(rates[version],slot.reportedWordsPerSecond);
  for(const [name,key,phrase] of [['floor','floorGatePassed','should generate at least 4500 words/sec'],['variance','varianceGatePassed','should not degrade significantly with sequential seeds']]) {
   const lines=log.split('\n').filter(line=>line.includes(' > '+phrase)&&/^\s*[✓×]/.test(line));assert.equal(lines.length,1);
   const passed=lines[0].trimStart().startsWith('✓');assert.equal(passed,slot[key]);gates[version][name]+=Number(passed);
  }
 }
 const ratio=rates.B/rates.A;ratios.push(ratio);assert.equal(ratio,report.pairs[pair-1].BoverA);
}
const sorted=[...ratios].sort((a,b)=>a-b);const median=(sorted[2]+sorted[3])/2;
assert.equal(median,report.medianPairedThroughputRatio);
for(const version of ['A','B'])for(const [name,key] of [['floor','floorGatePassed'],['variance','varianceGatePassed']])assert.equal(gates[version][name],report.gates[version][key].passed);
const proof={passed:true,scope:'Separate JavaScript verification of all 12 raw log hashes, rate/gate parsing, schedule, paired ratios and median; not an independent timing experiment.',reportSha256:sha(reportBytes),ratios,median,gates};
await writeFile('/private/tmp/q12c-performance-arithmetic-v1.json',JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(proof));
