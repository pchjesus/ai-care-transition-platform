from pathlib import Path
from playwright.sync_api import sync_playwright
import json
import hashlib

HOST = 'http://127.0.0.1:8765/prototypes/hospital-ux2-v06/index.html'
KEY = 'care-transition-integrated-v10-a3-synthetic-only'
OUT = Path('/tmp/carebridge-ux6-qa')
OUT.mkdir(parents=True, exist_ok=True)
checks = []

def getrecord(page, pid):
    return page.evaluate('''([key,id]) => JSON.parse(localStorage.getItem(key))[id]''', [KEY,pid])

def choose(page, pid):
    page.locator('.nav-item[data-view="patients"]').click()
    page.locator(f'[data-open="{pid}"]').first.click()
    if page.viewport_size['width']<=700:
        page.locator('[data-action="menu-open"]').click()
    page.locator('.patient-route[data-view="plan"]').click()
    page.locator('[data-v6-tab="items"]').wait_for()
    page.locator('#ux6-plan-text').wait_for()

def no_overflow(page, width, name):
    actual = page.evaluate('document.documentElement.scrollWidth')
    offenders=page.evaluate('''() => [...document.querySelectorAll('body *')].map(e=>({cls:String(e.className||'').slice(0,80),right:Math.round(e.getBoundingClientRect().right),w:Math.round(e.getBoundingClientRect().width)})).filter(e=>e.right>innerWidth+1 && e.w>0).slice(0,15)''')
    assert actual <= width+1, (name,width,actual,offenders)

def check(cond, name):
    assert cond, name
    checks.append({'name':name,'status':'PASS'})

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for name,w,h in [('desktop',1440,900),('tablet',768,1024),('mobile',390,844),('small',320,720)]:
        ctx=browser.new_context(viewport={'width':w,'height':h})
        p=ctx.new_page()
        errors=[]
        p.on('pageerror', lambda error:errors.append(str(error)))
        p.goto(HOST,wait_until='networkidle')
        assert p.locator('h1').inner_text()=='퇴원관리 업무'
        if w<=700:
            p.locator('[data-action="menu-open"]').click()
        choose(p,'SYN-002')
        assert p.locator('.ux6-section-tab').count()==6
        assert p.locator('[data-v6-role]').is_visible()
        assert p.locator('[data-v6-action="save-text"]').is_enabled()
        no_overflow(p,w,name+' plan')
        p.locator('[data-v6-tab="issues"]').click()
        assert p.locator('.ux6-result').count()==6
        no_overflow(p,w,name+' evidence')
        p.locator('[data-v6-tab="docs"]').click()
        assert p.locator('[data-v6-pdf]').count()==1
        no_overflow(p,w,name+' docs')
        p.screenshot(path=str(OUT/f'{name}-docs.png'))
        if w<=700: p.locator('[data-action="menu-open"]').click()
        p.locator('.patient-route[data-view="review"]').click()
        p.locator('.ux6-review-grid').wait_for(timeout=6000)
        no_overflow(p,w,name+' review')
        p.screenshot(path=str(OUT/f'{name}-review.png'))
        assert not errors, (name,errors)
        check(True,'render-navigation-'+name)
        ctx.close()

    ctx=browser.new_context(viewport={'width':1440,'height':900})
    p=ctx.new_page()
    errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)))
    p.goto(HOST,wait_until='networkidle')
    choose(p,'SYN-002')
    original=getrecord(p,'SYN-002') if p.evaluate('(key)=>localStorage.getItem(key)!==null',KEY) else None
    assert original is None or original['draft']['status']=='DRAFT'
    p.locator('#ux6-plan-text').fill('합성 사례용 퇴원 교육 문구 · v0.6 입력 저장 검증')
    p.locator('[data-v6-action="save-text"]').click()
    saved=getrecord(p,'SYN-002')
    assert saved['draft']['items'][0]['text']=='합성 사례용 퇴원 교육 문구 · v0.6 입력 저장 검증'
    assert saved['draft']['items'][0]['verified'] is False
    assert saved['audit'][0]['event']=='PLAN_EDIT'
    p.reload(wait_until='networkidle')
    assert p.locator('#ux6-plan-text').input_value()==saved['draft']['items'][0]['text']
    check(True,'save-and-restore-original-A3-record')

    # Multiple sources, preserved source compatibility and subsequent role verification.
    p.locator('#ux6-add-source').select_option('SRC-SYN002-NUR-02')
    p.locator('[data-v6-action="link"]').click()
    record=getrecord(p,'SYN-002')
    item=record['draft']['items'][0]
    assert item['sources'][0]==item['source']
    assert item['sources'][-1]=='SRC-SYN002-NUR-02'
    p.locator('[data-v6-verified]').check()
    assert getrecord(p,'SYN-002')['draft']['items'][0]['verified'] is True
    check(True,'source-link-and-authorized-verification')

    # PDF metadata persists; actual bytes are session-only and must be reattached.
    p.locator('[data-v6-tab="docs"]').click()
    pdf=b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n'
    p.locator('[data-v6-pdf]').set_input_files({'name':'SYN002-education.pdf','mimeType':'application/pdf','buffer':pdf})
    p.wait_for_function('''() => JSON.parse(localStorage.getItem("care-transition-integrated-v10-a3-synthetic-only"))["SYN-002"].draft.docs.length===1''')
    metadata=getrecord(p,'SYN-002')['draft']['docs'][0]
    assert metadata['fileHash']==hashlib.sha256(pdf).hexdigest()
    assert metadata['visibility']=='INTERNAL' and metadata['status']=='REGISTERED'
    p.locator('[data-v6-role]').select_option('PHYSICIAN')
    p.locator('[data-v6-action="review-pdf"]').click()
    assert getrecord(p,'SYN-002')['draft']['docs'][0]['status']=='REVIEWED'
    p.reload(wait_until='networkidle')
    p.locator('[data-v6-tab="docs"]').click()
    assert p.locator('[data-v6-action="review-pdf"]').is_disabled()
    p.locator('[data-v6-pdf]').set_input_files({'name':'SYN002-education.pdf','mimeType':'application/pdf','buffer':pdf})
    p.locator('[data-v6-action="review-pdf"]').wait_for(state='visible')
    assert p.locator('[data-v6-action="review-pdf"]').is_enabled()
    assert len(getrecord(p,'SYN-002')['draft']['docs'])==1
    check(True,'pdf-hash-review-persistence-and-byte-rebind')

    # Source issue resolution must use valid evidence and authorized role.
    p.locator('.nav-item[data-view="patients"]').click()
    p.locator('[data-open="SYN-001"]').click()
    p.locator('.patient-route[data-view="plan"]').click()
    p.locator('[data-v6-tab="issues"]').click()
    box=p.locator('[data-v6-issue="ISS-plan-med-original"]')
    box.locator('[data-v6-issue-source]').select_option('SRC-SYN001-MED-02')
    box.locator('[data-v6-resolution]').fill('합성 약물 대조 원본을 확인하여 기록을 보완하였습니다.')
    # Denied attempt from nurse
    p.locator('[data-v6-role]').select_option('NURSE')
    box=p.locator('[data-v6-issue="ISS-plan-med-original"]')
    box.locator('[data-v6-issue-source]').select_option('SRC-SYN001-MED-02')
    box.locator('[data-v6-resolution]').fill('합성 약물 대조 원본을 확인하여 기록을 보완하였습니다.')
    box.locator('[data-v6-action="resolve"]').click()
    assert next(x for x in getrecord(p,'SYN-001')['draft']['issues'] if x['id']=='ISS-plan-med-original')['status']=='OPEN'
    p.locator('[data-v6-role]').select_option('PHARMACIST')
    box=p.locator('[data-v6-issue="ISS-plan-med-original"]')
    box.locator('[data-v6-issue-source]').select_option('SRC-SYN001-MED-02')
    box.locator('[data-v6-resolution]').fill('합성 약물 대조 원본을 확인하여 기록을 보완하였습니다.')
    box.locator('[data-v6-action="resolve"]').click()
    issue=next(x for x in getrecord(p,'SYN-001')['draft']['issues'] if x['id']=='ISS-plan-med-original')
    assert issue['status']=='RESOLVED' and issue['source']=='SRC-SYN001-MED-02'
    check(True,'role-guarded-issue-resolution')

    # Published record is immutable. Existing publication status and snapshots remain.
    p.locator('.nav-item[data-view="patients"]').click()
    p.locator('[data-open="SYN-004"]').click()
    p.locator('.patient-route[data-view="plan"]').click()
    p.wait_for_function("location.hash.includes('/SYN-004/plan')",timeout=3000)
    prior=getrecord(p,'SYN-004')
    print('SYN-004 diagnostic:',p.evaluate("({hash:location.hash,html:document.querySelector('#main-content')?.innerText?.slice(0,350),n:document.querySelectorAll('[data-v6-action=save-text]').length})"),errors,flush=True)
    p.locator('[data-v6-action="save-text"]').wait_for(timeout=6000)
    assert p.locator('[data-v6-action="save-text"]').is_disabled()
    assert getrecord(p,'SYN-004')['publications']==prior['publications']
    check(True,'published-plan-immutable')

    # Compare-and-write detects concurrent change and must not overwrite it.
    p.locator('.nav-item[data-view="patients"]').click()
    p.locator('[data-open="SYN-002"]').click()
    p.locator('.patient-route[data-view="plan"]').click()
    p.locator('#ux6-plan-text').fill('이 값은 저장되면 안 됩니다.')
    p.evaluate('''key=>{const x=JSON.parse(localStorage.getItem(key));x["SYN-002"].audit.unshift({at:new Date().toISOString(),role:"system",event:"EXTERNAL_WRITE",details:"test"});localStorage.setItem(key,JSON.stringify(x));}''',KEY)
    p.locator('[data-v6-action="save-text"]').click()
    after=getrecord(p,'SYN-002')
    assert after['draft']['items'][0]['text']==saved['draft']['items'][0]['text']
    assert after['audit'][0]['event']=='EXTERNAL_WRITE'
    check(True,'compare-and-write-stale-data-fail-closed')
    assert not errors, errors
    ctx.close()

    ctx=browser.new_context()
    p=ctx.new_page()
    p.goto(HOST,wait_until='networkidle')
    p.evaluate('''key=>localStorage.setItem(key,"{bad-json")''',KEY)
    p.reload(wait_until='networkidle')
    choose(p,'SYN-002')
    assert p.locator('[data-v6-action="save-text"]').is_disabled()
    assert p.evaluate('''key=>localStorage.getItem(key)''',KEY)=='{bad-json'
    check(True,'malformed-storage-readonly-no-overwrite')
    ctx.close()
    browser.close()

(OUT/'results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(checks,ensure_ascii=False,indent=2))
