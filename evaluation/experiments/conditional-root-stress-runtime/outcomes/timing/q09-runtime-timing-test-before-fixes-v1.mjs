import assert from 'node:assert/strict';
import test from 'node:test';
import {measure} from './q09-runtime-timing-v1.mjs';
const clock=step=>{let value=0;return()=>value+=step;};
function fixture(failure){
 const calls=[];const word={written:{clean:'fixture'}};
 const api={generateWords:(count,options)=>{calls.push({count,...options});if(failure==='batch')throw new Error('batch failure');return Array.from({length:count},()=>word);},
 generateWord:options=>{calls.push({count:1,...options});if(failure==='single')throw new Error('single failure');return word;}};
 return {api,calls};
}
test('exact frozen seed schedule, batch sizes, logical calls and word totals',async()=>{
 const {api,calls}=fixture();const result=await measure(api,false,clock(1));
 assert.equal(result.completed,true);assert.equal(result.completedWords,13100);assert.equal(result.attemptedWords,13100);
 assert.equal(result.completedApiCalls,3052);assert.equal(result.attemptedApiCalls,3052);
 assert.deepStrictEqual(calls.slice(0,2),[{count:50,seed:0,trace:false},{count:10000,seed:42,trace:false}]);
 assert.deepStrictEqual(calls.slice(2,52).map(x=>x.seed),Array.from({length:50},(_,i)=>900000+i));
 assert.deepStrictEqual(calls.slice(52).map(x=>x.seed),Array.from({length:3},(_,t)=>Array.from({length:1000},(_,i)=>t*100000+i)).flat());
 assert(calls.every(x=>x.trace===false));assert.equal(result.trials.length,3);assert(result.trials.every(x=>x.batchMs.length===5));
 assert.equal(result.wordBytesSha256.length,64);assert.deepStrictEqual(result.gates,{status:'evaluated',throughput:true,medianVariance:true,firstTestDeadline:true,secondTestDeadline:true});
});
test('trace workload is identical but cannot pass invented existing trace gates',async()=>{
 const {api,calls}=fixture();const result=await measure(api,true,clock(10000));
 assert.equal(result.completed,true);assert.equal(calls.length,3052);assert(calls.every(x=>x.trace===true));
 assert.deepStrictEqual(result.gates,{status:'not-applicable-to-existing-untraced-gates'});
});
test('unchanged untraced floor and deadlines retain slow outcomes',async()=>{
 const {api}=fixture();const result=await measure(api,false,clock(10001));
 assert.equal(result.completed,true);assert.equal(result.gates.throughput,false);assert.equal(result.gates.firstTestDeadline,false);assert.equal(result.gates.secondTestDeadline,false);
});
test('failed public calls retain attempted and completed accounting separately',async()=>{
 const first=await measure(fixture('batch').api,false,clock(1));
 assert.equal(first.completed,false);assert.equal(first.attemptedWords,50);assert.equal(first.completedWords,0);assert.equal(first.attemptedApiCalls,1);assert.equal(first.completedApiCalls,0);
 const next=await measure(fixture('single').api,false,clock(1));
 assert.equal(next.completed,false);assert.equal(next.attemptedWords,10051);assert.equal(next.completedWords,10050);assert.equal(next.attemptedApiCalls,3);assert.equal(next.completedApiCalls,2);
});
