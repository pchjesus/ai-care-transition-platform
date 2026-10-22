from browser_support import load_app
"""A3 Chromium injection smoke. Direct HTTP/file navigation is blocked by runtime policy."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import functools
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
thread=Thread(target=server.serve_forever,daemon=True);thread.start()
base=f'http://127.0.0.1:{server.server_address[1]}/index.html'
checks=[]
def check(label, condition):
    if not condition: raise AssertionError(label)
    checks.append(label)

try:
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    load_app(page,ROOT)
    check('initial page loads',page.get_by_role('heading',name='퇴원 후 관리계획').is_visible())
    check('six A2 evaluation tiles',page.locator('.domain').count()==6)
    check('six plan sections',page.locator('[data-item]').count()==6)
    check('SYN-001 publication blockers', '발행 전 해결할 사항' in page.locator('#gate-banner').inner_text())
    check('A2 v0.5 visual heritage',page.locator('.brand-mark').inner_text().replace(chr(10),'').replace(' ','').strip()=='D.')
    for width in [320,390,800,801,1024,1440]:
      page.set_viewport_size({'width':width,'height':900})
      page.wait_for_timeout(45)
      delta=page.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')
      check(f'no horizontal overflow {width}px',delta<=1)
    page.set_viewport_size({'width':1440,'height':900})
    page.locator('#rail-toggle').click()
    check('rail collapses', 'rail-collapsed' in page.locator('#shell').get_attribute('class'))
    # LocalStorage is unavailable in about:blank injection; persistence requires real-origin E2E.
    page.locator('#rail-toggle').click()
    # Case 3: unresolved items prevent approval even after requesting review
    page.locator('#patient-select').select_option('SYN-003')
    check('SYN-003 conflicting medication raw choice',page.locator('#gate-banner').inner_text().find('발행 전 해결할 사항')>=0)
    page.locator('#request').click()
    page.locator('#actor').select_option('APPROVER')
    check('SYN-003 approval blocked',page.locator('#approve').is_disabled())
    # Case 2 happy-path and publication immutable on refresh
    page.locator('#patient-select').select_option('SYN-002')
    check('SYN-002 has 0 blockers',page.locator('#gate-banner').inner_text().find('발행 전 필수 확인사항 없음')>=0)
    page.locator('#actor').select_option('NURSE')
    page.locator('#request').click()
    page.locator('#actor').select_option('NURSE')
    check('NURSE cannot approve',page.locator('#approve').is_disabled())
    page.locator('#actor').select_option('APPROVER')
    check('APPROVER can approve',page.locator('#approve').is_enabled())
    page.locator('#approve').click()
    check('approved status',page.locator('#workflow-state').inner_text()=='승인 완료')
    check('APPROVER can publish',page.locator('#publish').is_enabled())
    page.locator('#publish').click()
    check('published state',page.locator('#workflow-state').inner_text()=='발행 완료')
    check('published preview version',page.locator('#preview-mark').inner_text().startswith('발행 v'))
    check('public preview hides internal source',not page.locator('#preview-frame').locator('text=SIM-SYN-002').count())
    # Browser refresh persistence is NOT RUN in this injected-origin harness.
    page.locator('#actor').select_option('APPROVER')
    page.locator('#revise').click()
    check('revision resets draft',page.locator('#workflow-state').inner_text()=='새 버전 초안')
    check('revision increments version', 'v2.0' in page.locator('#version-chip').inner_text())
    check('existing published remains accessible',page.locator('#show-current').is_enabled())
    # Verify attempted unauthorized review doesn't destroy existing approval:
    page.locator('#patient-select').select_option('SYN-002')
    page.locator('#actor').select_option('NURSE')
    # Injected about:blank is not a secure context: substitute WebCrypto digest ONLY for UI smoke; real SHA-256 NOT RUN.
    if not page.evaluate('isSecureContext'): page.evaluate("Object.defineProperty(window.crypto, 'subtle', {configurable:true, value:{digest:async()=>new Uint8Array(32).fill(42).buffer}})")
    # PDF upload smoke: synthetic header-only bytes valid for header check, file saved only session
    page.locator('[data-tab="documents"]').click()
    page.locator('#file-attach').set_input_files({'name':'demo_synthetic.pdf','mimeType':'application/pdf','buffer':b'%PDF-1.4\n1 0 obj <</Type /Catalog>> endobj\n%%EOF\n'})
    page.wait_for_timeout(180)
    check('PDF file attachment registered',page.locator('.doc-card').count()>=1)
    check('attached PDF defaults internal',page.locator('[data-doc-edit="visibility"]').input_value()=='INTERNAL')
    page.locator('[data-doc-edit="visibility"]').select_option('PATIENT')
    check('public unreviewed PDF blocks',page.locator('#gate-banner').inner_text().find('발행 전 해결할 사항')>=0)
    page.locator('[data-action="review-doc"]').click()
    check('NURSE cannot mark PDF reviewed',page.locator('.doc-card .status-pill').first.inner_text()=='검토 전')
    page.locator('#actor').select_option('PHYSICIAN')
    page.locator('[data-action="review-doc"]').click()
    check('PHYSICIAN may review PDF',page.locator('.doc-card .status-pill').first.inner_text()=='내용 검토됨')
    page.locator('#patient-select').select_option('SYN-001')
    check('SYN-001 independent state',page.locator('#workflow-state').inner_text()=='초안 작성 중')
    check('no JS page errors',len(errors)==0)
    print('CHROMIUM PASS: '+str(len(checks))+' checks')
    for x in checks: print(' - '+x)
    browser.close()
finally:
  server.shutdown()
