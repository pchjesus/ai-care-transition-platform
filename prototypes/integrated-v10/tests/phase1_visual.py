"""Compare default integrated UI with a read-only export of the requested baseline."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
import argparse,functools,json
parser=argparse.ArgumentParser();parser.add_argument('--baseline',type=Path,required=True);parser.add_argument('--output',type=Path,default=Path('/tmp/integrated-phase1/visual'));args=parser.parse_args()
root=Path(__file__).resolve().parents[1];args.output.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
servers=[]
for directory in [args.baseline,root]:
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(directory)));Thread(target=server.serve_forever,daemon=True).start();servers.append(server)
results=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [320,390,768,800,801,1024,1440]:
   for screen in ['a2','a2-modal','a3','a3-learn']:
    paths=[]
    for label,server in zip(['before','after'],servers):
     ctx=b.new_context(viewport={'width':width,'height':1000},device_scale_factor=1,timezone_id='Asia/Seoul');page=ctx.new_page()
     page.goto(f'http://127.0.0.1:{server.server_port}/'+('a2/' if screen.startswith('a2') else 'a3/')+'index.html')
     if screen=='a2-modal':page.locator('#open-a1').click()
     if screen=='a3-learn':page.locator('[data-nav="learn"]').click()
     page.evaluate('document.fonts.ready');page.wait_for_timeout(40)
     path=args.output/f'{label}-{screen}-{width}.png';page.screenshot(path=str(path),full_page=True,animations='disabled',caret='hide');paths.append(path);ctx.close()
    before,after=[Image.open(path).convert('RGB') for path in paths]
    same=before.size==after.size and ImageChops.difference(before,after).getbbox() is None
    result={'width':width,'screen':screen,'identical':same};results.append(result);print(json.dumps(result),flush=True)
  b.close()
finally:
 for s in servers:s.shutdown();s.server_close()
(args.output/'results.json').write_text(json.dumps(results,indent=2)+'\n')
assert all(r['identical'] for r in results),'Unexpected UI difference; inspect captured images'
