from browser_support import load_page, OUT, MODE
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
FRONT=(ROOT/'index.html').read_text(encoding='utf-8')
DEV=(ROOT/'preview.html').read_text(encoding='utf-8')
PDF=(ROOT/'보행_보조기_안내_시연용.pdf').read_bytes()
def attach(page,dev=False,stored=None):
    if MODE!='injection':
        load_page(page,dev);return
    # File:// and loopback navigation are administratively blocked in this test sandbox.
    # Replace the unavailable origin with a deterministic storage double to verify
    # repository save/load semantics, while testing the REAL standalone HTML/JS.
    values=stored or {}
    page.evaluate("""(initial) => {
      const values={...initial};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:(key)=>Object.hasOwn(values,key)?values[key]:null,
        setItem:(key,val)=>{values[key]=String(val)},
        removeItem:(key)=>{delete values[key]},
        _dump:()=>({...values})
      }});
    }""",values)
    page.set_content(DEV if dev else FRONT,wait_until='load')

def reload_demo(page):
    if MODE!='injection':
        page.reload();return
    data=page.evaluate('localStorage._dump()')
    page.goto('about:blank')
    attach(page,stored=data)

def nav(page,name):
    side_visible=page.locator('.side').is_visible()
    if name=='profile' and not side_visible:
        page.locator('.top-profile').click()
    elif side_visible:
        page.locator(f'.side [data-nav="{name}"]').click()
    else:
        page.locator(f'.bottom-nav [data-nav="{name}"]').click()

def enter(page):
    page.locator('#demo-code').fill('CARE2026')
    page.get_by_role('button',name='가상 환자 안내 시작').click()
    page.locator('.hero-panel').wait_for()

with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width,height in [(320,780),(360,800),(390,844),(768,1000),(1024,930),(1440,930)]:
        ctx=b.new_context(viewport={'width':width,'height':height})
        pg=ctx.new_page();pg.set_default_timeout(4000);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
        attach(pg)
        assert pg.locator('.devbar').count()==0
        pg.locator('#demo-code').fill('INVALID');pg.get_by_role('button',name='가상 환자 안내 시작').click()
        assert pg.locator('.form-error').count()==1
        enter(pg)
        assert '오늘의 관리 계획' in pg.locator('main').inner_text()
        for screen in ['today','schedule','help','profile','overview','detail','quiz']:
            if screen in ('today','schedule','help','profile','overview'):nav(pg,'today' if screen=='overview' else screen)
            if screen=='overview':pg.get_by_role('button',name='계획 전체와 상태 보기').click()
            if screen=='detail':pg.locator('[data-detail="mobility"]').first.click()
            if screen=='quiz':pg.get_by_role('button',name='안내 확인 문제 풀어보기 (선택)').click()
            geo=pg.evaluate('''() =>({inner:innerWidth,scroll:document.documentElement.scrollWidth,app:document.querySelector('.app-frame').scrollWidth})''')
            assert geo['scroll']<=width+2,(width,screen,geo)
        nav(pg,'today')
        if width==390:
            pg.screenshot(path=str(OUT/'home_390.png'),full_page=True)
            pg.locator('.top-font').click()
            def font(selector):return float(pg.locator(selector).first.evaluate('x=>parseFloat(getComputedStyle(x).fontSize)'))
            for screen,selector in [('today','.task-content b'),('schedule','.event h3'),('help','.service-title'),('profile','.profile-layout>h1'),('overview','.overview-head h1'),('detail','.detail-heading h1'),('quiz','.quiz-title')]:
                if screen in ['today','schedule','help','profile','overview']:
                    nav(pg,'today' if screen=='overview' else screen)
                    if screen=='overview':pg.get_by_role('button',name='계획 전체와 상태 보기').click()
                elif screen=='detail':nav(pg,'today');pg.locator('[data-detail="mobility"]').first.click()
                else:pg.get_by_role('button',name='안내 확인 문제 풀어보기 (선택)').click()
                print('CHECK FONT',screen,flush=True)
                big=font(selector)
                pg.locator('.top-font').click()
                regular=font(selector)
                assert big > regular * 1.12,(screen,big,regular)
                pg.locator('.top-font').click()
                assert abs(font(selector)-big)<.15,(screen, font(selector),big)
                g=pg.evaluate('''()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth})''')
                assert g['scroll']<=width+2,(width,screen,g)
                print('LARGE',screen,round(regular,1),'=>',round(big,1))
            pg.screenshot(path=str(OUT/'large_quiz_390.png'),full_page=True)
            nav(pg,'today')
            pg.locator('[data-detail="mobility"]').first.click()
            pg.get_by_role('button',name='앱에서 PDF 확인하기').click()
            assert pg.locator('.pdf-image').is_visible()
            assert pg.locator('.pdf-actions a[href^="blob:"]').count()==2
            pg.screenshot(path=str(OUT/'pdf_390.png'),full_page=True)
            pg.get_by_role('button',name='닫기 ×').click()
            nav(pg,'profile')
            pg.get_by_role('button',name='주소·연락처 수정하기').click()
            pg.locator('#address').fill('서울시 가상구 새주소 58 (가상)')
            pg.locator('#contact').fill('010-2222-3333 (가상)')
            pg.get_by_role('button',name='수정 내용 저장').click()
            assert pg.get_by_role('dialog').count()==1
            pg.screenshot(path=str(OUT/'save_confirm_390.png'),full_page=True)
            pg.get_by_role('button',name='변경사항 저장').click()
            assert '저장됐어요' in pg.locator('.inline-notice').inner_text()
            assert pg.get_by_text('서울시 가상구 새주소 58 (가상)').count()==1
            oldrev=pg.evaluate('JSON.parse(localStorage.getItem("discharge_navigator_v13_mock_profile")).revision')
            assert oldrev==1
            pg.screenshot(path=str(OUT/'profile_saved_390.png'),full_page=True)
            # persisted on refresh but request was NOT sent yet
            reload_demo(pg)
            enter(pg)
            nav(pg,'profile')
            assert pg.get_by_text('서울시 가상구 새주소 58 (가상)').count()==1
            assert pg.get_by_role('button',name='정보 업데이트 전송 요청').is_enabled()
            pg.get_by_role('button',name='정보 업데이트 전송 요청').click()
            pg.get_by_role('button',name='모의 전송 요청 기록').click()
            assert pg.locator('.consent-row.input-error').count()==1
            pg.locator('#transfer-consent').check()
            pg.get_by_role('button',name='모의 전송 요청 기록').click()
            assert '실제 기관으로 전송되지 않았습니다' in pg.locator('.inline-notice').inner_text()
            saved=pg.evaluate('JSON.parse(localStorage.getItem("discharge_navigator_v13_mock_profile"))')
            assert saved['lastRequest']['revision']==1 and saved['lastRequest']['status']=='LOCAL_ONLY'
            pg.screenshot(path=str(OUT/'profile_requested_390.png'),full_page=True)
            reload_demo(pg);enter(pg);nav(pg,'profile')
            assert '모의 요청 DEMO-0001' in pg.locator('.transfer-status').inner_text()
            # new change invalidates old request
            pg.get_by_role('button',name='주소·연락처 수정하기').click()
            pg.locator('#contact').fill('010-9999-0000 (가상)')
            pg.get_by_role('button',name='수정 내용 저장').click()
            pg.get_by_role('button',name='변경사항 저장').click()
            assert '저장 후 기관 전송 요청' in pg.locator('.transfer-status').inner_text()
            val=pg.evaluate('JSON.parse(localStorage.getItem("discharge_navigator_v13_mock_profile"))')
            assert val['revision']==2 and val['lastRequest'] is None
            # font persists on reload
            assert '글자 기본' in pg.locator('.top-font').inner_text()
        if width==1440:
            pg.screenshot(path=str(OUT/'home_1440.png'),full_page=True)
        assert not errors,(width,errors)
        print('WIDTH',width,'OK')
        ctx.close()
    # preview regressions
    ctx=b.new_context(viewport={'width':1440,'height':920})
    pg=ctx.new_page();pg.set_default_timeout(4000);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
    attach(pg,True)
    assert pg.locator('.devbar').is_visible()
    pg.get_by_role('button',name='의료진 시연').click()
    pg.get_by_role('button',name='수정안 승인·발행').click()
    pg.locator('[data-detail="mobility"]').first.click()
    assert pg.get_by_role('button',name='앱에서 PDF 확인하기').count()==0
    pg.get_by_role('button',name='오늘 화면으로').click()
    pg.get_by_role('button',name='의료진 시연').click()
    pg.get_by_role('button',name='게시 철회 시연').click()
    assert pg.get_by_text('현재 공개된 퇴원 계획이 없어요.').count()==1
    pg.get_by_role('button',name='의료진 시연 화면').click()
    pg.get_by_role('button',name='다시 승인·발행').click()
    pg.get_by_role('button',name='초기화').click()
    pg.locator('[data-detail="mobility"]').first.click()
    assert pg.get_by_role('button',name='앱에서 PDF 확인하기').count()==1
    assert not errors,errors
    pg.screenshot(path=str(OUT/'preview_1440.png'),full_page=True)
    print('PREVIEW OK')
    ctx.close();b.close()
print('ALL PASS')
