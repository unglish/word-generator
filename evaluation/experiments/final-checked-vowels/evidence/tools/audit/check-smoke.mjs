import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {endpointCounts} from './production-endpoints.mjs';
import {englishConfig} from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/src/index.ts';
import {verifyLexicalSpellingOperations} from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/src/core/lexical-spelling-evidence.ts';
import {verifyFinalWordSourceLinks} from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/src/core/final-word-sources.ts';
import {verifyConfiguredAllomorphs} from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/src/core/morphology/allomorph-evidence.ts';
const fixtures=JSON.parse(gunzipSync(readFileSync(new URL('./smoke-words.json.gz',import.meta.url)))).fixtures;
const records={};
for(const [key,word] of Object.entries(fixtures)){
 verifyLexicalSpellingOperations(word,englishConfig);verifyFinalWordSourceLinks(word);verifyConfiguredAllomorphs(word,englishConfig);
 const counts=endpointCounts(word);assert.equal(counts['endpoint/words'],1);records[key]=counts;
}
writeFileSync(new URL('./smoke-production-counts.json',import.meta.url),JSON.stringify({passed:true,records},null,2)+'\n');
console.log(JSON.stringify({passed:true,records:Object.keys(records).length}));
