import {writeFileSync,readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [root,out]=process.argv.slice(2);
const {generateWord,createSeededRng}=await import(pathToFileURL(root+'/src/index.ts'));
const rand=createSeededRng(42);let total=0,count=0;const witnesses=[];
for(let draw=0;draw<200000;draw++) {
 const word=generateWord({rand,trace:true}); const text=word.written.clean.toLowerCase(); total+=Math.max(0,text.length-2);
 for(let i=0;i<text.length-2;i++) if(text.slice(i,i+3)==='ugh') {count++;witnesses.push({draw,word});}
}
const cmu=JSON.parse(readFileSync(root+'/data/cmu/cmu-lexicon-trigrams.json','utf8'));
const referenceTotal=Object.values(cmu).reduce((a,b)=>a+b,0);
writeFileSync(out,JSON.stringify({seed:42,words:200000,total,count,ratio:(count/total)/(cmu.ugh/referenceTotal),witnesses},null,2));
console.log(out,count,total,(count/total)/(cmu.ugh/referenceTotal));
