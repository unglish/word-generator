import {createReadStream,writeFileSync,readFileSync} from 'node:fs';
import {createGunzip} from 'node:zlib';
import {createInterface} from 'node:readline';
const result={};
for(const [arm,dir] of [['baseline','/tmp/pr313-evidence/quality/baseline'],['candidate','/tmp/pr313-evidence/final-candidate']]) {
 const {manifest}=JSON.parse(readFileSync(dir+'/manifest.json','utf8')); const profiles={};
 for(const artifact of manifest.artifacts.filter(a=>a.file.startsWith('words/'))) {
  const lines=createInterface({input:createReadStream(dir+'/'+artifact.file).pipe(createGunzip()),crlfDelay:Infinity});
  for await(const line of lines) {
   const draw=JSON.parse(line), w=draw.word;
   const p=profiles[draw.profile]??={words:0,zPhones:0,phones:0,rejectedSAfterZ:0,shapeRemovedZ:0,witnesses:[]};p.words++;
   for(const s of w.syllables) for(const phone of [...s.onset,...s.nucleus,...s.coda]) {p.phones++;if(phone.sound==='z')p.zPhones++;}
   const stage=w.trace.stages.find(s=>s.name==='repairClusterShape');
   if(stage) {const count=syllables=>syllables.flatMap(s=>s.coda).filter(s=>s==='z').length;const removed=count(stage.before)-count(stage.after);p.shapeRemovedZ+=removed;if(removed>0 && p.witnesses.length<3)p.witnesses.push(draw);}
   for(const event of w.trace.structural) if(event.event==='codaExtensionRejected'&&event.extension==='finalS'&&event.reason==='voicing'&&event.coda.includes('z')) {p.rejectedSAfterZ++;if(p.witnesses.length<3)p.witnesses.push(draw);}
  }
 }
 result[arm]=profiles;
}
writeFileSync('/tmp/pr313-evidence/voicing.json',JSON.stringify(result,null,2));
