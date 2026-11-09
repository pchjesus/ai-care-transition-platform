from playwright.sync_api import sync_playwright
from pathlib import Path
import json
import os
import time

BASE='http://127.0.0.1:8765/prototypes/hospital-ux2-v01/'
OUT=Path('/tmp/carebridge-ux2-qa');OUT.mkdir(parents=True,exist_ok=True)
results=[]
browser_path='/usr/bin/chromium' if os.path.exists('/usr/bin/chromium') else ('/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=browser_path,args=['--no-sandbox','--disable-dev-shm-usage']) if browser_path else p.chromium.launch(headless=True)
    for label,width,height in [('desktop',1440,900),('tablet',768,1024),('mobile',390,844),('small',320,760)]:
        ctx=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1)
        page=ctx.new_page()
        errors=[]
        page.on('pageerror',lambda err: errors.append(str(err)))
        page.goto(BASE,wait_until='networkidle')
        assert page.locator('h1').inner_text()=='퇴원관리 업무'
        assert page.locator('.patient-route[aria-disabled="true"]').count()==4
        page.screenshot(path=str(OUT/f'01-home-{label}.png'),full_page=(label!='desktop'))
        if width<=700:
            page.locator('[data-action="menu-open"]').click()
        page.locator('[data-view="patients"]').first.click()
        page.locator('#patient-search').fill('윤미경')
        assert page.locator('tbody tr').count()==1
        page.screenshot(path=str(OUT/f'02-patients-{label}.png'),full_page=False)
        page.locator('[data-open="SYN-002"]').first.click()
        assert page.locator('.patient-banner').inner_text().find('윤미경')>=0
        assert page.locator('.patient-route[aria-disabled="true"]').count()==0
        if width<=700:
            page.locator('[data-action="menu-open"]').click()
        page.locator('[data-view="assessment"]').last.click()
        page.locator('.domain-btn').first.wait_for(timeout=5000)
        assert page.locator('.domain-btn').count()==6
        assert page.locator('select[data-assessment-key]').count()==5
        page.locator('#field-followup').select_option(label='확정됨')
        page.locator('[data-domain="function"]').click()
        assert page.locator('select[data-assessment-key]').count()==5
        page.screenshot(path=str(OUT/f'03-assessment-{label}.png'),full_page=False)
        if width<=700:
            page.locator('[data-action="menu-open"]').click()
        page.locator('.patient-route[data-view="plan"]').click()
        page.locator('#plan-textarea').fill('화면 구조 점검용 안내 문구')
        assert page.locator('#preview-text').inner_text()=='화면 구조 점검용 안내 문구'
        page.screenshot(path=str(OUT/f'04-plan-{label}.png'),full_page=False)
        if width<=700:
            page.locator('[data-action="menu-open"]').click()
        page.locator('.patient-route[data-view="review"]').click()
        page.locator('[data-action="review-info"]').first.click()
        assert page.locator('#info-dialog').is_visible()
        page.locator('#info-dialog .btn-primary').click()
        page.screenshot(path=str(OUT/f'05-review-{label}.png'),full_page=False)
        dims=page.evaluate('({vw:innerWidth,scrollWidth:document.documentElement.scrollWidth})')
        assert dims['scrollWidth']<=dims['vw']+1, f'horizontal overflow {dims}'
        assert not errors, f'{label} JS errors: {errors}'
        results.append({'viewport':label,'size':f'{width}x{height}','result':'PASS','horizontal_overflow':False,'js_errors':len(errors)})
        page.close();ctx.close()
    browser.close()
(OUT/'QA_RESULT.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=False,indent=2))
