"""Refresh the self-contained HTML files from editable app.js and styles.css.
Run: python build_standalone.py
No network access or installed packages required.
"""
from pathlib import Path
import re
root=Path(__file__).resolve().parent
css=(root/'styles.css').read_text(encoding='utf-8')
js=(root/'app.js').read_text(encoding='utf-8')
for name in ('index.html','preview.html'):
    p=root/name
    h=p.read_text(encoding='utf-8')
    h=re.sub(r'(?s)(<style>).*?(</style>)',lambda m:m.group(1)+'\n'+css+'\n'+m.group(2),h,count=1)
    h=re.sub(r'(?s)(<script>).*?(</script>)',lambda m:m.group(1)+'\n'+js+'\n'+m.group(2),h,count=1)
    p.write_text(h,encoding='utf-8')
    print('Updated',name)
