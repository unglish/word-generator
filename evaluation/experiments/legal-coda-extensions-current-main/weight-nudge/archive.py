import os,subprocess,pathlib,tempfile,json,gzip,hashlib
root=pathlib.Path('/tmp/pr313-weight-nudge')
def git(*args,input=None,env=None):return subprocess.check_output(['git',*args],input=input,env=env).decode().strip()
tag='archive/pr-313-weight-nudge';parent=git('rev-parse','HEAD')
assert parent=='f65dcf09291c4c8cabe6ee05ea1d2d086f6ae76b'
assert not git('status','--porcelain') and not git('tag','-l',tag)
(root/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in sorted(root.iterdir()) if p.is_file() and p.name!='SHA256SUMS'))
fd,index=tempfile.mkstemp(prefix='pr313-weight-nudge-index-');os.close(fd);os.unlink(index);env={**os.environ,'GIT_INDEX_FILE':index}
try:
 git('read-tree',parent,env=env)
 for p in sorted(root.iterdir()):
  if p.is_file():
   data=p.read_bytes();name=p.name
   if p.suffix=='.json' and len(data)>200000:data=gzip.compress(data,mtime=0);name+='.gz'
   blob=git('hash-object','-w','--stdin',input=data)
   git('update-index','--add','--cacheinfo','100644',blob,'evaluation/experiments/legal-coda-extensions-current-main/weight-nudge/'+name,env=env)
 tree=git('write-tree',env=env);commit=git('commit-tree',tree,'-p',parent,input=b'archive: PR 313 small coda-weight experiment\n')
 git('tag','-a',tag,commit,'-m','PR 313 small n/z coda weight experiment; exploratory evidence, no production change')
 print(json.dumps({'tag':tag,'commit':commit}))
finally:
 if os.path.exists(index):os.unlink(index)
