"""Independent Chromium checks of real HTTP A2 -> A3 integration."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
import functools,unittest,os
ROOT=Path(os.environ.get('INTEGRATED_ROOT',str(Path(__file__).resolve().parents[1])))
KEY='care-transition-integrated-v10-a3-synthetic-only';INBOX='care-transition-integrated-v10-a2-inbox'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
class Integration(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));Thread(target=cls.server.serve_forever,daemon=True).start();cls.base=f'http://127.0.0.1:{cls.server.server_port}/'
  cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop();cls.server.shutdown();cls.server.server_close()
 def setUp(self):
  self.ctx=self.browser.new_context(viewport={'width':1440,'height':1000});self.page=self.ctx.new_page();self.page.set_default_timeout(4000);self.errors=[];self.page.on('pageerror',lambda e:self.errors.append(str(e)));self.accept_dialog=lambda d:d.accept();self.page.on('dialog',self.accept_dialog)
 def tearDown(self):self.ctx.close();self.assertEqual(self.errors,[])
 def a3(self,page=None):
  page=page or self.page;page.goto(self.base+'a3/index.html');expect(page.locator('#patient-select')).to_be_visible();page.locator('.legacy-inbox').evaluate('(d)=>d.open=true');page.locator('#patient-select').select_option('SYN-002')
 def send(self,patient='1',field='gait',value='device'):
  self.page.goto(self.base+'a2/legacy.html');self.page.locator('#patient-select').select_option(patient)
  if field:self.page.locator('#field-'+field).select_option(value)
  self.page.locator('#integrated-send').click();self.page.wait_for_url('**/a3/index.html?*');expect(self.page.locator('#patient-select')).to_be_visible();self.page.locator('.legacy-inbox').evaluate('(d)=>d.open=true')
 def select(self,id='SYN-002'):self.page.locator('#patient-select').select_option(id)
 def records(self):return self.page.evaluate('key=>JSON.parse(localStorage.getItem(key))',KEY)
 def pending(self):return self.page.evaluate('key=>JSON.parse(localStorage.getItem(key))',INBOX)
 def receive(self):
  self.page.locator('#integrated-receive').click();self.page.wait_for_function("!document.querySelector('#integrated-receive').hasAttribute('aria-busy')")
 def verify_items(self):
  self.page.locator('[data-tab="plan"]').click();self.page.locator('#actor').select_option('APPROVER')
  for sec in ['today','medication','followup','warning','contact','support']:
   card=self.page.locator(f'[data-item="{sec}"]')
   if card.get_attribute('open') is None:card.locator(':scope > summary').click()
   card.locator('[data-edit="verified"]').check()
 def approve(self):self.page.locator('#request').click();self.page.locator('#actor').select_option('APPROVER');self.page.locator('#approve').click()
 def deny_writes(self):self.page.evaluate("key=>{const write=Storage.prototype.setItem;window.restoreWrites=()=>{Storage.prototype.setItem=write;};Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Quota','QuotaExceededError');return write.call(this,k,v)}}",KEY)
 def test_syn002_handoff_recheck_and_reload(self):
  self.send();self.select();packet=self.pending();self.receive();r=self.records()['SYN-002']
  self.assertEqual(r['assessment']['values']['function']['gait'],'device');self.assertEqual(r['assessment']['id'],packet['assessmentId']);self.assertTrue(all(not i['verified'] for i in r['draft']['items']))
  self.assertIsNone(self.pending());self.verify_items();self.approve();expect(self.page.locator('#publish')).to_be_enabled()
  self.page.reload();self.select();expect(self.page.locator('#workflow-state')).to_have_text('승인 완료');self.assertEqual(self.records()['SYN-002']['assessment']['id'],packet['assessmentId'])
 def test_syn003_missing_conflict_block_approval(self):
  self.send('2','transfer','CONFLICT');self.select('SYN-003');self.receive();r=self.records()['SYN-003'];self.assertTrue(any(d['status']=='UNKNOWN' for d in r['assessment']['domainResults']));self.assertTrue(any(d['status']=='CONFLICTING' for d in r['assessment']['domainResults']));self.assertTrue(any(i['id']=='ISS-medication-reconciliation' for i in r['draft']['issues']))
  self.page.locator('#request').click();self.page.locator('#actor').select_option('APPROVER');expect(self.page.locator('#approve')).to_be_disabled()
 def test_current_patient_must_match_packet(self):
  self.send();self.select('SYN-003');before=self.records()
  self.page.locator('#integrated-receive').evaluate('(b)=>{b.disabled=false;b.click()}')
  self.assertEqual(self.records(),before);self.assertEqual(self.pending()['patientId'],'SYN-002');expect(self.page.locator('#patient-select')).to_have_value('SYN-003')
 def test_incoming_url_selects_patient_without_importing(self):
  self.send();expect(self.page.locator('#patient-select')).to_have_value('SYN-002');self.assertFalse('integration' in self.records()['SYN-002']);self.assertIsNotNone(self.pending())
 def test_receipt_storage_failure_rolls_back_and_retains_packet(self):
  self.send();self.select();before=self.records();packet=self.pending();self.deny_writes();self.receive()
  self.assertEqual(self.records(),before);self.assertEqual(self.pending(),packet);self.assertIn('인계 실패',self.page.locator('#toast').inner_text());self.page.evaluate('window.restoreWrites()');self.receive();self.assertEqual(self.records()['SYN-002']['assessment']['id'],packet['assessmentId'])
 def test_stale_a3_tab_cannot_overwrite_another_tab(self):
  self.a3();other=self.ctx.new_page();other.goto(self.base+'a3/index.html');other.locator('#patient-select').select_option('SYN-002')
  self.send();self.select();self.receive();before=self.records();other.locator('#request').click()
  self.assertEqual(self.records(),before);expect(other.locator('#workflow-state')).to_have_text('초안 작성 중');expect(other.locator('#save-state')).to_have_text('저장 불가');other.close()
 def test_changed_packet_during_confirmation_is_not_imported(self):
  self.send();self.select();before=self.records();other=self.ctx.new_page();other.goto(self.base+'a2/legacy.html')
  self.page.remove_listener('dialog',self.accept_dialog)
  def change(dialog):
   other.evaluate("async key=>{const {createAssessmentHandoff}=await import('./../shared/handoff.js');const {CASES}=await import('./data.js');const v=structuredClone(CASES[1].values);v.function.gait='assistance';localStorage.setItem(key,JSON.stringify(createAssessmentHandoff('SYN-002',v,new Date(Date.now()+1000))))}",INBOX);dialog.accept()
  self.page.on('dialog',change);self.receive();self.assertEqual(self.records(),before);self.assertEqual(self.pending()['values']['function']['gait'],'assistance');other.close()
 def test_reimport_invalidates_approval_but_protects_publication(self):
  self.a3();self.approve();self.assertIsNotNone(self.records()['SYN-002']['draft']['approval']);self.send();self.select();self.receive();r=self.records()['SYN-002'];self.assertEqual(r['draft']['status'],'DRAFT');self.assertIsNone(r['draft']['approval'])
  self.verify_items();self.approve();self.page.locator('#publish').click();published=self.records()['SYN-002']['publications']
  self.send(value='assistance');self.select();self.receive();self.assertEqual(self.records()['SYN-002']['draft']['status'],'PUBLISHED');self.assertEqual(self.records()['SYN-002']['publications'],published);self.assertIsNotNone(self.pending())
  self.page.locator('#revise').click();self.receive();self.assertEqual(self.records()['SYN-002']['publications'],published);self.assertEqual(self.records()['SYN-002']['draft']['status'],'DRAFT')
 def test_inbox_updates_in_an_already_open_a3_tab(self):
  self.a3();expect(self.page.locator('#integrated-receive')).to_be_disabled()
  other=self.ctx.new_page();other.goto(self.base+'a2/legacy.html');other.locator('#patient-select').select_option('1');other.locator('#integrated-send').click();other.wait_for_url('**/a3/index.html?*')
  expect(self.page.locator('#integrated-receive')).to_be_enabled();self.assertIn('SYN-002',self.page.locator('#integrated-a3-status').inner_text());other.close()
 def test_other_workflow_storage_failures_restore_previous_state(self):
  for action,expected in [('request','초안 작성 중'),('return','의료진 검토 요청'),('revise','발행 완료'),('revoke','발행 완료')]:
   with self.subTest(action=action):
    self.page.goto(self.base+'a3/index.html');self.page.evaluate('localStorage.clear()');self.a3()
    if action=='return':self.page.locator('#request').click();self.page.locator('#actor').select_option('APPROVER')
    if action in ['revise','revoke']:self.approve();self.page.locator('#publish').click()
    before=self.records();self.deny_writes();self.page.locator('#'+action).click()
    self.assertEqual(self.records(),before);expect(self.page.locator('#workflow-state')).to_have_text(expected);expect(self.page.locator('#save-state')).to_have_text('저장 불가')
 def test_example_pdfs_are_served(self):
  self.a3();paths=self.page.evaluate("async()=>[...new Set((await import('./source-library.js')).SOURCE_LIBRARY.map(r=>r.exampleFile).filter(Boolean))]")
  self.assertEqual(len(paths),4)
  for path in paths:
   with self.subTest(path=path):
    response=self.ctx.request.get(self.base+'a3/'+path)
    self.assertEqual(response.status,200);self.assertEqual(response.body()[:5],b'%PDF-')
 def test_ui_responsive_keyboard_and_existing_flows(self):
  for width in [320,390,768,800,801,1024,1440]:
   with self.subTest(width=width):
    self.page.set_viewport_size({'width':width,'height':1000});self.page.goto(self.base+'a2/legacy.html')
    expect(self.page.locator('#total-complete')).to_have_text('18 / 18');self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    self.page.locator('#open-a1').click();self.page.keyboard.press('Escape');expect(self.page.locator('#modal')).not_to_be_visible()
    self.page.locator('#domains button').nth(1).click();self.page.locator('#field-education').select_option('');expect(self.page.locator('#detail-grade')).to_have_text('미평가')
    self.page.locator('#reset').click();expect(self.page.locator('#detail-grade')).to_contain_text('1 ·')
    if width>800:
     if self.page.locator('#toggle-rail').get_attribute('aria-expanded')=='false':self.page.locator('#toggle-rail').click()
     self.page.locator('#toggle-rail').focus();self.page.keyboard.press('Enter');expect(self.page.locator('#toggle-rail')).to_have_attribute('aria-expanded','false')
    self.a3();self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    self.page.locator('#gate-banner').focus();self.page.keyboard.press('Enter');expect(self.page.locator('#blockers-dialog')).to_be_visible();self.page.keyboard.press('Escape');expect(self.page.locator('#gate-banner')).to_be_focused()
    self.page.locator('[data-tab="documents"]').click();expect(self.page.locator('#file-attach')).to_be_visible()
    self.page.locator('[data-nav="learn"]').click();expect(self.page.locator('.learning-nav button')).to_have_count(5)
    self.page.locator('[data-learn-unit="practice"]').click();expect(self.page.locator('[data-study-start]')).to_have_count(4)
    self.page.locator('[data-study-start="SYN-003"]').click();self.page.locator('[data-nav="assessment"]').click();expect(self.page.locator('[data-a2-field]')).to_have_count(5)
    self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    self.page.locator('[data-nav="learn"]').click();self.page.locator('[data-study-leave]').click()
    self.page.locator('[data-nav="plan"]').click();self.select();self.page.locator('[data-item="today"] [data-action="select-source"]').click();expect(self.page.locator('#source-dialog')).to_be_visible();self.page.keyboard.press('Escape')
 def test_a2_storage_failure_keeps_input_and_does_not_navigate(self):
  self.page.goto(self.base+'a2/legacy.html');self.page.locator('#patient-select').select_option('1');self.page.locator('#field-gait').select_option('device')
  self.page.evaluate("key=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Quota','QuotaExceededError');return write.call(this,k,v)}}",INBOX)
  self.page.locator('#integrated-send').click();self.assertIn('/a2/legacy.html',self.page.url);expect(self.page.locator('#field-gait')).to_have_value('device');expect(self.page.locator('#integrated-a2-status')).to_contain_text('인계 보류');self.assertIsNone(self.pending())
 def test_cleanup_failure_can_retry_without_invalidating_new_approval(self):
  self.send();self.select()
  self.page.evaluate("key=>{const remove=Storage.prototype.removeItem;window.restoreRemovals=()=>{Storage.prototype.removeItem=remove;};Storage.prototype.removeItem=function(k){if(k===key)throw Error('cleanup denied');return remove.call(this,k)}}",INBOX)
  self.receive();self.assertIsNotNone(self.pending());self.verify_items();self.approve();before=self.records()
  self.page.evaluate('window.restoreRemovals()');self.receive();self.assertEqual(self.records(),before);self.assertIsNone(self.pending());expect(self.page.locator('#workflow-state')).to_have_text('승인 완료')
 def test_corrupt_a3_storage_is_preserved_and_receipt_is_blocked(self):
  self.page.goto(self.base+'a2/legacy.html');self.page.evaluate("key=>localStorage.setItem(key,'{broken-json')",KEY)
  self.send();self.select();self.receive();self.assertEqual(self.page.evaluate('key=>localStorage.getItem(key)',KEY),'{broken-json');self.assertIsNotNone(self.pending());self.assertIn('원본을 덮어쓰지 않습니다',self.page.locator('#toast').inner_text())
 def test_failed_approval_never_claims_success(self):
  self.a3();self.page.locator('#request').click();self.page.locator('#actor').select_option('APPROVER');self.deny_writes();self.page.locator('#approve').click()
  expect(self.page.locator('#workflow-state')).to_have_text('의료진 검토 요청');self.assertEqual(self.records()['SYN-002']['draft']['status'],'REVIEW_REQUESTED');self.assertNotIn('승인이 완료',self.page.locator('#toast').inner_text())
 def test_failed_publication_never_claims_success(self):
  self.a3();self.approve();self.deny_writes();self.page.locator('#publish').click();expect(self.page.locator('#workflow-state')).to_have_text('승인 완료');self.assertEqual(self.records()['SYN-002']['publications'],[]);self.assertNotIn('발행되었습니다',self.page.locator('#toast').inner_text())
if __name__=='__main__':unittest.main(verbosity=2)
