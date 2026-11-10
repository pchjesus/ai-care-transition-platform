from pathlib import Path
from playwright.sync_api import sync_playwright
import json

BASE='http://127.0.0.1:8765/'
OLD=BASE+'patient/index.html'
NEW=BASE+'patient/v19-3.html'
COMPARE=BASE+'patient/compare-v19-3.html'
HOME_PREVIEW=BASE+'prototypes/integrated-v10/v19-3-home-preview.html'
OUT=Path('/tmp/carebridge-v19-3-qa')
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
    assert page.locator('.v18-home').count() if 'v19-3.html' in page.url else page.locator('.v12-home').count()
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
        assert new.locator('.v18-home .v18-hero').evaluate("(el)=>getComputedStyle(el).animationName")=='none', 'Initial page and intra-page content are static'
        assert new.locator('.v18-task').first.evaluate("(el)=>getComputedStyle(el).animationName")=='none'
        names=[b.locator('.v18-task-content strong').inner_text() for b in new.locator('.v18-task').all()]
        assert [x in ' '.join(names) for x in ['보행 보조기 안내 확인','퇴원 약 안내 확인','다음 진료 준비하기']]==[True]*3, names
        assert new.locator('.v18-visit-date').count()==1
        assert '2026년 10월 27일' in new.locator('.v18-visit-date').inner_text()
        assert '실제 예약' in new.locator('.v18-note').inner_text()
        horizontal(new,width);horizontal(old,width)
        if width<=760:
            assert new.locator('.bottom-nav button').count()==5
            assert new.locator('.bottom-nav [data-nav=profile]').is_visible()
            assert new.locator('.topline .v192-quick-font').is_visible()
            assert new.locator('.topline .v192-quick-font').get_attribute('aria-pressed')=='false'
            assert not new.locator('.v18-settings-trigger').count()
            assert not new.locator('.patient-mobile-toolbar').is_visible(), 'No duplicate history bar above first action'
            task_y=new.locator('.v18-today-card').evaluate('(e)=>e.getBoundingClientRect().top')
            visit_y=new.locator('.v18-visit-card').evaluate('(e)=>e.getBoundingClientRect().top')
            assert task_y<visit_y,('tasks come first',task_y,visit_y)
        new.screenshot(path=str(OUT/f'new-{label}.png'),full_page=False)
        if width==1440:
            new.locator('.side .side-nav[data-nav=help]').click()
            assert new.locator('.main').evaluate("(e)=>e.classList.contains('v191-top-level-motion')")
            assert new.locator('.service-page').evaluate("(e)=>getComputedStyle(e).animationName")=='v191-tab-arrive'
            new.locator('.service-search-launch [data-action=toggle-help-search]').click()
            assert new.locator('.service-page').evaluate("(e)=>getComputedStyle(e).animationName")=='none'
            new.locator('.side .side-nav[data-nav=today]').click()
            assert new.locator('.v18-home').is_visible()
            # Screenshot failure reproduction: step 2 of the existing spotlight tour must show the nav label.
            new.locator('.patient-header-help').click()
            tour=new.locator('#patient-brief-tour')
            tour.wait_for(timeout=5000)
            tour.locator('[data-tour-control=next]').click()
            assert '2 / 3' in tour.locator('#tour-count').inner_text()
            ring=tour.locator('.spot-ring .spot-try-target')
            assert ring.is_visible()
            computed=ring.evaluate("(el)=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopWidth})")
            assert computed['background']=='rgba(0, 0, 0, 0)',('Spotlight interactive target must remain transparent',computed)
            assert computed['border']=='0px'
            assert new.locator('.side .side-nav[data-nav=schedule]').is_visible()
            new.screenshot(path=str(OUT/'v19-3-spotlight-step2-desktop.png'))
            tour.locator('[data-tour-control=close]').click()
            assert not tour.count()
            ok(True,'tour-highlight-contains-readable-underlying-nav')
            # Hover must not resurrect the old light-green background or border.
            first=new.locator('.v18-task').first
            first.hover()
            new.wait_for_timeout(230)
            colors=first.evaluate("(el)=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopColor})")
            assert colors['background']=='rgb(234, 244, 251)',colors
            assert colors['border']=='rgb(142, 182, 205)',colors
            new.screenshot(path=str(OUT/'v19-3-blue-card-hover-desktop.png'))
            ok(True,'blue-hover-no-legacy-green')
            ok(True,'desktop-sidebar-navigation-only-entry-motion')
        assert not errs,(label,errs)
        ok(True,'responsive-original-new-'+label)
        if width==390:
            # One-tap header large text, placed between tour CTA and synthetic-patient badge.
            quick=new.locator('.topline .v192-quick-font')
            header=new.locator('.topline .meta')
            positions=header.evaluate("""e=>({guide:[...e.children].indexOf(e.querySelector('.patient-header-help')),
                quick:[...e.children].indexOf(e.querySelector('.v192-quick-font')),
                badge:[...e.children].indexOf(e.querySelector('.tiny-pill'))})""")
            assert positions['guide']<positions['quick']<positions['badge'], positions
            quick.click()
            assert new.locator('body.large-font').count()==1
            assert new.locator('.topline .v192-quick-font').get_attribute('aria-pressed')=='true'
            new.locator('.bottom-nav [data-nav=profile]').click()
            settings=new.locator('.v192-display-settings')
            assert settings.is_visible()
            assert settings.locator('[data-v192-size=large]').get_attribute('aria-pressed')=='true'
            assert settings.locator('.v192-size-segments').get_attribute('data-large')=='true'
            assert '다음에 앱을 열 때도 유지' in settings.inner_text()
            new.screenshot(path=str(OUT/'v19-3-warm-profile-segmented-mobile.png'))
            settings.locator('[data-v192-size=normal]').click()
            assert new.locator('body.large-font').count()==0
            assert new.locator('.v192-display-settings .v192-size-segments').get_attribute('data-large')=='false'
            assert new.locator('.profile-layout').evaluate("(el)=>getComputedStyle(el).animationName")=='none'
            new.locator('.v192-display-settings [data-v192-size=large]').click()
            assert new.locator('body.large-font').count()==1
            new.locator('#v192-reduce-motion').check(force=True)
            assert new.locator('body.v18-less-motion').count()==1
            assert new.evaluate("localStorage.getItem('carebridge-demo-b-v18-less-motion')")=='1'
            new.reload(wait_until='networkidle')
            # Original standalone demo intentionally requires re-entering its synthetic access code.
            assert new.locator('#demo-login').count()==1
            new.locator('#demo-code').fill('CARE2026')
            new.locator('#demo-login button[type=submit]').click()
            new.locator('.v18-home').wait_for()
            assert new.locator('body.large-font.v18-less-motion').count()==1
            new.locator('.bottom-nav [data-nav=schedule]').click()
            assert new.locator('.schedule-layout').evaluate("(el)=>getComputedStyle(el).animationName")=='none'
            new.locator('.bottom-nav [data-nav=today]').click()
            assert new.locator('.v18-home').evaluate("(el)=>getComputedStyle(el).animationName")=='none'
            ok(True,'user-reduced-motion-disables-even-top-level-transition')
            new.locator('.bottom-nav [data-nav=profile]').click()
            new.locator('#v192-reduce-motion').uncheck(force=True)
            assert not new.locator('body.v18-less-motion').count()
            new.locator('.bottom-nav [data-nav=today]').click()
            new.locator('.v18-guide-trigger').click()
            guide=new.locator('.v192-guide-dialog')
            assert guide.is_visible()
            assert '앱 사용법' in guide.inner_text()
            new.screenshot(path=str(OUT/'v19-3-usage-guide-mobile.png'))
            guide.locator('[data-v192=close-guide]').last.click()
            assert not guide.is_visible()
            check_focus(new,'.v18-guide-trigger')
            ok(True,'large-font-segmented-persists-and-guide-focus')
            new.locator('.v18-task[data-detail=mobility]').click()
            assert new.locator('.detail-wrap').is_visible()
            panel=new.locator('.detail-wrap .document-panel')
            assert panel.is_visible()
            assert panel.locator('.v193-document-actions').count()==1
            cta=panel.locator('.document-cta')
            caption=panel.locator('.source-link-placeholder')
            rect=cta.bounding_box()
            below=caption.bounding_box()
            assert rect and below and below['y']>=rect['y']+rect['height']+6, 'PDF note must be on its own row, not beside CTA'
            bg=panel.locator('.document-label').evaluate('(e)=>getComputedStyle(e).color')
            assert bg=='rgb(40, 107, 140)',('Old green document-label remains',bg)
            assert panel.evaluate('(e)=>getComputedStyle(e).borderTopColor')=='rgb(215, 228, 235)'
            cta.click()
            assert new.locator('.pdf-panel').is_visible()
            preview=new.locator('.pdf-panel .pdf-image')
            assert preview.get_attribute('src').endswith('lee-walker-guide-v193.png')
            assert preview.is_visible()
            assert preview.evaluate('(e)=>e.complete && e.naturalWidth>100')
            pdf_url=new.locator('.pdf-panel .pdf-actions a[download]').get_attribute('href')
            assert pdf_url.endswith('/assets/lee-walker-guide-v193.pdf')
            res=new.request.get(pdf_url)
            assert res.status==200 and res.body().startswith(b'%PDF'), 'Redesigned PDF must be downloadable, not an old mock blob'
            new.screenshot(path=str(OUT/'v19-3-document-panel-and-pdf-mobile.png'))
            new.locator('[data-action=pdf-close]').click()
            ok(True,'document-green-removal-cta-caption-layout-new-searchable-PDF')
            assert new.locator('.patient-mobile-toolbar').is_visible(), 'Original history controls remain available on detail pages'
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
            # Transport entry cards and the underlying travel/map safety constraints.
            travel=new.locator('.travel-entry-section')
            assert travel.is_visible()
            assert travel.locator('.travel-entry').count()>=2
            travel.locator('[data-comfort=map]').first.click()
            map_dialog=new.locator('.comfort-dialog:not(.comfort-inline)')
            assert map_dialog.is_visible()
            assert map_dialog.locator('.v19-map-empty').count()==1, 'Unverified demo hospital must not offer a map route'
            assert map_dialog.locator('[data-map-link]').count()==0
            assert '주소' in map_dialog.locator('.v19-map-empty').inner_text()
            new.screenshot(path=str(OUT/'v19-map-unconfirmed-mobile.png'))
            map_dialog.locator('[data-comfort=close]').click()
            assert not new.locator('.comfort-dialog:not(.comfort-inline)').count()
            travel.locator('[data-comfort=taxi]').click()
            travel_dialog=new.locator('.comfort-dialog:not(.comfort-inline)')
            assert travel_dialog.is_visible()
            assert travel_dialog.evaluate("(e)=>getComputedStyle(e).animationName")=='none', 'Opening a dialog must not bounce the entire content'
            assert travel_dialog.locator('.travel-builder').evaluate("(e)=>getComputedStyle(e).animationName")=='none'
            assert travel_dialog.locator('.travel-choice').count()==2
            assert travel_dialog.locator('.travel-choice[aria-pressed=true]').get_attribute('data-choice')=='regular'
            travel_dialog.locator('[data-choice=assisted]').click()
            assert travel_dialog.locator('[data-choice=assisted]').get_attribute('aria-pressed')=='true'
            assert travel_dialog.locator('.v19-progress-item.current').count()==1
            travel_dialog.locator('[data-taxi-field=pickup]').fill('가상 아파트 정문')
            assert travel_dialog.locator('[data-taxi-field=demoDestination]').count()==1
            travel_dialog.locator('[data-taxi-field=demoDestination]').fill('가상병원 정문')
            new.screenshot(path=str(OUT/'v19-taxi-step1-mobile.png'))
            travel_dialog.locator('[data-comfort=taxi-next]').click()
            assert travel_dialog.locator('.v19-progress-item.current').inner_text().startswith('2')
            travel_dialog.locator('[data-taxi-group=equipment][value=walker]').check()
            travel_dialog.locator('[data-taxi-group=arrivalHelp][value=meet]').check()
            travel_dialog.locator('[data-taxi-field=companion]').select_option('with')
            new.screenshot(path=str(OUT/'v19-taxi-step2-mobile.png'))
            travel_dialog.locator('[data-comfort=taxi-next]').click()
            assert travel_dialog.locator('.v19-progress-item.current').inner_text().startswith('3')
            dialog_rect=travel_dialog.bounding_box()
            title_rect=travel_dialog.locator('#comfort-title').bounding_box()
            assert dialog_rect and title_rect and title_rect['y'] >= dialog_rect['y']-1 and title_rect['y'] <= dialog_rect['y']+110,('title-must-remain-at-top',dialog_rect,title_rect)
            preview=travel_dialog.locator('[data-taxi-preview]')
            assert preview.is_visible()
            assert '가상 아파트 정문' in preview.inner_text()
            assert '워커' in preview.inner_text()
            assert '택시 예약은 아직 하지 않았어요' in preview.inner_text()
            assert travel_dialog.locator('.travel-future-action').is_disabled()
            assert travel_dialog.locator('a[data-map-link]').count()==0
            new.screenshot(path=str(OUT/'v19-taxi-summary-mobile.png'))
            travel_dialog.locator('[data-comfort=close]').click()
            assert not any('taxi' in k.lower() for k in new.evaluate('Object.keys(localStorage)'))
            ok(True,'map-safe-no-address-and-3step-taxi-transport-redesign')
            new.locator('.bottom-nav [data-nav=help]').click()
            assert new.locator('.main').evaluate("(el)=>el.classList.contains('v191-top-level-motion')"), 'Top-level navigation must mark motion boundary'
            assert new.locator('.service-page').evaluate("(el)=>getComputedStyle(el).animationName")=='v191-tab-arrive'
            new.locator('[data-action=toggle-help-search]').click()
            assert new.locator('.help-search-body').is_visible()
            assert not new.locator('.main').evaluate("(el)=>el.classList.contains('v191-top-level-motion')"), 'In-page help toggle must not mark a route transition'
            assert new.locator('.service-page').evaluate("(el)=>getComputedStyle(el).animationName")=='none', 'Do not bounce on in-page toggle'
            assert not new.locator('.service-card').first.evaluate("(el)=>getComputedStyle(el).animationName") or new.locator('.service-card').first.evaluate("(el)=>getComputedStyle(el).animationName")=='none'
            new.locator('.search-launch').hover()
            new.wait_for_timeout(300)
            actual_hover=new.locator('.search-launch').evaluate("(el)=>getComputedStyle(el).backgroundColor")
            assert actual_hover=='rgb(233, 243, 252)',('Expanded help search hover must remain soft blue',actual_hover)
            ok(True,'sidebar-only-motion-no-in-page-toggle-animation-and-blue-help-hover')
            assert new.locator('.v12-help').is_visible()
            new.screenshot(path=str(OUT/'new-help-mobile.png'))
            new.locator('.bottom-nav [data-nav=reminders]').click()
            assert new.locator('.reminders-page').count()==1
            new.screenshot(path=str(OUT/'new-reminders-mobile.png'))
            assert new.locator('.comfort-inline').count()==1
            assert new.locator('.comfort-inline .reminder-group').count()>=2
            assert new.locator('.comfort-inline').evaluate("(e)=>getComputedStyle(e).color")!='rgb(40, 83, 62)', 'Theme must avoid old green'
            ok(True,'reminder-panel-recolor-and-data-contract')
            new.locator('.bottom-nav [data-nav=profile]').click()
            assert new.locator('.profile-layout').is_visible()
            assert '이정희' in new.locator('.profile-layout').inner_text()
            assert new.locator('.profile-layout').evaluate("(el)=>getComputedStyle(el).animationName")=='v191-tab-arrive'
            status=new.locator('.transfer-status')
            assert status.is_visible()
            assert status.evaluate("(el)=>getComputedStyle(el).color")=='rgb(49, 94, 115)', 'Former green status must use marine-blue text'
            assert status.evaluate("(el)=>getComputedStyle(el).borderLeftColor")=='rgb(196, 122, 79)', 'Warm apricot border distinguishes status without green'
            assert new.locator('.transfer-section .primary').is_disabled()
            new.locator('.profile-section .secondary-action').hover()
            new.wait_for_timeout(300)
            assert new.locator('.profile-section .secondary-action').evaluate("(el)=>getComputedStyle(el).backgroundColor")=='rgb(233, 243, 252)', 'Profile CTA hover should never become forest green'
            new.screenshot(path=str(OUT/'v19-3-profile-color-mobile.png'))
            new.locator('[data-action=edit-start]').click()
            assert not new.locator('.main').evaluate("(el)=>el.classList.contains('v191-top-level-motion')"), 'In-page profile edits are not screen transitions'
            assert new.locator('.profile-layout').evaluate("(el)=>getComputedStyle(el).animationName")=='none'
            new.locator('[data-action=edit-cancel]').click()
            assert new.locator('.profile-layout').evaluate("(el)=>getComputedStyle(el).animationName")=='none'
            ok(True,'profile-transfer-colors-disabled-action-and-no-edit-animation')
            new.screenshot(path=str(OUT/'new-profile-mobile.png'))
            ok(True,'five-tabs-schedule-help-reminders-profile')
        if width==320:
            new.locator('.topline .v192-quick-font').click()
            assert new.locator('body.large-font').count()==1
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
    compare.locator('#open-example').click()
    original_frame=compare.frame_locator('iframe[title="기존 이정희님 환자 앱"]')
    candidate_frame=compare.frame_locator('iframe[title="새로운 이정희님 환자 앱"]')
    original_frame.locator('.v12-home').wait_for(timeout=9000)
    candidate_frame.locator('.v18-home').wait_for(timeout=9000)
    assert '이정희' in original_frame.locator('h1').first.inner_text()
    assert '이정희' in candidate_frame.locator('h1').first.inner_text()
    assert '두 가상 환자 화면' in compare.locator('#example-status').inner_text()
    compare.screenshot(path=str(OUT/'comparison-desktop.png'))
    compare.set_viewport_size({'width':390,'height':844})
    compare.locator('[data-design=original]').click()
    assert compare.locator('[data-panel=original]').is_visible() and not compare.locator('[data-panel=candidate]').is_visible()
    compare.locator('[data-design=candidate]').click()
    assert compare.locator('[data-panel=candidate]').is_visible() and not compare.locator('[data-panel=original]').is_visible()
    compare.screenshot(path=str(OUT/'comparison-mobile.png'))
    ok(True,'compare-original-v19-side-by-side-and-mobile-toggle')
    home=ctx.new_page()
    home.goto(HOME_PREVIEW,wait_until='networkidle')
    assert home.locator('.path-card').count()==2
    assert home.locator('.path-card.patient').get_attribute('href')=='../../patient/v19-3.html'
    assert '독립 예시' in home.locator('.path-card.patient').inner_text()
    home.screenshot(path=str(OUT/'integrated-home-v18-preview.png'))
    ok(True,'coordinated-home-patient-color-and-demo-label')
    ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps({'scenarios':passed,'passed':len(passed)},ensure_ascii=False,indent=2),encoding='utf8')
print('V19.3 PASSED '+str(len(passed))+' scenarios')
