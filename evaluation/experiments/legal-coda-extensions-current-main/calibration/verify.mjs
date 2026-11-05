import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const root=process.argv[2];assert(root,'Pass the calibration packet directory');
const read=name=>{let bytes;try{bytes=readFileSync(join(root,name));}catch{bytes=gunzipSync(readFileSync(join(root,name+'.gz')));}return JSON.parse(bytes);};
const protocol=read('protocol.json');
assert.equal(createHash('sha256').update(readFileSync(join(root,'protocol.json'))).digest('hex'),'69d0b5993e1199252a769cc48d828bc8b8f534bb504007d49eb104f29f845df7');
const cycle=2n**32n,increment=0x6d2b79f5n;
function inverse(a,m){let [r,s,t,u]=[a,m,1n,0n];while(s){const q=r/s;[r,s,t,u]=[s,r-q*s,u,t-q*u];}return(t+m)%m;}
const inv=inverse(increment,cycle),distance=(a,b)=>((BigInt(b)-BigInt(a))*inv%cycle+cycle)%cycle;
for(const arm of ['main','candidate']){
 const gates=read(arm+'-gates.json'),traces=read(arm+'-trace.json');
 assert.equal(gates.sampleSize,200000);assert.deepEqual(gates.results.map(r=>r.seed),protocol.developmentSeeds);
 for(const a of gates.results){for(const b of gates.results)if(a!==b)assert(distance(a.seed,b.seed)>=BigInt(a.draws));for(const seed of protocol.confirmationSeeds)assert(distance(a.seed,seed)>=BigInt(a.draws));}
 assert.equal(traces.runs.length,20);
 for(const r of traces.runs){assert.equal(r.words,10000);assert.deepEqual(r.losses,{});assert.equal(r.final.phones,Object.values(r.counts).reduce((a,b)=>a+b,0));assert.equal(r.final.z,r.counts.z);const delta=Object.entries(r.stages).filter(([name])=>name!=='generateSyllables').reduce((n,[,s])=>n+s.zGained-s.zLost,0);assert.equal(r.root.z+delta,r.final.z);}
}
console.log('Protocol, stream intervals, trace counts and stage accounting verified.');
