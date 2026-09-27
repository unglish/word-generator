import assert from 'node:assert/strict';
import test from 'node:test';
import { benchmark } from './performance-one.mjs';

test('performance protocol preserves batch and sequential coordinates and thresholds',()=>{
 const batches=[];const seeds=[];let clock=0;
 const result=benchmark({generateWords:(count,options)=>batches.push([count,options.seed]),generateWord:options=>seeds.push(options.seed)},()=>++clock);
 assert.deepEqual(batches,[[50,0],[10000,42]]);
 assert.deepEqual(seeds.slice(0,50),Array.from({length:50},(_,i)=>900000+i));
 assert.deepEqual(seeds.slice(50),[0,100000,200000].flatMap(offset=>Array.from({length:1000},(_,i)=>offset+i)));
 assert.equal(result.floor,4500);assert.equal(result.varianceLimit,3);
 assert.equal(result.trials.length,3);assert.equal(result.medianVariance,1);
});
