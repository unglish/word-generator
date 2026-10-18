import pathlib,subprocess,tarfile,io,hashlib,json
repo=pathlib.Path('/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator');dest=pathlib.Path('/private/tmp/q12c-control-ce3800d-v1');dest.mkdir(exist_ok=False)
revision='ce3800dd3454feb33cdb32f8be96cf2fc684c4eb'
paths=['src','package.json','package-lock.json','tsconfig.json']
data=subprocess.check_output(['git','archive',revision,*paths],cwd=repo)
with tarfile.open(fileobj=io.BytesIO(data)) as tar:tar.extractall(dest,filter='data')
files={}
for p in sorted(dest.rglob('*')):
 if p.is_file():
  rel=str(p.relative_to(dest));original=subprocess.check_output(['git','show',revision+':'+rel],cwd=repo);assert p.read_bytes()==original
  files[rel]={'bytes':len(original),'sha256':hashlib.sha256(original).hexdigest()}
(dest/'node_modules').symlink_to((repo/'node_modules').resolve(),target_is_directory=True)
manifest={'version':'q12c-control-source-materialization-v1','revision':revision,'root':str(dest),'files':files}
pathlib.Path('/private/tmp/q12c-control-materialization-v1.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Verified',len(files),'exact Git blobs')
