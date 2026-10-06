import { readRun } from '/private/tmp/q14a-completion-joint-neighbor-v2/evaluation/quality/capture.ts';
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const baseline='/private/tmp/q14a-completion-isolated-u-evidence-v1/candidate-archive',candidate='/private/tmp/q14a-completion-joint-neighbor-evidence-v2/candidate-archive';
const a=await readRun(baseline,true),b=await readRun(candidate,true);
if(a.manifest.protocolDigest!==b.manifest.protocolDigest||a.manifest.referenceDigest!==b.manifest.referenceDigest||a.manifest.evaluatorDigest!==b.manifest.evaluatorDigest)throw Error('Incompatible metric authority');
function delta(a,b){if(typeof a==='number'&&typeof b==='number')return {baseline:a,candidate:b,change:b-a};if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b))return Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].sort().map(k=>[k,delta(a[k],b[k])]));return {baseline:a??null,candidate:b??null};}
const profiles=a.summary.profiles.map(old=>{const fresh=b.summary.profiles.find(p=>p.id===old.id);if(!fresh||old.words!==50000||fresh.words!==50000)throw Error('Incomplete profile');return {id:old.id,words:old.words,metrics:delta(old.metrics,fresh.metrics),distributions:delta(old.distributions,fresh.distributions),uniqueSpellings:delta(old.uniqueSpellings,fresh.uniqueSpellings),meanLetters:delta(old.meanLetters,fresh.meanLetters)};});
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
writeFileSync('/private/tmp/q14a-completion-joint-neighbor-evidence-v2/quality-summary-comparison.json',JSON.stringify({baselineManifestSha256:sha(baseline+'/manifest.json'),candidateManifestSha256:sha(candidate+'/manifest.json'),allArchiveArtifactsVerified:true,profiles,scope:'Complete frozen metric summary comparison for corrected candidate revision; no human-quality acceptance or whole-Q14a completion claim.'},null,2)+'\n',{flag:'wx'});
console.log('All 25 artifacts per arm and compatible metric authorities verified; full profile metrics retained.');
