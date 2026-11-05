import os,subprocess,pathlib,tempfile,json,gzip,hashlib,shutil
root=pathlib.Path('/tmp/pr313-recalibration')
packet=pathlib.Path('/tmp/pr313-recalibration-packet');packet.mkdir(exist_ok=True)
def git(*args,input=None,env=None):return subprocess.check_output(['git',*args],input=input,env=env).decode().strip()
tag='archive/pr-313-recalibration'
assert not git('tag','-l',tag)
parent=git('rev-parse','HEAD')
assert not git('status','--porcelain')
for p in root.iterdir():
 if p.is_file():
  if p.suffix=='.json' and p.stat().st_size>200000:
   (packet/(p.name+'.gz')).write_bytes(gzip.compress(p.read_bytes(),mtime=0))
  else:shutil.copyfile(p,packet/p.name)
source={'implementation':parent,'generatorImplementation':'075df460a93416a40edc1e0ae90d2ae4020b239a','baseline':'43ef38ae029f4359f323d1c19955b3d44a10a6f7','files':{}}
for name in git('diff','--name-only','075df460',parent).splitlines():
 source['files'][name]=hashlib.sha256(pathlib.Path(name).read_bytes()).hexdigest()
(packet/'source.json').write_text(json.dumps(source,indent=2)+'\n')
(packet/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in sorted(packet.iterdir()) if p.is_file() and p.name!='SHA256SUMS'))
subprocess.run(['python3',str(packet/'verify.py')],check=True)
fd,index=tempfile.mkstemp(prefix='pr313-recalibration-index-');os.close(fd);os.unlink(index)
env={**os.environ,'GIT_INDEX_FILE':index}
try:
 git('read-tree',parent,env=env)
 for p in sorted(packet.iterdir()):
  if p.is_file():
   blob=git('hash-object','-w',str(p))
   path='evaluation/experiments/legal-coda-extensions-current-main/recalibration/'+p.name
   git('update-index','--add','--cacheinfo','100644',blob,path,env=env)
 tree=git('write-tree',env=env)
 commit=git('commit-tree',tree,'-p',parent,input=b'archive: PR 313 reviewed phoneme recalibration evidence\n')
 git('tag','-a',tag,commit,'-m','PR #313 frozen selective phoneme bounds, 30-stream paired development and 10 reserved confirmation streams')
 print(json.dumps({'tag':tag,'evidenceCommit':commit,'implementation':parent}))
finally:
 if os.path.exists(index):os.unlink(index)
