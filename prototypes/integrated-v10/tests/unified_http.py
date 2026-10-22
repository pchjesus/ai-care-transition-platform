"""Real Chromium HTTP regressions for the unified shell (no clinical data/services)."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
import functools,unittest,json
ROOT=Path(__file__).resolve().parents[3]
KEY='care-transition-integrated-v10-a3-synthetic-only';STUDY='care-transition-integrated-v10-study-synthetic-only'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
class Unified(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));Thread(target=cls.server.serve_forever,daemon=True).start();cls.base=f'http://127.0.0.1:{cls.server.server_port}/prototypes/integrated-v10/'
  cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop();cls.server.shutdown();cls.server.server_close()
 def setUp(self):
  self.ctx=self.browser.new_context(viewport={'width':1440,'height':1000});self.page=self.ctx.new_page();self.page.set_default_timeout(4000);self.errors=[];self.page.on('pageerror',lambda e:self.errors.append(str(e)));self.page.on('console',lambda m:self.errors.append(m.text) if m.type=='error' else None);self.page.on('dialog',lambda d:d.accept())
 def tearDown(self):self.ctx.close();self.assertEqual(self.errors,[])
 def open(self,screen='plan',patient='SYN-002',page=None):
  page=page or self.page;page.goto(self.base+f'a3/index.html?screen={screen}&patient={patient}');expect(page.locator('#patient-select')).to_have_value(patient)
 def records(self,key=KEY):return self.page.evaluate('key=>JSON.parse(localStorage.getItem(key))',key)
 def domain(self,id):self.page.locator(f'[data-a2-domain="{id}"]').click()
 def edit(self,value='device'):self.page.locator('#a2-field-gait').select_option(value)
 def commit(self):self.page.locator('#handoff-a2').click();expect(self.page.locator('#a3-screen')).to_be_visible()
 def verify_items(self):
  self.page.locator('[data-tab="plan"]').click();self.page.locator('#actor').select_option('APPROVER')
  for sec in ['today','medication','followup','warning','contact','support']:
   card=self.page.locator(f'[data-item="{sec}"]')
   if card.get_attribute('open') is None:card.locator(':scope > summary').click()
   card.locator('[data-edit="verified"]').check()
 def approve(self):self.page.locator('#request').click();self.page.locator('#actor').select_option('APPROVER');self.page.locator('#approve').click()
 def deny_writes(self):self.page.evaluate("key=>{const write=Storage.prototype.setItem;window.restoreWrites=()=>{Storage.prototype.setItem=write;};Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Quota','QuotaExceededError');return write.call(this,k,v)}}",KEY)
 def test_a1_a2_a3_approval_publication_revision_revoke(self):
  self.open('patients');self.page.locator('[data-patient-pick="SYN-002"][data-target-screen="assessment"]').click();self.edit();self.commit()
  self.assertEqual(self.records()['SYN-002']['assessment']['values']['function']['gait'],'device');self.verify_items();self.approve();self.page.locator('#publish').click()
  published=self.records()['SYN-002']['publications'];self.page.locator('[data-nav="assessment"]').click();expect(self.page.locator('#a2-field-gait')).to_be_disabled()
  self.page.locator('#a2-field-gait').evaluate("e=>{e.disabled=false;e.value='independent';e.dispatchEvent(new Event('change',{bubbles:true}))}")
  self.assertEqual(self.records()['SYN-002']['publications'],published);self.assertEqual(self.records()['SYN-002']['a2Values']['function']['gait'],'device')
  self.page.locator('[data-nav="plan"]').click();self.page.locator('#revise').click();self.page.locator('[data-nav="assessment"]').click();self.edit('independent');self.commit();self.assertEqual(self.records()['SYN-002']['publications'],published)
  self.page.locator('#revoke').click();self.assertEqual(self.records()['SYN-002']['publications'][0]['status'],'REVOKED')
 def test_approval_invalidated_on_edit_before_commit(self):
  self.open();self.approve();self.assertEqual(self.records()['SYN-002']['draft']['status'],'APPROVED');self.page.locator('[data-nav="assessment"]').click();self.edit()
  r=self.records()['SYN-002'];self.assertEqual(r['draft']['status'],'DRAFT');self.assertIsNone(r['draft']['approval']);self.assertTrue(r['a2Dirty']);self.assertEqual(r['assessment']['values']['function']['gait'],'independent')
  self.page.reload();expect(self.page.locator('#a2-field-gait')).to_have_value('device');self.commit();self.page.locator('#request').click();self.page.locator('#actor').select_option('APPROVER');expect(self.page.locator('#approve')).to_be_disabled()
 def test_patient_drafts_and_url_restore_are_isolated(self):
  self.open('assessment');otherBefore=self.records()['SYN-001'];self.edit();self.page.locator('#patient-select').select_option('SYN-001');self.page.reload();expect(self.page.locator('#patient-select')).to_have_value('SYN-001');self.assertEqual(self.records()['SYN-001'],otherBefore)
  self.page.locator('#patient-select').select_option('SYN-002');expect(self.page.locator('#a2-field-gait')).to_have_value('device');self.commit();self.assertEqual(self.records()['SYN-001']['assessment']['id'],'AS-SYN-001-001')
 def test_syn003_missing_and_conflicting_judgment_and_gate(self):
  self.open('assessment','SYN-003');self.edit('CONFLICT');self.page.locator('#a2-field-transfer').select_option('');expect(self.page.locator('.a2-judgment-panel')).to_contain_text('미확인:');expect(self.page.locator('.a2-judgment-panel')).to_contain_text('상충:');self.commit()
  r=self.records()['SYN-003'];self.assertTrue(any(d['status']=='CONFLICTING' for d in r['assessment']['domainResults']));self.assertTrue(any(d['status']=='UNKNOWN' for d in r['assessment']['domainResults']));self.page.locator('#request').click();self.page.locator('#actor').select_option('APPROVER');expect(self.page.locator('#approve')).to_be_disabled()
 def test_edit_and_commit_storage_failure_roll_back(self):
  self.open('assessment');before=self.records();self.deny_writes();self.edit();self.assertEqual(self.records(),before);expect(self.page.locator('#a2-field-gait')).to_have_value('independent');expect(self.page.locator('#save-state')).to_have_text('저장 불가')
  self.page.evaluate('restoreWrites()');self.edit();before=self.records();self.deny_writes();self.page.locator('#handoff-a2').click();expect(self.page.locator('#aux-screen')).to_be_visible();self.assertEqual(self.records(),before);expect(self.page.locator('#handoff-a2')).to_be_enabled()
  self.page.evaluate('restoreWrites()');self.commit();self.assertFalse(self.records()['SYN-002']['a2Dirty'])
 def test_other_tab_cannot_overwrite_newer_assessment(self):
  self.open('assessment');other=self.ctx.new_page();self.open('assessment',page=other);self.edit();latest=self.records();other.locator('#a2-field-gait').select_option('assistance');expect(other.locator('#save-state')).to_have_text('저장 불가');self.assertEqual(self.records(),latest);other.reload();expect(other.locator('#a2-field-gait')).to_have_value('device')
 def test_all_fields_and_domain_keyboard_navigation(self):
  self.open('assessment');count=0
  for d in ['medical','nursing','medication','function','social','continuity']:
   self.domain(d);count+=self.page.locator('[data-a2-field]').count();self.page.locator('[data-a2-field]').first.focus();self.page.keyboard.press('Tab');self.assertTrue(self.page.evaluate("document.activeElement.matches('[data-a2-field]')"));expect(self.page.locator('.a2-judgment-panel')).to_contain_text('계산 방식·참고 자료')
  self.assertEqual(count,30)
 def test_safe_navigation_home_alias_refresh_and_direct_url(self):
  self.page.goto(self.base+'a2/index.html?patient=1');expect(self.page.locator('#patient-select')).to_have_value('SYN-002');expect(self.page.locator('#journey-back')).to_be_disabled();expect(self.page.locator('#journey-next')).to_be_disabled()
  self.page.locator('[data-nav="plan"]').click();self.page.locator('[data-nav="patient-preview"]').click();self.page.locator('#journey-back').click();expect(self.page.locator('#a3-screen')).to_be_visible();self.page.locator('#journey-next').click();expect(self.page.locator('.full-patient-preview')).to_be_visible()
  self.page.reload();expect(self.page.locator('#journey-back')).to_be_disabled();self.page.locator('[data-nav="compare"]').click();expect(self.page.frame_locator('iframe').locator('#patient-select')).to_be_visible();expect(self.page.locator('#journey-back')).to_be_enabled();self.page.get_by_role('link',name='통합 홈',exact=True).click();expect(self.page.get_by_role('heading',name='병원용 통합 워크벤치')).to_be_visible()
 def test_learning_syn004_separate_draft_survives_reload(self):
  self.open('learn');normal=self.records();self.page.locator('[data-learn-unit="practice"]').click();self.page.locator('[data-study-start="SYN-004"]').click();self.page.locator('#revise').click();self.page.locator('[data-nav="assessment"]').click();self.edit('device');self.page.reload();expect(self.page.locator('#patient-detail')).to_contain_text('실습 사본');expect(self.page.locator('#a2-field-gait')).to_have_value('device');self.commit();self.assertEqual(self.records(),normal);self.assertEqual(self.records(STUDY)['SYN-004']['draft']['version'],'2.0')
  self.page.locator('[data-nav="learn"]').click();self.page.locator('[data-study-leave]').click();self.assertEqual(self.records(),normal)
 def test_pdf_source_dialog_and_print_regression(self):
  self.open();self.page.locator('[data-tab="documents"]').click();expect(self.page.locator('#work-pane')).to_contain_text('PDF');pdf=self.ctx.request.get(self.base+'a3/examples/SYN-002_sample_care_plan.pdf');self.assertTrue(pdf.ok);self.assertTrue(pdf.body().startswith(b'%PDF-'))
  self.page.locator('[data-tab="plan"]').click();self.page.locator('[data-item="today"] [data-action="select-source"]').click();expect(self.page.locator('#source-dialog')).to_be_visible();self.page.keyboard.press('Escape');expect(self.page.locator('#source-dialog')).not_to_be_visible()
 def test_uploaded_pdf_review_invalidation_and_real_print_document(self):
  self.open();self.page.locator('[data-tab="documents"]').click()
  pdf=ROOT/'prototypes/integrated-v10/a3/examples/SYN-002_sample_care_plan.pdf'
  self.page.locator('#file-attach').set_input_files(str(pdf));expect(self.page.locator('[data-doc]')).to_have_count(1)
  self.page.locator('[data-doc-edit]').select_option('PATIENT');self.page.locator('[data-action="review-doc"]').click()
  self.assertEqual(self.records()['SYN-002']['draft']['docs'][0]['status'],'REGISTERED');self.page.locator('#actor').select_option('PHYSICIAN');self.page.locator('[data-action="review-doc"]').click();self.assertEqual(self.records()['SYN-002']['draft']['docs'][0]['status'],'REVIEWED')
  self.page.locator('[data-nav="assessment"]').click();self.edit();self.commit();self.assertEqual(self.records()['SYN-002']['draft']['docs'][0]['status'],'REGISTERED')
  self.page.locator('[data-tab="documents"]').click();self.page.evaluate('window.print=()=>{window.printCalled=true}')
  self.page.locator('[data-action="print-draft"]').click();self.assertTrue(self.page.evaluate('window.printCalled'))
  import fitz
  document=fitz.open(stream=self.page.pdf(),filetype='pdf');text=''.join(p.get_text() for p in document);document.close();self.assertIn('SYN-002',text);self.assertIn('검토용',text)
  self.page.locator('#patient-select').select_option('SYN-001');expect(self.page.locator('#print-sheet')).to_be_empty()
 def test_phase1_approved_storage_backward_compatibility(self):
  self.open();fixture=(ROOT/'prototypes/integrated-v10/tests/fixtures/phase1-approved-syn002.json').read_text()
  self.page.evaluate('(v)=>localStorage.setItem("care-transition-integrated-v10-a3-synthetic-only",v)',fixture);self.page.reload();self.page.locator('#actor').select_option('APPROVER');expect(self.page.locator('#publish')).to_be_enabled()
  before=self.records()['SYN-002']['assessment'];self.page.locator('[data-nav="assessment"]').click();self.edit();self.assertEqual(self.records()['SYN-002']['assessment'],before);self.assertIsNone(self.records()['SYN-002']['draft']['approval'])
 def test_assessment_reset_and_all_four_learning_scenarios(self):
  self.open('assessment');self.edit();self.page.locator('#reset-evaluation').click();expect(self.page.locator('#a2-field-gait')).to_have_value('independent');self.assertTrue(self.records()['SYN-002']['a2Dirty']);self.commit()
  normal=self.records()
  for id in ['SYN-001','SYN-002','SYN-003','SYN-004']:
   self.page.locator('[data-nav="learn"]').click();self.page.locator('[data-learn-unit="practice"]').click();self.page.locator(f'[data-study-start="{id}"]').click();expect(self.page.locator('#patient-detail')).to_contain_text('실습 사본');self.assertEqual(self.records(STUDY)[id]['patientId'],id)
   self.page.locator('[data-nav="learn"]').click();self.page.locator('[data-study-leave]').click();self.assertEqual(self.records(),normal)
 def test_responsive_all_screens(self):
  out=Path('/tmp/unified-verification/screenshots');out.mkdir(parents=True,exist_ok=True)
  for width in [390,768,1024,1440]:
   self.page.set_viewport_size({'width':width,'height':1000})
   for screen in ['patients','assessment','plan','learn','patient-preview','compare']:
    self.open(screen);self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width, f'{screen} width {width}')
    if screen in ['assessment','plan']:
     panels=self.page.locator('.summary-row').evaluate('(e)=>[...e.children].map(c=>({x:c.getBoundingClientRect().x,y:c.getBoundingClientRect().y}))')
     if width>=1024:self.assertGreater(panels[1]['x'],panels[0]['x']);self.assertEqual(panels[1]['y'],panels[0]['y'])
     else:self.assertGreater(panels[1]['y'],panels[0]['y'])
     self.page.screenshot(path=str(out/f'after-{screen}-{width}.png'),full_page=True)
if __name__=='__main__':unittest.main(verbosity=2)
