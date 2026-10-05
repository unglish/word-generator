import assert from 'node:assert/strict';
import test from 'node:test';
import { createGenerator, createSeededRng, englishConfig, generateWords } from '../../../src/index.ts';
import { configuredBatchAPI } from './performance-one-v2.mjs';

test('configured performance batches match public batch output and RNG continuation',()=>{
 const adapter=configuredBatchAPI({createSeededRng},createGenerator(englishConfig));
 for(const seed of [0,42,129]) {
  const a=createSeededRng(seed);const b=createSeededRng(seed);
  assert.deepEqual(adapter.generateWords(64,{rand:a,trace:true}),generateWords(64,{rand:b,trace:true}));
  assert.equal(a(),b());
 }
});
