"""Browser entry modes share the same assertions and real app code."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import functools,os,atexit
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('PATIENT_ARTIFACTS','/tmp/patient-v13-artifacts'));OUT.mkdir(parents=True,exist_ok=True)
MODE=os.environ.get('PATIENT_MODE','http')
_server=None
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def load_page(page,dev=False):
 global _server
 name='preview' if dev else 'index'
 if MODE=='file':page.goto((ROOT/(name+'.html')).as_uri(),wait_until='load')
 else:
  if _server is None:
   _server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
   Thread(target=_server.serve_forever,daemon=True).start();atexit.register(lambda:(_server.shutdown(),_server.server_close()))
  entry=name+('.source.html' if MODE=='source' else '.html')
  page.goto(f'http://127.0.0.1:{_server.server_port}/{entry}',wait_until='load')
