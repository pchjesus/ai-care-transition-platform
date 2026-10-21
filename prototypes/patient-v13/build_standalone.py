"""Build patient and developer standalone pages from shared source modules."""
from pathlib import Path
import re
root=Path(__file__).resolve().parent
css=(root/'styles.css').read_text(encoding='utf-8')
modules=['data.js','pdf-assets.js','pdf.js','storage.js','app.js']
parts=[]
for name in modules:
 source=(root/name).read_text(encoding='utf-8')
 source=re.sub(r'^import .*?;\n','',source,flags=re.M)
 source=re.sub(r'^export (?=(?:const|function) )','',source,flags=re.M)
 parts.append(source)
js='\n'.join(parts)
for name in ['index','preview']:
 h=(root/(name+'.source.html')).read_text(encoding='utf-8')
 h=h.replace('<link rel="stylesheet" href="styles.css">','<style>\n'+css+'\n</style>')
 h=h.replace('<script type="module" src="app.js"></script>','<script>\n'+js+'\n</script>')
 (root/(name+'.html')).write_text(h,encoding='utf-8')
 print('Built',name+'.html')
