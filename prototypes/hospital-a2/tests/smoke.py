from playwright.sync_api import sync_playwright
from pathlib import Path
import json
OUT=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width,height in [(1440,1000),(1024,900),(390,844),(320,760)]:
        page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
        failures=[]
        page.on('pageerror',lambda error: failures.append(str(error)))
        page.set_content((OUT/'preview.html').read_text(encoding='utf-8'),wait_until='load')
        assert page.locator('#detail-domain-name').inner_text()=='기능'
        assert page.locator('#patient-name').inner_text().startswith('이정희')
        assert page.locator('#total-complete').inner_text()=='18 / 18'
        page.get_by_role('button',name='A3 검토 초안 보기').click()
        assert page.locator('dialog[open]').count()==1
        assert '검토 대기' in page.locator('#modal-content').inner_text()
        page.locator('#modal-close').click()
        page.get_by_role('button',name='02 · 간호').click()
        assert page.locator('#detail-domain-name').inner_text()=='간호'
        page.locator('#field-education').select_option('')
        assert page.locator('#detail-grade').inner_text()=='미평가'
        page.locator('#reset').click()
        assert page.locator('#detail-grade').inner_text().startswith('1 ·')
        page.locator('#patient-select').select_option('2')
        assert page.locator('#patient-name').inner_text().startswith('최도현')
        page.get_by_role('button',name='03 · 약료').click()
        assert page.locator('#side-grade').inner_text()=='판단 보류'
        page.locator('#field-medUnderstanding').select_option('confirmed')
        assert page.locator('#detail-grade').inner_text().startswith('3 ·')
        page.screenshot(path=str(OUT/f'a2_{width}.png'),full_page=True)
        assert not failures,failures
        overflow=page.evaluate('document.documentElement.scrollWidth>window.innerWidth')
        assert not overflow,f'{width} horizontal overflow'
        print(json.dumps({'width':width,'status':'ok','overflow':overflow,'errors':failures},ensure_ascii=False))
        page.close()
    # default page snapshots
    for width,height in [(1440,1000),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
        page.set_content((OUT/'preview.html').read_text(encoding='utf-8'),wait_until='load')
        page.screenshot(path=str(OUT/('screen_pc.png' if width==1440 else 'screen_mobile.png')),full_page=True)
        page.close()
    # Standalone markup injected because network/file navigation is restricted
    page=browser.new_page(viewport={'width':390,'height':844})
    page.set_content((OUT/'preview.html').read_text(encoding='utf-8'),wait_until='load')
    assert page.locator('#patient-name').inner_text().startswith('이정희')
    page.get_by_role('button',name='04 · 기능').click()
    assert page.locator('#detail-domain-name').inner_text()=='기능'
    print('single-file preview verified')
    browser.close()
