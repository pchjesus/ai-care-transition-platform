"""Shared real-origin/standalone harness; app source is never injected into HTTP tests."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from pathlib import Path
import atexit,functools,os
ARTIFACTS=Path(os.environ.get('A3_ARTIFACTS','/tmp/hospital-a3-v04-artifacts'))
ARTIFACTS.mkdir(parents=True,exist_ok=True)
_servers={}
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def load_app(page,root):
 root=Path(root)
 if os.environ.get('A3_MODE')=='standalone':
  page.set_content((root/'preview.html').read_text(encoding='utf-8'),wait_until='load')
 else:
  if root not in _servers:
   server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
   Thread(target=server.serve_forever,daemon=True).start();_servers[root]=server
   atexit.register(lambda s=server:(s.shutdown(),s.server_close()))
  page.goto(f'http://127.0.0.1:{_servers[root].server_port}/index.html',wait_until='load')
 page.locator('#patient-name').wait_for()
