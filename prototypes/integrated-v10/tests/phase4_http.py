"""Phase 4 real HTTP/Chromium UX, with unchanged synthetic publication contracts."""
from pathlib import Path
import unittest
from playwright.sync_api import expect
import comfort_http as comfort

class Phase4(unittest.TestCase):
 setUpClass=classmethod(comfort.Comfort.setUpClass.__func__)
 tearDownClass=classmethod(comfort.Comfort.tearDownClass.__func__)
 setUp=comfort.Comfort.setUp
 tearDown=comfort.Comfort.tearDown
 for method in ['ready','open_a3','open_b','publish_v1','verify_items','records','appointment','settings','personal','prefs','followup','close','settled','destination','inbox']:
  locals()[method]=getattr(comfort.Comfort,method)
 def tab(self,view):self.b.locator(f'[data-view={view}]:visible,[data-nav={view}]:visible').first.click()
 def standalone(self):
  self.b.goto(self.base.replace('prototypes/integrated-v10/','')+'patient/index.html');self.b.locator('#demo-code').fill('CARE2026');self.b.locator('#demo-code').press('Enter')
 def stores(self,page=None):return (page or self.b).evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})')
 def test_hospital_meter_matches_inputs_and_original_codes_are_expandable(self):
  self.open_a3();self.a3.locator('[data-nav=assessment]').click()
  for choice,grade in [('independent',0),('device',2),('assistance',3)]:
   self.a3.locator('#a2-field-gait').select_option(choice);meter=self.a3.locator('.a2-fact').filter(has_text='보행/이동').locator('.grade-meter');expect(meter.locator('.filled')).to_have_count(grade);expect(meter).to_have_attribute('aria-label',__import__('re').compile(str(grade)+'등급'))
  trace=self.a3.locator('.a2-fact').filter(has_text='보행/이동').locator('.trace-technical');expect(trace.locator('small')).not_to_be_visible();trace.locator('summary').click();expect(trace).to_contain_text('function.gait.assistance')
  self.a3.locator('#handoff-a2').click();self.a3.locator('#gate-banner').click();expect(self.a3.locator('#blockers-dialog')).to_contain_text('발행 차단 사항')
  expect(self.a3.locator('#blockers-dialog')).to_contain_text('우선 검토 사항');expect(self.a3.locator('#blockers-dialog')).to_contain_text('참고·권장 확인 사항')
  expected=self.a3.evaluate("async key=>{const {blockers}=await import('./workflow.js');const r=JSON.parse(localStorage.getItem(key))['SYN-002'];return blockers(r).map(b=>b.id)}",comfort.KEY)
  self.assertEqual(self.a3.locator('[data-blocker-id]').evaluate_all('es=>es.map(e=>e.dataset.blockerId)'),expected)
  self.a3.locator('.review-priorities [data-review-domain]').first.click();expect(self.a3.locator('#a2-field-gait')).to_be_focused()
 def test_hospital_context_alignment_patient_identity_and_navigation_save_guard(self):
  self.open_a3();out=Path('/tmp/phase4-screenshots');out.mkdir(exist_ok=True)
  for width in [390,768,1024,1440]:
   self.a3.set_viewport_size({'width':width,'height':950});left=self.a3.locator('.patient-strip').bounding_box();right=self.a3.locator('#gate-banner').bounding_box();self.assertFalse(self.a3.evaluate('document.documentElement.scrollWidth>innerWidth'))
   if width>=1024:self.assertAlmostEqual(left['y'],right['y'],delta=1);self.assertAlmostEqual(left['height'],right['height'],delta=1)
   else:self.assertGreaterEqual(right['y'],left['y']+left['height'])
   self.a3.screenshot(path=str(out/f'hospital-{width}.png'),full_page=True)
  self.a3.locator('#patient-select').select_option('SYN-003');expect(self.a3.locator('#patient-detail')).to_contain_text('SYN-003');self.a3.locator('#patient-select').select_option('SYN-002')
  field=self.a3.locator('[data-item=today] textarea');field.fill('화면 이동 전에 저장할 합성 안내');self.a3.locator('[data-nav=assessment]').click();self.assertIn('화면 이동 전에 저장할 합성 안내',self.records()['SYN-002']['draft']['items'][0]['text']);self.a3.locator('#journey-back').click();expect(self.a3.locator('[data-item=today] textarea')).to_have_value('화면 이동 전에 저장할 합성 안내')
  before=self.records();self.a3.evaluate("key=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error('quota');return write.call(this,k,v)}}",comfort.KEY);self.a3.locator('[data-item=today] textarea').fill('저장 실패 시 이동 차단');self.a3.locator('[data-nav=patients]').click();expect(self.a3.locator('#a3-screen')).to_be_visible();expect(self.a3.locator('#toast')).to_contain_text('이동을 멈췄습니다');self.assertEqual(self.records(),before)
 def test_both_homes_five_tabs_documents_and_four_widths_large_font(self):
  self.ready();out=Path('/tmp/phase4-screenshots');out.mkdir(exist_ok=True)
  for independent in [False,True]:
   if independent:self.standalone()
   for width in [390,768,1024,1440]:
    self.b.set_viewport_size({'width':width,'height':950});expect(self.b.locator('.page-head .comfort-quick')).to_have_count(0);expect(self.b.locator('.appointment [data-comfort=tour]')).to_be_visible();expect(self.b.locator('.insight-strip [data-comfort=documents]')).to_be_visible();self.assertFalse(self.b.evaluate('document.documentElement.scrollWidth>innerWidth'))
    hero=self.b.locator('.home-top-grid .hero-panel').bounding_box();ap=self.b.locator('.home-top-grid .appointment').bounding_box()
    if width>=1024:self.assertAlmostEqual(hero['y'],ap['y'],delta=1);self.assertAlmostEqual(hero['height'],ap['height'],delta=1)
    self.b.screenshot(path=str(out/f'{"independent" if independent else "connected"}-home-{width}.png'),full_page=True)
    self.tab('reminders');expect(self.b.locator('.reminders-page')).to_contain_text('알림 설정');expect(self.b.locator('.reminders-page')).to_contain_text('알림 내역');expect(self.b.locator('.reminders-page')).to_contain_text('예정 알림');self.tab('today')
   self.tab('reminders');size=self.b.locator('.reminders-page > p').first.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)');self.b.locator('[data-action=font]').first.click();self.b.set_viewport_size({'width':390,'height':844});self.assertGreater(self.b.locator('.reminders-page > p').first.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)'),size);self.assertFalse(self.b.evaluate('document.documentElement.scrollWidth>innerWidth'));self.b.screenshot(path=str(out/f'{"independent" if independent else "connected"}-notifications-large.png'),full_page=True);self.tab('today')
 def test_both_reminder_hubs_save_restore_inbox_and_navigation(self):
  self.ready(True)
  for independent in [False,True]:
   if independent:self.standalone()
   self.tab('reminders');self.settings();self.personal(label='새 알림 메뉴의 개인 준비');self.close();expect(self.b.locator('[data-hub-upcoming]')).to_contain_text('새 알림 메뉴');self.inbox();expect(self.b.locator('#comfort-dialog')).to_be_visible();self.close();self.b.reload()
   if self.b.locator('#demo-code').is_visible():self.b.locator('#demo-code').fill('CARE2026');self.b.locator('#demo-code').press('Enter')
   self.tab('reminders');self.settings();expect(self.b.locator('#comfort-dialog')).to_contain_text('새 알림 메뉴의 개인 준비');self.close();self.tab('today');self.b.get_by_role('button',name='이전',exact=True).click();expect(self.b.locator('.reminders-page')).to_be_visible();self.b.get_by_role('button',name='다음',exact=True).click();expect(self.b.locator('.home-top-grid')).to_be_visible()
 def test_browser_back_forward_commits_focused_hospital_input(self):
  self.a3.goto(self.base+'index.html');self.open_a3();field=self.a3.locator('[data-item=today] textarea');field.fill('브라우저 이전 이동 전 합성 안내');self.a3.go_back();self.assertTrue(self.a3.url.endswith('/integrated-v10/index.html'));self.a3.go_forward();expect(self.a3.locator('[data-item=today] textarea')).to_have_value('브라우저 이전 이동 전 합성 안내')
 def test_touch_target_and_keyboard_tour_actions_do_not_write_records(self):
  self.ready();ctx=self.browser.new_context(storage_state=self.ctx.storage_state(),viewport={'width':390,'height':844},has_touch=True,is_mobile=True);p=ctx.new_page();p.on('pageerror',lambda e:self.errors.append(str(e)))
  try:
   p.goto(self.b.url);p.locator('#demo-code').fill('CARE2026');p.locator('#demo-code').press('Enter');before=p.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})');p.locator('[data-comfort=tour]').tap();p.locator('.spot-ring [data-tour-control=try]').tap();expect(p.locator('.detail-wrap')).to_be_visible();p.locator('[data-tour-control=next]').tap();p.locator('.spot-tip [data-tour-control=try]').focus();p.keyboard.press('Enter');expect(p.locator('.schedule-layout')).to_be_visible();p.locator('[data-tour-control=next]').tap();p.locator('.spot-tip [data-tour-control=try]').tap();expect(p.locator('.reminder-hub-actions')).to_be_visible();p.keyboard.press('Escape');self.assertEqual(p.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage}})'),before)
  finally:ctx.close()
 def test_both_patient_three_steps_try_actions_are_read_only_and_restore(self):
  self.ready()
  for independent in [False,True]:
   if independent:self.standalone()
   for width in [390,1440]:
    self.b.set_viewport_size({'width':width,'height':950});before=self.stores();self.b.locator('[data-comfort=tour]').click()
    self.b.screenshot(path=f'/tmp/phase4-screenshots/{"independent" if independent else "connected"}-tour-{width}.png')
    for step,selector in [(1,'.detail-wrap'),(2,'.schedule-layout'),(3,'.reminder-hub-actions')]:
     expect(self.b.locator('#patient-brief-tour')).to_have_attribute('data-step',str(step));self.b.locator('.spot-tip [data-tour-control=try]').click();expect(self.b.locator(selector)).to_be_visible();expect(self.b.locator('#patient-brief-tour')).to_have_attribute('data-tried','true');self.assertEqual(self.stores(),before)
     if step<3:self.b.locator('[data-tour-control=next]').click()
    self.b.locator('[data-tour-control=previous]').click();expect(self.b.locator('#patient-brief-tour')).to_have_attribute('data-step','2');self.b.keyboard.press('Escape');expect(self.b.locator('.home-top-grid')).to_be_visible();expect(self.b.locator('[data-comfort=tour]')).to_be_focused();self.assertEqual(self.stores(),before)
 def test_failed_lock_callback_is_visible_before_delayed_promise_settles(self):
  self.ready();before=self.records();self.settings()
  self.b.evaluate('''()=>{const original=navigator.locks.request.bind(navigator.locks),write=Storage.prototype.setItem;
   navigator.locks.request=(...args)=>new Promise((resolve,reject)=>original(...args).then(value=>{window.finishReminder=()=>resolve(value)},error=>{window.finishReminder=()=>reject(error)}));
   Storage.prototype.setItem=function(k,v){if(k.startsWith('carebridge-reminders-v1:'))throw Error('quota');return write.call(this,k,v)};}''')
  f=self.b.locator('[data-comfort-form=personal]');f.locator('[name=label]').fill('저장 실패 검사');f.locator('[name=date]').fill('2030-01-02');f.locator('[name=time]').fill('08:00');f.locator('button').click();self.b.wait_for_function('typeof window.finishReminder === "function"');expect(self.b.locator('#comfort-notice')).to_contain_text('저장하지 못했어요');self.assertIsNone(self.prefs());self.assertEqual(self.records(),before);self.b.evaluate('finishReminder()');self.settled()

if __name__=='__main__':unittest.main(verbosity=2)
