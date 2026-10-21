"""Capture Phase 1 versus unified UI at the same patient and viewport; changes are intentional."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
import argparse,functools,json,hashlib
parser=argparse.ArgumentParser();parser.add_argument('--baseline',type=Path,required=True,help='Read-only git archive of 0bd2692, repository root');parser.add_argument('--output',type=Path,default=Path('/tmp/unified-verification/visual'));args=parser.parse_args()
args.output.mkdir(parents=True,exist_ok=True);root=Path(__file__).resolve().parents[3]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
servers=[];results=[]
try:
 for directory in [args.baseline,root]:
  server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(directory)));Thread(target=server.serve_forever,daemon=True).start();servers.append(server)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [390,768,1024,1440]:
   for screen in ['assessment','plan']:
    for label,server in zip(['before','after'],servers):
     context=browser.new_context(viewport={'width':width,'height':1000},device_scale_factor=1);page=context.new_page()
     if label=='before':
      page.goto(f'http://127.0.0.1:{server.server_port}/prototypes/integrated-v10/'+('a2/index.html' if screen=='assessment' else 'a3/index.html?handoff=SYN-002'))
      if screen=='assessment':page.locator('#patient-select').select_option('1')
     else:page.goto(f'http://127.0.0.1:{server.server_port}/prototypes/integrated-v10/a3/index.html?screen={screen}&patient=SYN-002')
     page.evaluate('document.fonts.ready');page.screenshot(path=str(args.output/f'{label}-{screen}-{width}.png'),full_page=True,animations='disabled')
     results.append({'label':label,'screen':screen,'width':width,'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth'),'forest':page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--forest').trim()"),'bodyFont':page.evaluate('getComputedStyle(document.body).fontFamily')});context.close()
  browser.close()
 css='prototypes/integrated-v10/a3/styles.css'
 hashes={label:hashlib.sha256((directory/css).read_bytes()).hexdigest() for label,directory in [('before',args.baseline),('after',root)]}
 assert hashes['before']==hashes['after'];assert not any(r['overflow'] for r in results if r['label']=='after')
 (args.output/'results.json').write_text(json.dumps({'baseline':'0bd2692ee73e360c7c5a2f5396468c5d33000cbe','a3StylesSHA256':hashes,'captures':results},ensure_ascii=False,indent=2)+'\n');print('PASS: 8 before/after pairs, 4 widths; A3 design stylesheet unchanged; unified pages have no horizontal overflow')
finally:
 for server in servers:server.shutdown();server.server_close()
