import os,subprocess,pathlib,tempfile,json,gzip,hashlib,shutil
packet=pathlib.Path('/tmp/pr313-weight-tuning-packet');packet.mkdir(exist_ok=True)
roots={'final':pathlib.Path('/tmp/pr313-weight-adopt'),'development-z89-n455':pathlib.Path('/tmp/pr313-weight-validation'),'development-z88-n455':pathlib.Path('/tmp/pr313-weight-final')}
def git(*args,input=None,env=None):return subprocess.check_output(['git',*args],input=input,env=env).decode().strip()
tag='archive/pr-313-weight-tuning';parent=git('rev-parse','HEAD')
assert not git('status','--porcelain') and not git('tag','-l',tag)
for label,root in roots.items():
 for p in sorted(root.rglob('*')):
  if not p.is_file() or 'words' in p.relative_to(root).parts:continue
  target=packet/label/p.relative_to(root);target.parent.mkdir(parents=True,exist_ok=True);data=p.read_bytes()
  if p.suffix=='.json' and len(data)>200000:target=target.with_name(target.name+'.gz');data=gzip.compress(data,mtime=0)
  target.write_bytes(data)
shutil.copyfile(roots['final']/'README.md',packet/'README.md')
source=json.loads((roots['final']/'source-match.json').read_text());source['implementation']=parent;source['baseline']='43ef38ae029f4359f323d1c19955b3d44a10a6f7'
for path,digest in source['files'].items():assert hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()==digest
(packet/'source.json').write_text(json.dumps(source,indent=2)+'\n')
subprocess.run(['python3',str(packet/'final/verify.py')],check=True)
(packet/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(packet))+'\n'for p in sorted(packet.rglob('*'))if p.is_file() and p.name!='SHA256SUMS'))
fd,index=tempfile.mkstemp(prefix='pr313-weight-tuning-index-');os.close(fd);os.unlink(index);env={**os.environ,'GIT_INDEX_FILE':index}
try:
 git('read-tree',parent,env=env)
 for p in sorted(packet.rglob('*')):
  if p.is_file():
   blob=git('hash-object','-w',str(p));path='evaluation/experiments/legal-coda-extensions-current-main/weight-tuning/'+str(p.relative_to(packet));git('update-index','--add','--cacheinfo','100644',blob,path,env=env)
 tree=git('write-tree',env=env);commit=git('commit-tree',tree,'-p',parent,input=b'archive: PR 313 weight tuning with original quality gates\n')
 git('tag','-a',tag,commit,'-m','PR313 coda weights with original gates: full development, fresh confirmation, trace quality and required checks')
 print(json.dumps({'tag':tag,'evidenceCommit':commit,'implementation':parent}))
finally:
 if os.path.exists(index):os.unlink(index)
