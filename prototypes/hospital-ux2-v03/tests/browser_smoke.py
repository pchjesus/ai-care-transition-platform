from playwright.sync_api import sync_playwright
from pathlib import Path
import json
HTML='http://127.0.0.1:8765/prototypes/hospital-ux2-v03/index.html'
OUT=Path('/tmp/carebridge-ux2-v03-qa');OUT.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for label,w,h in [('desktop',1440,900),('tablet',768,1024),('mobile',390,844),('small',320,760)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1)
  page=ctx.new_page()
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(HTML,wait_until='load')
  assert page.locator('h1').inner_text()=='퇴원관리 업무'
  page.wait_for_timeout(250)
  page.screenshot(path=str(OUT/f'{label}-home.png'),full_page=False)
  if w<=700:page.locator('[data-action="menu-open"]').click()
  page.locator('[data-view="patients"]').first.click()
  search=page.locator('#patient-search')
  search.fill('윤미경')
  assert page.locator('tbody tr').count()==1
  search.evaluate('(el)=>{el.dataset.unchanged="true";el.setSelectionRange(1,1)}')
  page.keyboard.type('X')
  assert search.input_value()=='윤X미경',search.input_value()
  assert search.evaluate('el=>el.selectionStart')==2
  assert search.evaluate('el=>el.dataset.unchanged')=='true'
  page.keyboard.press('Backspace')
  assert search.input_value()=='윤미경'
  page.locator('[data-action="density-toggle"]').click()
  assert page.locator('.density-compact').count()==1
  page.wait_for_timeout(250)
  page.screenshot(path=str(OUT/f'{label}-patients.png'),full_page=False)
  page.locator('[data-open="SYN-002"]').first.click()
  if w<=700:page.locator('[data-action="menu-open"]').click()
  page.locator('.patient-route[data-view="assessment"]').click()
  assert page.locator('.domain-btn').count()==6
  assert page.locator('[data-assessment-key]').count()==5
  assert page.locator('[data-assessment-key]').first.is_disabled()
  assert '원본 A2 평가 결과' in page.locator('#assessment-result').inner_text()
  page.wait_for_timeout(250)
  page.screenshot(path=str(OUT/f'{label}-assessment.png'),full_page=False)
  page.locator('[data-action="panel-toggle"]').click()
  assert page.locator('#assessment-result').is_hidden()
  page.locator('[data-action="panel-toggle"]').click()
  assert page.locator('#assessment-result').is_visible()
  page.locator('[data-action="practice-toggle"]').click()
  assert page.locator('[data-assessment-key]').first.is_enabled()
  page.locator('[data-domain="function"]').click()
  page.locator('[data-assessment-key="gait"]').select_option('assistance')
  assert page.locator('[data-assessment-key="gait"]').input_value()=='assistance'
  assert '임시 평가 결과' in page.locator('#assessment-result').inner_text()
  page.locator('[data-action="practice-toggle"]').click()
  assert page.locator('[data-assessment-key="gait"]').input_value()=='independent'
  if w<=700:page.locator('[data-action="menu-open"]').click()
  page.locator('.patient-route[data-view="plan"]').click()
  page.locator('[data-action="plan-focus"]').click()
  assert page.locator('.plan-grid.focus-mode').count()==1
  page.locator('[data-action="plan-split"]').click()
  page.locator('#plan-textarea').fill('사용자 체험 안내 텍스트')
  assert page.locator('#preview-text').inner_text()=='사용자 체험 안내 텍스트'
  page.wait_for_timeout(250)
  page.screenshot(path=str(OUT/f'{label}-plan.png'),full_page=False)
  if w<=700:page.locator('[data-action="menu-open"]').click()
  page.locator('.patient-route[data-view="review"]').click()
  assert '검토 요청' in page.locator('main').inner_text()
  page.wait_for_timeout(250)
  page.screenshot(path=str(OUT/f'{label}-review.png'),full_page=False)
  dims=page.evaluate('({vw:innerWidth,scrollWidth:document.documentElement.scrollWidth})')
  assert dims['scrollWidth']<=dims['vw']+1,dims
  assert not errors,errors
  results.append({'size':f'{w}x{h}','result':'PASS','errors':len(errors),'overflow':dims['scrollWidth']-dims['vw']})
  page.close();ctx.close()
 browser.close()
(OUT/'QA_RESULT.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(results,ensure_ascii=False,indent=2))
