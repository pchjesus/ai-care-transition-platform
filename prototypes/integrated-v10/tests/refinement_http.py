"""Real Chromium checks for compact review UI and in-page reminders."""
from pathlib import Path
import unittest
from playwright.sync_api import expect, TimeoutError
import comfort_http as c
class Refinement(unittest.TestCase):
 setUpClass=classmethod(c.Comfort.setUpClass.__func__)
 tearDownClass=classmethod(c.Comfort.tearDownClass.__func__)
 tearDown=c.Comfort.tearDown
 def setUp(self):
  self.ctx=self.browser.new_context(viewport={'width':1440,'height':950});self.a3=self.ctx.new_page();self.b=self.ctx.new_page();self.errors=[];self.acceptDialogs=True
  for p in [self.a3,self.b]:
   p.set_default_timeout(6000);p.on('pageerror',lambda e:self.errors.append(str(e)));p.on('console',lambda m:self.errors.append(m.text) if m.type=='error' else None);p.on('dialog',lambda d:d.accept() if self.acceptDialogs else d.dismiss())
 for method in ['ready','open_a3','open_b','publish_v1','verify_items','records','appointment','settings','personal','prefs','followup','close','settled','destination','inbox']:
  locals()[method]=getattr(c.Comfort,method)
 def tab(self,view):self.b.locator(f'[data-view={view}]:visible,[data-nav={view}]:visible').first.click()
 def standalone(self):
  self.b.goto(self.base.replace('prototypes/integrated-v10/','')+'patient/index.html');self.b.locator('#demo-code').fill('CARE2026');self.b.locator('#demo-code').press('Enter')
 def test_compact_evidence_and_patient_chooser_four_widths(self):
  self.open_a3();self.a3.locator('[data-nav=assessment]').click();out=Path('/tmp/refinement-shots');out.mkdir(exist_ok=True)
  for value,grade in [('independent',0),('device',2),('assistance',3)]:
   self.a3.locator('#a2-field-gait').select_option(value);row=self.a3.locator('.a2-fact').filter(has_text='보행/이동');expect(row.locator('.filled')).to_have_count(grade);expect(row.locator('.grade-cell')).to_have_count(4);self.assertEqual(row.locator('.grade-cell').all_text_contents(),['']*4);expect(row).to_contain_text(str(grade)+'등급')
  self.a3.locator('#a2-field-gait').select_option('CONFLICT');expect(self.a3.locator('.a2-big-grade')).to_contain_text('상충');expect(self.a3.locator('.a2-result-line .filled')).to_have_count(0);self.a3.locator('#a2-field-gait').select_option('device');detail=self.a3.locator('.a2-judgment-panel>.trace-technical');expect(detail).to_have_count(1);expect(detail.locator('code').first).not_to_be_visible();detail.locator('summary').click();expect(detail).to_contain_text('function.gait.device');detail.locator('summary').click()
  for width in [390,768,1024,1440]:
   self.a3.set_viewport_size({'width':width,'height':950});self.assertFalse(self.a3.evaluate('document.documentElement.scrollWidth>innerWidth'));r=self.a3.locator('.patient-strip').bounding_box();select=self.a3.locator('#patient-select').bounding_box();self.assertGreater(select['x'],r['x']+r['width']*.35)
   if width==1440:self.assertGreaterEqual(select['width'],220);self.assertLessEqual(select['width'],280)
   self.a3.screenshot(path=str(out/f'hospital-{width}.png'),full_page=True)
  self.a3.locator('#patient-select').select_option('SYN-003');expect(self.a3.locator('#patient-detail')).to_contain_text('ENC-SYN-003')
 def test_both_patient_navigation_and_inline_layout_four_widths(self):
  self.ready();out=Path('/tmp/refinement-shots');out.mkdir(exist_ok=True)
  for independent in [False,True]:
   if independent:self.standalone()
   for width in [390,768,1024,1440]:
    self.b.set_viewport_size({'width':width,'height':950});expect(self.b.locator('.topline button')).to_have_count(0);expect(self.b.locator('.topline .top-profile')).to_have_count(0);expect(self.b.locator('.patient-page-tools [data-action=font]')).to_be_visible();expect(self.b.locator('.patient-page-tools [data-comfort=tour]')).to_be_visible();expect(self.b.locator('.appointment [data-comfort=tour]')).to_have_count(0);expect(self.b.locator('.patient-sidebar-journey [aria-label=이전] svg')).to_have_count(1);self.assertFalse(self.b.evaluate('document.documentElement.scrollWidth>innerWidth'))
    self.b.screenshot(path=str(out/f'{"independent" if independent else "connected"}-home-{width}.png'),full_page=True);self.tab('reminders');expect(self.b.locator('dialog#comfort-dialog')).to_have_count(0);expect(self.b.locator('.comfort-inline')).to_be_visible();expect(self.b.locator('#reminder-personal')).to_be_visible();expect(self.b.locator('#reminder-inbox')).to_be_visible();self.assertFalse(self.b.evaluate('document.documentElement.scrollWidth>innerWidth'));self.tab('today')
   self.tab('schedule');self.b.get_by_role('button',name='이전',exact=True).click();expect(self.b.locator('.home-top-grid')).to_be_visible();self.b.get_by_role('button',name='다음',exact=True).click();expect(self.b.locator('.schedule-layout')).to_be_visible();self.tab('today');self.b.locator('.patient-page-tools [data-action=font]').click();self.b.set_viewport_size({'width':390,'height':844});self.tab('reminders');self.b.screenshot(path=str(out/f'{"independent" if independent else "connected"}-reminders-large.png'),full_page=True)
 def test_inline_drafts_other_form_save_font_and_cancelled_navigation(self):
  self.ready(True);self.settings();other=self.b.locator('[data-comfort-form=followup] [name=sameDay]');other.check();self.personal(label='페이지 안에서 저장');self.assertTrue(other.is_checked());field=self.b.locator('[data-comfort-form=personal] [name=label]');field.fill('보존할 미저장 입력');before=self.prefs();self.b.locator('.patient-page-tools [data-action=font]').click();expect(field).to_have_value('보존할 미저장 입력');self.acceptDialogs=False;self.tab('today');expect(field).to_have_value('보존할 미저장 입력');self.assertEqual(self.prefs(),before);self.acceptDialogs=True;self.tab('today');self.settings();expect(field).to_have_value('');expect(self.b.locator('#comfort-dialog')).to_contain_text('페이지 안에서 저장')
 def test_stale_inline_writer_reload_and_readonly_refresh(self):
  self.ready();self.settings();field=self.b.locator('[data-comfort-form=personal] [name=label]');field.fill('이 탭의 미저장 입력');other=self.ctx.new_page();other.on('dialog',lambda d:d.accept());other.goto(self.b.url);other.locator('#demo-code').fill('CARE2026');other.locator('#demo-code').press('Enter');self.settings(other);self.personal(other,label='다른 탭에서 저장한 알림');expect(field).to_have_value('이 탭의 미저장 입력');expect(self.b.locator('[data-upcoming]')).to_contain_text('다른 탭에서 저장한 알림');self.personal(label='덮어쓰면 안 되는 입력');expect(self.b.locator('#comfort-notice')).to_contain_text('저장하지 못했어요');self.acceptDialogs=False;self.b.locator('[data-comfort=reload]').click();expect(field).to_have_value('덮어쓰면 안 되는 입력');self.acceptDialogs=True;self.b.locator('[data-comfort=reload]').click();expect(field).to_have_value('');expect(self.b.locator('#reminder-personal')).to_contain_text('다른 탭에서 저장한 알림');self.personal(label='다시 읽은 뒤 새 알림');self.assertEqual(len(next(iter(self.prefs()['plans'].values()))['personal']),2)
 def test_profile_and_browser_back_keep_unsaved_inputs_when_cancelled(self):
  self.ready()
  for independent in [False,True]:
   if independent:self.standalone()
   self.tab('profile');self.b.locator('[data-action=edit-start]').click();field=self.b.locator('#address');field.fill('보호할 합성 주소');self.acceptDialogs=False;self.tab('today');expect(field).to_have_value('보호할 합성 주소');self.b.locator('.patient-page-tools [data-action=font]').click();expect(field).to_have_value('보호할 합성 주소');url=self.b.url;
   try:self.b.go_back(timeout=1000)
   except TimeoutError:pass # Chromium waits for a load that a dismissed beforeunload intentionally cancels.
   self.assertEqual(self.b.url,url);expect(field).to_have_value('보호할 합성 주소');self.acceptDialogs=True;self.tab('today')
 def test_patient_tour_two_primary_actions_readonly_and_restore(self):
  self.ready()
  for independent in [False,True]:
   if independent:self.standalone()
   for width in [390,1440]:
    self.b.set_viewport_size({'width':width,'height':950});before=self.b.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})');self.b.locator('[data-comfort=tour]').click()
    for step in [1,2,3]:
     expect(self.b.locator('#patient-brief-tour')).to_have_attribute('data-step',str(step));self.assertLessEqual(self.b.locator('.spot-controls>button:visible').count(),2);expect(self.b.locator('[data-tour-control=locate]')).not_to_be_visible();self.b.locator('.spot-tip [data-tour-control=try]').click();expect(self.b.locator('#patient-brief-tour')).to_have_attribute('data-tried','true')
     if step<3:self.b.locator('[data-tour-control=next]').click()
    self.b.keyboard.press('Escape');self.assertEqual(self.b.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})'),before);expect(self.b.locator('[data-comfort=tour]')).to_be_focused()
 def test_final_three_choices_bell_spacing_and_keyboard_both_surfaces(self):
  self.ready(True)
  for independent in [False,True]:
   if independent:self.standalone()
   self.b.locator('.appointment [data-comfort=settings]').click();expect(self.b.locator('#reminder-followup')).to_have_attribute('open','');expect(self.b.locator('#reminder-personal')).not_to_have_attribute('open','');self.tab('today')
   for width in [390,768,1024,1440]:
    self.b.set_viewport_size({'width':width,'height':950})
    for menu in ['.side','.bottom-nav']:
     expect(self.b.locator(menu+' [data-view=reminders] svg rect,'+menu+' [data-nav=reminders] svg rect')).to_have_count(0)
     expect(self.b.locator(menu+' [data-view=schedule] svg rect,'+menu+' [data-nav=schedule] svg rect')).to_have_count(1)
     expect(self.b.locator(menu+' [data-view=reminders] svg path,'+menu+' [data-nav=reminders] svg path')).to_have_count(2)
    gap=self.b.locator('.patient-page-tools').evaluate('e=>e.getBoundingClientRect().top-e.closest(".app-body").querySelector(".topline").getBoundingClientRect().bottom')
    self.assertLessEqual(gap,75 if width<1024 else 16);self.assertFalse(self.b.evaluate('document.documentElement.scrollWidth>innerWidth'))
    self.tab('reminders');expect(self.b.locator('#reminder-personal')).not_to_have_attribute('open','');expect(self.b.locator('#reminder-followup')).not_to_have_attribute('open','');expect(self.b.locator('#reminder-inbox')).to_have_attribute('open','');expect(self.b.locator('#reminder-options')).not_to_have_attribute('open','')
    for summary in ['#reminder-personal>summary','#reminder-followup>summary','#reminder-inbox>summary']:
     self.assertGreaterEqual(self.b.locator(summary).bounding_box()['height'],44)
    self.tab('today')
   self.tab('reminders');before=self.prefs();summary=self.b.locator('#reminder-personal>summary');summary.focus();self.b.keyboard.press('Enter');field=self.b.locator('[data-comfort-form=personal] [name=label]');field.fill('접어서 보존할 입력');summary.click();summary.focus();self.b.keyboard.press('Space');expect(field).to_have_value('접어서 보존할 입력');self.b.locator('[data-action=font]').click();expect(field).to_have_value('접어서 보존할 입력');self.acceptDialogs=False;self.tab('today');expect(field).to_have_value('접어서 보존할 입력');self.assertEqual(self.prefs(),before)
   f=self.b.locator('[data-comfort-form=personal]');f.locator('[name=date]').fill('2020-01-02');f.locator('[name=time]').fill('08:00');f.locator('button[type=submit]').click();expect(self.b.locator('#comfort-notice')).to_contain_text('유효한 미래');expect(field).to_have_value('접어서 보존할 입력');expect(field).to_be_visible();self.personal(label='최종 화면 저장');expect(self.b.locator('#comfort-notice')).to_contain_text('저장했어요');expect(field).to_be_visible();self.acceptDialogs=True;self.tab('today');self.b.reload()
   if self.b.locator('#demo-code').is_visible():self.b.locator('#demo-code').fill('CARE2026');self.b.locator('#demo-code').press('Enter')
   self.tab('reminders');self.b.locator('#reminder-personal>summary').click();expect(self.b.locator('#reminder-personal')).to_contain_text('최종 화면 저장');self.tab('today')
 def test_final_mobile_disclosures_touch_both_surfaces(self):
  self.ready(True);ctx=self.browser.new_context(storage_state=self.ctx.storage_state(),viewport={'width':390,'height':844},has_touch=True,is_mobile=True);page=ctx.new_page();page.on('pageerror',lambda e:self.errors.append(str(e)))
  try:
   for path in [self.b.url,self.base.replace('prototypes/integrated-v10/','')+'patient/index.html']:
    page.goto(path);page.locator('#demo-code').fill('CARE2026');page.locator('#demo-code').press('Enter');page.locator('.bottom-nav [data-view=reminders],.bottom-nav [data-nav=reminders]').tap();page.locator('#reminder-personal>summary').tap();self.personal(page,label='터치로 저장한 준비');expect(page.locator('#comfort-notice')).to_contain_text('저장했어요');page.locator('#reminder-followup>summary').tap();self.followup(page);page.locator('[data-action=font]').tap();expect(page.locator('#reminder-followup')).to_have_attribute('open','');self.assertFalse(page.evaluate('document.documentElement.scrollWidth>innerWidth'))
  finally:ctx.close()
if __name__=='__main__':unittest.main(verbosity=2)
