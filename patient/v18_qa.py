from pathlib import Path
from playwright.sync_api import sync_playwright
import json

BASE='http://127.0.0.1:8765/'
OLD=BASE+'patient/index.html'
NEW=BASE+'patient/v18.html'
COMPARE=BASE+'patient/compare-v18.html'
HOME_PREVIEW=BASE+'prototypes/integrated-v10/v18-home-preview.html'
OUT=Path('/tmp/carebridge-v18-qa')
OUT.mkdir(parents=True, exist_ok=True)
passed=[]
def ok(cond, title):
    assert cond,title
    if title not in passed: passed.append(title)
def login(page):
    page.goto(page.url if page.url.startswith('http') else NEW,wait_until='networkidle')
    form=page.locator('#demo-login')
    if form.count():
        page.locator('#demo-code').fill('CARE2026')
        form.locator('button[type=submit]').click()
    page.locator('.app-layout').wait_for(timeout=8000)
    assert page.locator('.v18-home').count() if 'v18.html' in page.url else page.locator('.v12-home').count()
def horizontal(page,width):
    actual=page.evaluate('document.documentElement.scrollWidth')
    assert actual<=width+1,('horizontal-overflow',width,actual,page.url)
def check_focus(page,selector):
    page.wait_for_function('''s=>document.activeElement===document.querySelector(s)''',arg=selector,timeout=4000)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for label,width,height in [('large',1440,900),('tablet',768,1024),('mobile',390,844),('small',320,720)]:
        ctx=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1)
        old=ctx.new_page();old_errors=[];old.on('pageerror',lambda e:old_errors.append(str(e)))
        old.goto(OLD,wait_until='networkidle')
        login(old)
        ok(old.locator('h1').first.is_visible(),'original-Lee-fixture-access')
        old.screenshot(path=str(OUT/f'original-{label}.png'),full_page=False)
        new=ctx.new_page();errs=[];new.on('pageerror',lambda e:errs.append(str(e)))
        new.goto(NEW,wait_until='networkidle')
        login(new)
        assert '이정희님' in new.locator('.v18-home h1').inner_text()
        assert new.locator('.v18-task').count()==3
        names=[b.locator('.v18-task-content strong').inner_text() for b in new.locator('.v18-task').all()]
        assert [x in ' '.join(names) for x in ['보행 보조기 안내 확인','퇴원 약 안내 확인','다음 진료 준비하기']]==[True]*3, names
        assert new.locator('.v18-visit-date').count()==1
        assert '2026년 10월 27일' in new.locator('.v18-visit-date').inner_text()
        assert '실제 예약' in new.locator('.v18-note').inner_text()
        horizontal(new,width);horizontal(old,width)
        if width<=760:
            assert new.locator('.bottom-nav button').count()==5
            assert new.locator('.bottom-nav [data-nav=profile]').is_visible()
            assert new.locator('.v18-settings-trigger').is_visible()
            task_y=new.locator('.v18-today-card').evaluate('(e)=>e.getBoundingClientRect().top')
            visit_y=new.locator('.v18-visit-card').evaluate('(e)=>e.getBoundingClientRect().top')
            assert task_y<visit_y,('tasks come first',task_y,visit_y)
        new.screenshot(path=str(OUT/f'new-{label}.png'),full_page=False)
        assert not errs,(label,errs)
        ok(True,'responsive-original-new-'+label)
        if width==390:
            reader=new.locator('.v18-settings-trigger')
            reader.click()
            d=new.locator('.v18-setting-dialog')
            assert d.is_visible()
            new.screenshot(path=str(OUT/'new-reading-sheet-mobile.png'))
            d.locator('[data-v18-font=large]').click()
            assert new.locator('body.large-font').count()==1
            d.locator('#v18-less-motion').check(force=True)
            assert new.locator('body.v18-less-motion').count()==1
            assert new.evaluate("localStorage.getItem('carebridge-demo-b-v18-less-motion')")== '1'
            d.locator('[data-v18=close]').last.click()
            assert not d.is_visible()
            check_focus(new,'.v18-settings-trigger')
            new.reload(wait_until='networkidle')
            new.locator('.v18-home').wait_for()
            assert new.locator('body.large-font.v18-less-motion').count()==1
            ok(True,'reader-segments-reduced-motion-persist-focus')
            new.locator('.v18-guide-trigger').click()
            assert new.locator('#v18-guide-panel').is_visible()
            new.screenshot(path=str(OUT/'new-guide-mobile.png'))
            d.locator('[data-v18=close]').last.click()
            new.locator('.v18-task[data-detail=mobility]').click()
            assert new.locator('.detail-wrap').is_visible()
            new.screenshot(path=str(OUT/'new-detail-mobile.png'))
            new.locator('.detail-wrap [data-action=quiz-start]').click()
            assert new.locator('.quiz-container').is_visible()
            new.locator('[data-choice="1"]').click()
            new.locator('[data-action=quiz-check]').click()
            assert new.locator('.feedback').is_visible()
            ok(True,'original-optional-quiz-preserved')
            new.locator('.bottom-nav [data-nav=today]').click()
            new.locator('.v18-mini-card [data-nav=documents]').click()
            assert new.locator('.v12-documents').is_visible()
            new.locator('[data-action=pdf-open-from-list]').click()
            assert new.locator('.pdf-panel').count()==1
            new.screenshot(path=str(OUT/'new-pdf-mobile.png'),full_page=False)
            new.locator('[data-action=pdf-close]').click()
            assert new.locator('.pdf-panel').count()==0
            ok(True,'original-demo-PDF-open-close-preserved')
            new.locator('.bottom-nav [data-nav=schedule]').click()
            assert new.locator('.v12-schedule').is_visible()
            new.screenshot(path=str(OUT/'new-schedule-mobile.png'))
            new.locator('.bottom-nav [data-nav=help]').click()
            assert new.locator('.v12-help').is_visible()
            new.screenshot(path=str(OUT/'new-help-mobile.png'))
            new.locator('.bottom-nav [data-nav=reminders]').click()
            assert new.locator('.reminders-page').count()==1
            new.screenshot(path=str(OUT/'new-reminders-mobile.png'))
            new.locator('.bottom-nav [data-nav=profile]').click()
            assert new.locator('.profile-layout').is_visible()
            assert '이정희' in new.locator('.profile-layout').inner_text()
            new.screenshot(path=str(OUT/'new-profile-mobile.png'))
            ok(True,'five-tabs-schedule-help-reminders-profile')
        if width==320:
            new.locator('.v18-settings-trigger').click()
            new.locator('[data-v18-font=large]').click()
            new.locator('[data-v18=close]').last.click()
            horizontal(new,width)
            new.screenshot(path=str(OUT/'new-small-large-font.png'))
            ok(True,'small-screen-large-text-no-overflow')
        ctx.close()
    ctx=browser.new_context(viewport={'width':1280,'height':950},device_scale_factor=1)
    compare=ctx.new_page()
    resp=compare.goto(COMPARE,wait_until='networkidle')
    assert resp.status==200
    assert compare.locator('iframe').count()==2
    assert compare.locator('.panel').count()==2
    compare.screenshot(path=str(OUT/'comparison-desktop.png'))
    compare.set_viewport_size({'width':390,'height':844})
    compare.locator('[data-design=original]').click()
    assert compare.locator('[data-panel=original]').is_visible() and not compare.locator('[data-panel=candidate]').is_visible()
    compare.locator('[data-design=candidate]').click()
    assert compare.locator('[data-panel=candidate]').is_visible() and not compare.locator('[data-panel=original]').is_visible()
    compare.screenshot(path=str(OUT/'comparison-mobile.png'))
    ok(True,'compare-original-v18-side-by-side-and-mobile-toggle')
    home=ctx.new_page()
    home.goto(HOME_PREVIEW,wait_until='networkidle')
    assert home.locator('.path-card').count()==2
    assert home.locator('.path-card.patient').get_attribute('href')=='../../patient/v18.html'
    assert '독립 예시' in home.locator('.path-card.patient').inner_text()
    home.screenshot(path=str(OUT/'integrated-home-v18-preview.png'))
    ok(True,'coordinated-home-patient-color-and-demo-label')
    ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps({'scenarios':passed,'passed':len(passed)},ensure_ascii=False,indent=2),encoding='utf8')
print('V18 PASSED '+str(len(passed))+' scenarios')
