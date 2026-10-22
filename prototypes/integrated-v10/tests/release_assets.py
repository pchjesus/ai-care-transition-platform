"""Explicit static release inventory; no Git/Pages settings or remote writes."""
from pathlib import Path
from urllib.parse import urlsplit,unquote
from html import unescape
import argparse,hashlib,json,re,shutil
RUNTIME={'.html','.js','.css','.pdf','.svg','.png','.jpg','.webp','.woff','.woff2'}
MANAGED=['patient','prototypes/integrated-v10','prototypes/hospital-a2']
def sources(root):
 result={}
 for directory in MANAGED:
  for path in (root/directory).rglob('*'):
   rel=path.relative_to(root)
   if path.is_file() and path.suffix in RUNTIME and 'tests' not in rel.parts and not path.name.endswith('.test.js'):result[str(rel)]=path
 return result
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def copy_sources(source,stage):
 for name,path in sources(source).items():
  target=stage/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,target)
 # Preserve Pages-only entrypoints while avoiding their implicit /favicon.ico 404.
 for name in ['index.html','compare.html']:
  entry=stage/name;text=entry.read_text()
  if '<link rel="icon"' not in text:entry.write_text(text.replace('</head>','<link rel="icon" href="data:,"></head>',1))
def dependencies(path):
 if path.suffix not in {'.html','.js','.css'}:return []
 text=path.read_text();refs=[]
 if path.suffix in {'.html','.js'}:
  refs+=re.findall(r'''(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["'](\.[^"']+)["']''',text)
  refs+=re.findall(r'''\b(?:href|src)=["']([^"']+)["']''',text)
 if path.suffix=='.css':refs+=re.findall(r'''url\(\s*["']?([^\s"')]+)''',text)
 return refs
def verify(source,stage):
 expected=sources(source)
 for name,path in expected.items():
  target=stage/name
  if not target.is_file() or digest(path)!=digest(target):raise AssertionError('Missing/mismatched release file: '+name)
 checked=0
 # Include preserved landing, comparison and legacy aliases in path verification.
 for path in stage.rglob('*'):
  if not path.is_file() or path.suffix not in {'.html','.js','.css'}:continue
  for ref in dependencies(path):
   ref=unescape(ref)
   if not ref or any(x in ref for x in ['${','{{','<','>']):continue
   url=urlsplit(ref)
   if url.scheme or url.netloc or not url.path:continue
   target=(stage/unquote(url.path.lstrip('/')) if url.path.startswith('/') else path.parent/unquote(url.path)).resolve()
   if not target.is_relative_to(stage.resolve()):raise AssertionError('Path escapes project root: '+str(path.relative_to(stage))+' -> '+ref)
   if not target.is_file() and not (target.is_dir() and (target/'index.html').is_file()):raise AssertionError('Broken dependency: '+str(path.relative_to(stage))+' -> '+ref)
   checked+=1
 for entry in ['index.html','compare.html','a2/index.html','a3/index.html','.nojekyll']:
  if not (stage/entry).is_file():raise AssertionError('Missing preserved entry: '+entry)
 return {'result':'PASS','matchedSourceFiles':len(expected),'verifiedDependencies':checked}
def manifest(stage,source_commit,pages_base):
 files=[]
 for p in sorted(stage.rglob('*')):
  if p.is_file() and p.name!='release-manifest.json':files.append({'path':str(p.relative_to(stage)),'bytes':p.stat().st_size,'sha256':digest(p)})
 return {'sourceCommit':source_commit,'previousPagesCommit':pages_base,'isSyntheticDemo':True,'files':files}
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,default=Path(__file__).resolve().parents[3]);parser.add_argument('--stage',type=Path,required=True);parser.add_argument('--copy',action='store_true');parser.add_argument('--source-commit');parser.add_argument('--pages-base');args=parser.parse_args()
 if args.copy:copy_sources(args.source,args.stage)
 result=verify(args.source,args.stage)
 if args.source_commit:
  (args.stage/'release-manifest.json').write_text(json.dumps(manifest(args.stage,args.source_commit,args.pages_base),ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(result,ensure_ascii=False))
