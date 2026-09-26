// Independent comparison through the public law API; no production recurrence imports.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {createGunzip} from 'node:zlib';
import {createInterface} from 'node:readline';
import {resolve, join} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';

const root=resolve(process.argv[2]);
const archive=resolve(process.argv[3]);
const output=resolve(process.argv[4]);
const protocolPath=join(root,'evaluation/experiments/conditional-root-stress/protocol/q09-dp-oracle-protocol-v2.json');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const protocolBytes=readFileSync(protocolPath);
assert.equal(sha(protocolBytes),'93c09bc77c513a5933ba146a31884fcba7947828ed6901ea95d97bd03b6852f2');
const protocol=JSON.parse(protocolBytes);
const oracleManifest=JSON.parse(readFileSync(archive+'.manifest.json','utf8'));
assert.equal(oracleManifest.protocolSha256,sha(protocolBytes));
assert.equal(oracleManifest.oracleSha256,'20d7ff793169ef78a0f4ee27e4420f53bb19ad431dcd18e072d42f1ffa0027e9');
assert.equal(sha(readFileSync(archive)),oracleManifest.compressedSha256);
const filesUnder=directory=>readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>entry.isDirectory()?filesUnder(join(directory,entry.name)):[join(directory,entry.name)]);
const sourcePaths=[...filesUnder(join(root,'src')).filter(path=>path.endsWith('.ts')),join(root,'package-lock.json'),protocolPath,fileURLToPath(import.meta.url)];
const before=Object.fromEntries(sourcePaths.map(path=>[path,sha(readFileSync(path))]));
assert.equal(before[join(root,'src/core/root-stress-law.ts')],'b3050a0d0e68276f861cb89a29f64b402a7a9ad9d69427bff1988194f3a4e4fc');
assert.equal(before[join(root,'src/core/root-stress-law-types.ts')],'a91bd0cf7ee2d98392e39124b39a447534faa9d60d54aad5073d9ba417dc07d0');
const {createRootStressLaw}=await import(pathToFileURL(join(root,'src/index.ts')).href);
const thresholds={absolute:Number(protocol.tolerances.allMaterializedProbabilitiesAbsolute),relative:Number(protocol.tolerances.relativeProbabilityTolerance),relativeMin:Number(protocol.tolerances.relativeProbabilityWhenReferenceAtLeast),log:Number(protocol.tolerances.finiteLogMassAbsolute),normalization:Number(protocol.tolerances.normalizationAbsolute)};
const maxima={};
const counters={factorCases:0,countStrata:0,positiveCountStrata:0,zeroCountStrata:0,componentMassComparisons:0,patternQueries:0,positivePatternQueries:0,zeroPatternQueries:0,materializedProbabilityComparisons:0,finiteLogComparisons:0,normalizations:0,workBounds:0,zeroSupportRejections:0};
const sectionCases={};
let coordinate='initial';
function check(condition,message){assert.ok(condition,`${coordinate}: ${message}`);}
function maximum(name,value,at){check(Number.isFinite(value),`${name} is not finite`);if(!maxima[name]||value>maxima[name].value)maxima[name]={value,coordinate:at};}
function probability(actual,expected,label){
  check(Number.isFinite(actual)&&actual>=0,`${label}: invalid probability`);
  const error=Math.abs(actual-expected);maximum('probabilityAbsolute',error,coordinate+':'+label);
  check(error<=thresholds.absolute,`${label}: absolute error ${error}`);
  if(expected>=thresholds.relativeMin){const relative=error/expected;maximum('probabilityRelative',relative,coordinate+':'+label);check(relative<=thresholds.relative,`${label}: relative error ${relative}`);}
  counters.materializedProbabilityComparisons++;
}
function mass(actual,expected,label){
  check(actual&&actual.status===expected.status,`${label}: structural support mismatch`);
  if(expected.status==='zero'){assert.deepEqual(actual,{status:'zero'},`${coordinate}:${label} malformed zero`);return;}
  assert.deepEqual(Object.keys(actual).sort(),['status','value'],`${coordinate}:${label} finite fields`);
  check(Number.isFinite(actual.value)&&Number.isFinite(expected.log),`${label}: nonfinite log`);
  const error=Math.abs(actual.value-expected.log);maximum('finiteLogAbsolute',error,coordinate+':'+label);
  check(error<=thresholds.log,`${label}: log error ${error}`);
  counters.finiteLogComparisons++;probability(Math.exp(actual.value),expected.probability,label);
}
const maskOf=marks=>marks.reduce((mask,mark,i)=>mark==='secondary'?mask+(1n<<BigInt(i)):mask,0n).toString();
function allPatterns(n,primary){
  const patterns=[];const remaining=Array.from({length:n},(_,i)=>i).filter(i=>i!==primary);
  for(let bits=0;bits<2**remaining.length;bits++){
    const marks=Array(n).fill('unmarked');marks[primary]='primary';
    remaining.forEach((index,ordinal)=>{if(Math.floor(bits/2**ordinal)%2)marks[index]='secondary';});patterns.push(marks);
  }return patterns;
}
function checkWork(work,n,k,positiveComponents){
  for(const value of Object.values(work))check(Number.isSafeInteger(value)&&value>=0,'invalid work counter');
  check(work.componentPasses===positiveComponents,'component pass count');
  check(work.positions===positiveComponents*n,'position count');
  check(work.statesVisited<=positiveComponents*n*2*(k+1),'state bound');
  check(work.transitionsConsidered<=positiveComponents*n*4*(k+1),'transition bound');
  check(work.allocatedCells===positiveComponents*4*(k+1),'rolling allocation count');
  check(work.peakRetainedCells===(positiveComponents?4*(k+1):0),'rolling peak bound');counters.workBounds++;
}

const lines=createInterface({input:createReadStream(archive).pipe(createGunzip()),crlfDelay:Infinity});
for await(const line of lines){
  const row=JSON.parse(line), c=row.case;coordinate=row.id;
  const input={beforePrimary:Array(c.n).fill('unmarked'),afterPrimary:Array.from({length:c.n},(_,i)=>i===c.primaryIndex?'primary':'unmarked'),operationalHeavy:c.operationalHeavy,secondary:c.secondary,rhythmic:c.rhythmic,lambda:Math.log(row.factor.denominator/row.factor.numerator)};
  const inputBefore=JSON.stringify(input),law=createRootStressLaw(input);
  const expectedPatterns=new Map();const analyses=[];
  for(const expected of row.expected.counts){
    const k=expected.secondaryCount;coordinate=`${row.id}:K${k}`;
    const actual=law.analyzeCount(k);analyses[k]=actual;
    check(actual.secondaryCount===k,'returned count');mass(actual.logPartition,expected.partition,'partition');
    check(actual.components.length===expected.components.length,'component count');
    expected.components.forEach((component,i)=>{
      const a=actual.components[i];assert.deepEqual(a.component,component.explicitIndex===null?{kind:'no-explicit-mark'}:{kind:'explicit-mark',syllableIndex:component.explicitIndex},`${coordinate}:component identity/order`);
      mass(a.prior,component.prior,`component${i}:prior`);mass(a.tiltedMassAtK,component.tiltedAtK,`component${i}:tilted`);counters.componentMassComparisons+=2;
    });
    checkWork(actual.work,c.n,k,expected.components.filter(part=>part.prior.status==='finite').length);
    if(expected.partition.status==='zero'){
      counters.zeroCountStrata++;let draws=0;
      assert.throws(()=>law.sample(k,()=>{draws++;return .5;}),error=>error.code==='zero-support',`${coordinate}:zero-support rejection`);
      check(draws===0,'zero-support consumed RNG');counters.zeroSupportRejections++;
    }else{
      counters.positiveCountStrata++;
      const componentSum=actual.components.reduce((sum,component)=>sum+(component.tiltedMassAtK.status==='finite'?Math.exp(component.tiltedMassAtK.value-actual.logPartition.value):0),0);
      const error=Math.abs(componentSum-1);maximum('componentNormalizationAbsolute',error,coordinate);check(error<=thresholds.normalization,'component normalization');counters.normalizations++;
    }
    for(const pattern of expected.patterns){check(!expectedPatterns.has(pattern.secondaryMask),'duplicate serialized oracle pattern');expectedPatterns.set(pattern.secondaryMask,{...pattern,k});}
    counters.countStrata++;
  }
  // Exhaust every well-formed same-primary vector for small roots, including outside support.
  // Long endpoint cases check bounded oracle support only; no exponential completeness claim.
  const patterns=c.n<=8?allPatterns(c.n,c.primaryIndex):[...expectedPatterns.values()].map(pattern=>pattern.marks);
  const conditionalSums=Array(c.n).fill(0),priorSum=[];
  for(const marks of patterns){
    const mask=maskOf(marks),expected=expectedPatterns.get(mask),k=marks.filter(mark=>mark==='secondary').length;
    coordinate=`${row.id}:K${k}:mask${mask}`;const actual=law.analyzePattern(marks);
    const adjacency=marks.slice(1).reduce((count,mark,i)=>count+Number(mark!=='unmarked'&&marks[i]!=='unmarked'),0);
    check(actual.secondaryCount===k&&actual.adjacentMarkedPairs===adjacency,'count or adjacency');
    mass(actual.priorLogMass,expected?.prior??{status:'zero'},'pattern:prior');
    mass(actual.tiltedLogMass,expected?.tilted??{status:'zero'},'pattern:tilted');
    if(expected){
      check(expected.k===k&&expected.adjacencies===adjacency,'oracle annotation');
      const conditional={status:'finite',value:actual.tiltedLogMass.value-analyses[k].logPartition.value};
      mass(conditional,expected.conditional,'pattern:conditional');
      conditionalSums[k]+=Math.exp(conditional.value);priorSum.push(Math.exp(actual.priorLogMass.value));counters.positivePatternQueries++;
    }else counters.zeroPatternQueries++;
    counters.patternQueries++;
  }
  for(let k=0;k<c.n;k++)if(analyses[k].logPartition.status==='finite'){
    coordinate=`${row.id}:K${k}`;const error=Math.abs(conditionalSums[k]-1);maximum('patternNormalizationAbsolute',error,coordinate);check(error<=thresholds.normalization,'pattern normalization');counters.normalizations++;
  }
  coordinate=row.id;const priorError=Math.abs(priorSum.reduce((sum,value)=>sum+value,0)-1);maximum('priorNormalizationAbsolute',priorError,coordinate);check(priorError<=thresholds.normalization,'prior normalization');counters.normalizations++;
  check(JSON.stringify(input)===inputBefore,'public API mutated input');
  counters.factorCases++;sectionCases[row.section]=(sectionCases[row.section]??0)+1;
  if(counters.factorCases%10000===0)console.log(JSON.stringify({factorCases:counters.factorCases,patternQueries:counters.patternQueries}));
}
assert.equal(counters.factorCases,oracleManifest.factorCases);
assert.deepEqual(sectionCases,oracleManifest.sectionCases);
const after=Object.fromEntries(sourcePaths.map(path=>[path,sha(readFileSync(path))]));assert.deepEqual(after,before,'source files changed during comparison');
assert.equal(sha(readFileSync(archive)),oracleManifest.compressedSha256,'oracle archive changed');
const report={version:'q09-independent-law-comparison-v1',passed:true,counters,sectionCases,maxima,thresholds,protocolSha256:sha(protocolBytes),oracleManifest,sourceSha256:before,scope:'Exhaustive same-primary patterns and every K for registered n<=8 grid; all K and supported patterns for deterministic-rhythm long endpoint cases; not sampling-frequency or linguistic-quality evidence.'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:true,counters,sectionCases,maxima}));
