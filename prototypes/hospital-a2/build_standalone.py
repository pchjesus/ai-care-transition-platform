"""Build one-file preview for inspection; index.html is the module-based source of truth."""
from pathlib import Path
import re
root=Path(__file__).parent
h=(root/'index.html').read_text(encoding='utf-8')
c=(root/'styles.css').read_text(encoding='utf-8')
d=(root/'data.js').read_text(encoding='utf-8')
e=(root/'engine.js').read_text(encoding='utf-8')
a=(root/'app.js').read_text(encoding='utf-8')
d=d.replace('export const','const')
e=re.sub(r"import \{[^;]+;\s*",'',e)
e=e.replace('export function','function').replace('export const','const')
a=re.sub(r"import \{[^;]+;\s*",'',a)
h=h.replace('<link rel="stylesheet" href="./styles.css"/>',f'<style>\n{c}\n</style>')
h=h.replace('<script type="module" src="./app.js"></script>','')
h=h.replace('</body>',f'<script>\n{d}\n{e}\n{a}\n</script>\n</body>')
(root/'preview.html').write_text(h,encoding='utf-8')
print('built preview.html',len(h))