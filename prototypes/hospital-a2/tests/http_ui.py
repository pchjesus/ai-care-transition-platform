from pathlib import Path
import subprocess, time, urllib.request, json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
server=subprocess.Popen(['python3','-m','http.server','8765','--bind','127.0.0.1'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
    for _ in range(30):
        try:
            urllib.request.urlopen('http://127.0.0.1:8765/index.html', timeout=1).close(); break
        except Exception: time.sleep(.2)
    else: raise RuntimeError('HTTP server unavailable')
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        for width,height in [(1440,900),(1024,900),(768,900),(390,844),(320,760)]:
            errors=[]
            page=browser.new_page(viewport={'width':width,'height':height})
            page.on('pageerror',lambda e: errors.append(str(e)))
            page.goto('http://127.0.0.1:8765/index.html',wait_until='load')
            page.locator('#patient-name').wait_for()
            assert page.locator('#detail-domain-name').inner_text()=='기능'
            assert page.locator('body').evaluate('(e)=>getComputedStyle(e).backgroundColor') == 'rgb(255, 255, 255)'
            assert page.locator('.rail').evaluate('(e)=>getComputedStyle(e).backgroundColor') == 'rgb(33, 75, 59)'
            assert page.locator('.evidence-disclosure').evaluate('(e)=>e.open') is False
            page.locator('.evidence-disclosure summary').click()
            assert page.locator('.evidence-disclosure').evaluate('(e)=>e.open') is True
            assert page.locator('#sources a').count()>0
            page.get_by_role('button',name='판단 방법 보기').click()
            assert page.locator('dialog[open]').count()==1
            page.locator('#modal-close').click()
            page.get_by_role('button',name='A1 환자 목록').click()
            page.locator('[data-pick="2"]').click()
            assert '최도현' in page.locator('#patient-name').inner_text()
            page.get_by_role('button',name='03 · 약료').click()
            assert page.locator('#detail-grade').inner_text()=='상충 · 보류'
            page.locator('#field-medUnderstanding').select_option('confirmed')
            assert page.locator('#detail-grade').inner_text().startswith('3 ·')
            page.get_by_role('button',name='A3 검토 초안 보기').click()
            assert page.locator('dialog[open]').count()==1
            assert '의료진 검토 대기' in page.locator('#modal-content').inner_text()
            page.locator('#modal-close').click()
            page.locator('#reset').click()
            assert page.locator('#patient-name').inner_text().startswith('최도현')
            page.locator('#patient-select').select_option('0')
            assert page.locator('#patient-name').inner_text().startswith('이정희')
            assert not errors,errors
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(root/f'screen_{width}.png'),full_page=True)
            if width==1440:
                height_value=page.evaluate('document.documentElement.scrollHeight')
                info={'viewport':width,'document_height':height_value,'sidebar_bg':'#214b3b','background':'#ffffff'}
            else:info={'viewport':width,'document_height':page.evaluate('document.documentElement.scrollHeight')}
            print(json.dumps(info,ensure_ascii=False))
            page.close()
        # screenshots of default non-expanded landing
        for width,height in [(1440,900),(390,844)]:
            page=browser.new_page(viewport={'width':width,'height':height})
            page.goto('http://127.0.0.1:8765/index.html',wait_until='load')
            page.locator('#patient-name').wait_for()
            page.screenshot(path=str(root/('screen_pc.png' if width==1440 else 'screen_mobile.png')),full_page=True)
            page.close()
        browser.close()
    print('PASS real HTTP module-based index.html, 5 viewports, interactions, console check')
finally:
    server.terminate()
    try:server.wait(timeout=5)
    except subprocess.TimeoutExpired:server.kill()
