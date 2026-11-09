from playwright.sync_api import sync_playwright
from pathlib import Path
import json
ROOT='http://127.0.0.1:8765/prototypes'
H=ROOT+'/hospital-ux2-v05/index.html'
P=ROOT+'/integrated-v10/patient/index.html?patient=SYN-004&encounter=ENC-SYN-004-DEMO'
OUT=Path('/tmp/ux2-v05-qa');OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def no_overflow(page,w,label):
 dims=page.evaluate('({vw:innerWidth,sw:document.documentElement.scrollWidth})')
 assert dims['sw']<=w+1, (label,dims)
def visible_name(page):
 assert '나의 퇴원안내' in page.locator('body').inner_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for label,w,h in [('desktop',1440,900),('tablet',768,1024),('mobile',390,844),('small',320,760)]:
  ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1)
  page=ctx.new_page()
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(H,wait_until='networkidle')
  assert page.locator('h1').inner_text()=='퇴원관리 업무'
  assert page.locator('.nav-item .nav-compact-label').count()==8
  if w>700:
   btn=page.locator('.brand-collapse-toggle')
   btn.click()
   assert page.locator('#sidebar.rail-compact').count()==1
   assert page.locator('.nav-item[data-view="home"] .nav-compact-label').inner_text()=='홈'
   side_width=page.locator('#sidebar').bounding_box()['width']
   assert side_width<100,side_width
   assert page.locator('.brand-collapse-toggle').get_attribute('aria-expanded')=='false'
   page.screenshot(path=str(OUT/f'{label}-hospital-collapsed.png'))
   btn.click()
   assert page.locator('#sidebar.rail-compact').count()==0
  else:
   page.locator('[data-action="menu-open"]').click()
   assert page.locator('#sidebar.open').count()==1
   assert page.locator('.mobile-menu').get_attribute('aria-expanded')=='true'
   page.screenshot(path=str(OUT/f'{label}-hospital-menu.png'))
   page.keyboard.press('Escape')
   assert page.locator('#sidebar.open').count()==0
   assert page.locator('.mobile-menu').get_attribute('aria-expanded')=='false'
  if w<=700: page.locator('[data-action="menu-open"]').click()
  page.locator('.nav-item[data-view="patients"]').click()
  page.locator('#patient-search').fill('윤미경')
  assert page.locator('tbody tr').count()==1
  search=page.locator('#patient-search')
  search.evaluate('e=>{e.dataset.caretStable="yes";e.setSelectionRange(1,1)}')
  page.keyboard.type('X')
  assert search.input_value()=='윤X미경'
  assert search.evaluate('e=>e.selectionStart')==2
  assert search.evaluate('e=>e.dataset.caretStable')=='yes'
  page.keyboard.press('Backspace')
  page.locator('[data-open="SYN-002"]').first.click()
  if w<=700:page.locator('[data-action="menu-open"]').click()
  page.locator('.patient-route[data-view="assessment"]').click()
  page.locator('.assessment-main').wait_for()
  assert page.locator('.domain-btn').count()==6
  assert page.locator('[data-assessment-key]').count()==5
  btn=page.locator('[data-ux5="live"]')
  assert btn.is_enabled(), 'Source module integration should work on same-origin HTTP'
  page.screenshot(path=str(OUT/f'{label}-hospital-assessment.png'))
  no_overflow(page,w,'hospital')
  assert not errors,(label,errors)
  checks.append({'scenario':'hospital-navigation','viewport':label,'result':'PASS','jsErrors':len(errors)})
  page.close()
  q=ctx.new_page(); qerrors=[];q.on('pageerror',lambda e:qerrors.append(str(e)))
  q.goto(P,wait_until='networkidle')
  visible_name(q)
  q.locator('#demo-code').fill('CARE2026')
  q.locator('#demo-login button[type="submit"]').click()
  q.locator('.app-layout').wait_for(timeout=5000)
  visible_name(q)
  assert q.locator('.bottom-nav button').count()>=5
  if w>760:
   toggle=q.locator('.patient-sidebar-toggle')
   toggle.click()
   assert q.locator('.patient-nav-collapsed').count()==1
   assert q.locator('.side-nav[aria-current="page"]').get_attribute('aria-label')=='오늘'
   q.screenshot(path=str(OUT/f'{label}-patient-collapsed.png'),full_page=False)
   toggle.click()
   assert q.locator('.patient-nav-collapsed').count()==0
  else:
   menu=q.locator('.patient-menu-launch')
   assert menu.is_visible()
   menu.click()
   assert q.locator('.patient-menu-open').count()==1
   assert q.locator('.patient-sidebar-toggle').is_hidden()
   q.screenshot(path=str(OUT/f'{label}-patient-menu.png'),full_page=False)
   q.keyboard.press('Escape')
   assert q.locator('.patient-menu-open').count()==0
  assert q.locator('button[data-view="schedule"]').count()>=1
  if w>760: q.locator('.side-nav[data-view="schedule"]').click()
  else: q.locator('.bottom-nav [data-view="schedule"]').click()
  assert q.locator('.patient-content-enter').count()>=1
  no_overflow(q,w,'patient')
  assert not qerrors,(label,qerrors)
  checks.append({'scenario':'patient-navigation','viewport':label,'result':'PASS','jsErrors':len(qerrors)})
  q.close();ctx.close()
 # A2 actual original transitions + history preservation with synthetic records only
 ctx=b.new_context(viewport={'width':1440,'height':900})
 page=ctx.new_page()
 page.goto(H,wait_until='networkidle')
 page.locator('.nav-item[data-view="patients"]').click()
 page.locator('[data-open="SYN-002"]').click()
 page.locator('.patient-route[data-view="assessment"]').click()
 page.locator('.assessment-main').wait_for()
 page.locator('[data-ux5="live"]').click()
 assert page.locator('select[data-assessment-key="gait"]').count()==0 # medical tab is selected
 page.locator('[data-domain="function"]').click()
 assert page.locator('select[data-assessment-key="gait"]').is_enabled()
 page.locator('select[data-assessment-key="gait"]').select_option('device')
 record=page.evaluate('''() => {
   const raw=JSON.parse(localStorage.getItem('care-transition-integrated-v10-a3-synthetic-only'));
   return raw['SYN-002'];
 }''')
 assert record['a2Dirty'] is True
 assert record['a2Values']['function']['gait']=='device'
 assert record['assessment']['values']['function']['gait']=='independent'
 assert record['draft']['approval'] is None
 assert record['draft']['status']=='DRAFT'
 assert record['audit'][0]['event']=='EVALUATION_EDITED'
 count_before=len(record['publications'])
 page.once('dialog',lambda d:d.accept())
 page.locator('[data-ux5="handoff"]').click()
 record2=page.evaluate('''() => JSON.parse(localStorage.getItem('care-transition-integrated-v10-a3-synthetic-only'))['SYN-002']''')
 assert record2['a2Dirty'] is False
 assert record2['assessment']['values']['function']['gait']=='device'
 assert record2['audit'][0]['event']=='ASSESSMENT_IMPORTED'
 assert all(i['verified'] is False for i in record2['draft']['items'])
 assert len(record2['publications'])==count_before
 checks.append({'scenario':'original-A2-edit-save-handoff','result':'PASS','publicationSnapshotsPreserved':True})
 page.close();ctx.close()
 b.close()
(OUT/'QA_RESULT.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(checks,ensure_ascii=False,indent=2))
