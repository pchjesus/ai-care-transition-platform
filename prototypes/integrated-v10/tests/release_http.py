"""Chromium smoke of the exported Pages tree at the real project URL prefix.

CAREBRIDGE_SITE_PARENT must contain ai-care-transition-platform/ (no Git writes).
"""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect
import functools, os, unittest
import stabilization_http as stabilization
import comfort_http as comfort
import patient_http as patient

class Release(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  root=Path(os.environ['CAREBRIDGE_SITE_PARENT']).resolve()
  assert (root/'ai-care-transition-platform/index.html').is_file()
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(patient.Quiet,directory=str(root)))
  Thread(target=cls.server.serve_forever,daemon=True).start()
  cls.home=f'http://127.0.0.1:{cls.server.server_port}/ai-care-transition-platform/'
  cls.base=cls.home+'prototypes/integrated-v10/'
  cls.p=sync_playwright().start()
  cls.browser=cls.p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 tearDownClass=classmethod(patient.PatientIntegration.tearDownClass.__func__)
 def setUp(self):
  patient.PatientIntegration.setUp(self)
  self.ctx.on('response',lambda r:self.errors.append(f'HTTP {r.status}: {r.url}') if r.status>=400 else None)
  self.ctx.on('requestfailed',lambda r:self.errors.append(f'{r.failure}: {r.url}'))
 tearDown=patient.PatientIntegration.tearDown
 for method in ['ready','open_a3','open_b','publish_v1','verify_items','records','appointment','settings','personal','prefs','followup','close','settled','destination','inbox']:
  locals()[method]=getattr(comfort.Comfort,method)
 test_combined_published_pdf_reminders_tours_revocation=stabilization.Stabilization.test_combined_a1_a2_a3_b_approved_schedule_pdf_reminders_and_tours
 def test_landing_independent_b_login_settings_and_patient_tour(self):
  self.b.goto(self.home)
  expect(self.b.locator('#connected-patient-message')).to_contain_text('발행본이 없어요')
  self.b.get_by_role('link',name='기존 환자용 예시 바로 체험 →',exact=True).click()
  expect(self.b).to_have_url(self.home+'patient/index.html')
  self.b.locator('#demo-code').fill('CARE2026');self.b.locator('#demo-code').press('Enter')
  self.settings();zone=self.b.locator('[data-comfort-form=zone] select');expect(zone.locator('option:checked')).to_contain_text('세계 표준시' if zone.input_value()=='UTC' else '시간');self.close()
  before=self.b.evaluate('JSON.stringify({...localStorage})');self.b.locator('[data-comfort=tour]').click()
  for step in [1,2,3]:
   expect(self.b.locator('#patient-brief-tour')).to_have_attribute('data-step',str(step))
   if step<3:self.b.locator('[data-tour-control=next]').click()
  self.b.locator('#tour-finish').click();self.assertEqual(self.b.evaluate('JSON.stringify({...localStorage})'),before)
 def test_legacy_a2_a3_and_comparison_paths(self):
  for path,screen in [('a2/index.html?patient=SYN-003','assessment'),('a3/index.html?patient=SYN-002&screen=learn','learn')]:
   self.a3.goto(self.home+path)
   expect(self.a3).to_have_url(__import__('re').compile('/prototypes/integrated-v10/a3/index.html.*'))
   expect(self.a3.locator('#patient-select')).to_have_value('SYN-003' if screen=='assessment' else 'SYN-002')
   if screen=='assessment':expect(self.a3.locator('#a2-field-gait')).to_be_visible()
   else:expect(self.a3.locator('[data-learn-guided-tour]')).to_be_visible()
  self.b.goto(self.home+'compare.html')
  expect(self.b.frame_locator('#clinician').locator('#patient-select')).to_be_visible()
  expect(self.b.frame_locator('iframe[title="환자용 v1.3 독립 시연"]').locator('#demo-code')).to_be_visible()
  self.b.locator('#clinician-a2').click();expect(self.b.frame_locator('#clinician').locator('#a2-field-gait')).to_be_visible()
  self.b.locator('#clinician-a3').click();expect(self.b.frame_locator('#clinician').locator('#request')).to_be_visible()

if __name__=='__main__':unittest.main(verbosity=2)
