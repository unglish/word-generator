import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const root='/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator';
const bytes=await readFile(new URL('./experimental-profile-draft.json',import.meta.url));
const profile=JSON.parse(bytes);
const {englishConfig}=await import(pathToFileURL(root+'/src/config/english.ts').href);
const {categoryPaths}=await import(pathToFileURL(root+'/src/core/morphology/categories.ts').href);
const config=englishConfig.morphology;
assert.deepEqual(profile.inventory.prefixes, config.prefixes.map(affix=>affix.written));
assert.deepEqual(profile.inventory.suffixes, config.suffixes.map(affix=>affix.written));
const weights={prefix:config.prefixes.map(affix=>affix.frequency),suffix:config.suffixes.map(affix=>affix.frequency)};
const templates={};
const observed=new Set();
for(const template of ['bare','prefixed','suffixed','both']) {
 const paths=categoryPaths(profile.model,template,weights);
 assert(paths.length>0);
 for(const path of paths) {
  let category=path.stem;
  for(const step of path.steps) {
   assert.equal(step.input,category); category=step.output; observed.add(step.sense);
  }
  assert.equal(path.final,category);
 }
 templates[template]={paths:paths.length,totalWeight:paths.reduce((sum,path)=>sum+path.weight,0),
  categories:Object.fromEntries(profile.model.stems.map(stem=>[stem.id,paths.filter(path=>path.stem===stem.id).length]))};
}
assert.equal(observed.size,profile.model.senses.length,'Every declared sense must retain a licensed path');
console.log(JSON.stringify({profileSha256:createHash('sha256').update(bytes).digest('hex'),affixes:33,senses:observed.size,templates,
 scope:'Draft inventory and path-graph validation, not generator observations or linguistic efficacy.'},null,2));
