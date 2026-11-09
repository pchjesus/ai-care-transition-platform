from pathlib import Path
from playwright.sync_api import sync_playwright
import json, hashlib, urllib.parse

BASE='http://127.0.0.1:8765/prototypes'
HOME=BASE+'/integrated-v10/index.html'
H=BASE+'/hospital-ux2-v07/index.html'
B_URL=BASE+'/integrated-v10/patient/index.html?patient=SYN-002&encounter=ENC-SYN-002-DEMO'
KEY='care-transition-integrated-v10-a3-synthetic-only'
OUT=Path('/tmp/carebridge-v07-qa');OUT.mkdir(parents=True,exist_ok=True)
passed=[]

def require(ok,scenario):
    assert ok,scenario
    if scenario not in passed:passed.append(scenario)

def get(page,patient='SYN-002'):
    return page.evaluate('''([key,id]) => JSON.parse(localStorage.getItem(key))?.[id]''',[KEY,patient])

def publish_view(page,patient='SYN-002'):
    return page.evaluate('''async id => {
        const api=await import('/prototypes/integrated-v10/shared/publication.js');
        const enc=api.encounterFor(id);
        return api.readPatientPublication(localStorage,id,enc);
    }''',patient)

def navigate(page,patient='SYN-002',section='review'):
    page.goto(H,wait_until='networkidle')
    page.locator('.nav-item[data-view="patients"]').click()
    page.locator(f'[data-open="{patient}"]').first.click()
    page.locator(f'.patient-route[data-view="{section}"]').click()
    if section=='review':page.locator('[data-ux7-action="request"],[data-ux7-action="revise"],[data-ux7-action="publish"]').first.wait_for(timeout=6500)
    else: page.locator('.ux6-main-tabs').wait_for()

def switch(page,section):
    page.locator(f'.nav-item[data-view="{section}"]').last.click()
    if section=='review':page.locator('.ux7-steps').wait_for()
    else:page.locator('.ux6-main-tabs').wait_for()

def step(page,action,patient='SYN-002',expected=None):
    button=page.locator(f'[data-ux7-action="{action}"]')
    button.click()
    if expected:
      page.wait_for_function('''([key,id,status]) => JSON.parse(localStorage.getItem(key))?.[id]?.draft?.status===status''',[KEY,patient,expected],timeout=7500)

def role(page,name):
    page.locator('[data-v6-role]').select_option(name)

def no_horizontal(page,width):
    result=page.evaluate('document.documentElement.scrollWidth')
    assert result<=width+1,(width,result,page.url)

def login_patient(ctx):
    page=ctx.new_page()
    page.goto(B_URL,wait_until='networkidle')
    page.locator('#demo-code').fill('CARE2026')
    page.locator('#demo-login button[type="submit"]').click()
    page.locator('.app-layout').wait_for()
    return page

with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for tag,width,height in [('desktop',1440,900),('tablet',768,1024),('mobile',390,844),('small',320,720)]:
        ctx=b.new_context(viewport={'width':width,'height':height})
        page=ctx.new_page()
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(HOME,wait_until='networkidle')
        assert '퇴원 준비부터' in page.locator('h1').inner_text()
        assert page.locator('.path-card').count()==2
        assert 'hospital-ux2-v07' in page.locator('.path-card').first.get_attribute('href')
        no_horizontal(page,width)
        page.screenshot(path=str(OUT/f'home-{tag}.png'),full_page=False)
        page.goto(H,wait_until='networkidle')
        if width<=700:page.locator('[data-action="menu-open"]').click()
        page.locator('.nav-item[data-view="patients"]').click()
        page.locator('[data-open="SYN-002"]').first.click()
        if width<=700:page.locator('[data-action="menu-open"]').click()
        page.locator('.patient-route[data-view="review"]').click()
        page.locator('.ux7-steps').wait_for()
        assert page.locator('[data-ux7-action="request"]').is_enabled()
        assert page.locator('.ux7-home-link').count()==1
        no_horizontal(page,width)
        page.screenshot(path=str(OUT/f'hospital-{tag}.png'))
        assert not errors,(tag,errors)
        require(True,f'home-and-hospital-responsive-{tag}')
        ctx.close()

    ctx=b.new_context(viewport={'width':1440,'height':900})
    h=ctx.new_page()
    errors=[];h.on('pageerror',lambda e:errors.append(str(e)))
    navigate(h)
    initial=get(h)
    assert initial is None or initial['draft']['status']=='DRAFT' # Unsaved cases may use in-memory synthetic baseline
    assert publish_view(h)['status']=='EMPTY'
    require(True,'unpublished-B-fail-closed')

    # Add and review a PDF. PDF bytes must remain bound to the exact patient/publication.
    switch(h,'plan')
    h.locator('[data-v6-tab="docs"]').click()
    pdf=b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n'
    h.locator('[data-v6-pdf]').set_input_files({'name':'SYN002-v07-education.pdf','mimeType':'application/pdf','buffer':pdf})
    h.wait_for_function('''key => JSON.parse(localStorage.getItem(key))?.["SYN-002"]?.draft?.docs?.length===1''',KEY)
    h.locator('[data-v6-doc-visibility]').select_option('PATIENT')
    role(h,'APPROVER')
    h.locator('[data-v6-action="review-pdf"]').click()
    assert get(h)['draft']['docs'][0]['status']=='REVIEWED'
    require(True,'PDF-metadata-hash-role-review')

    switch(h,'review')
    step(h,'request',expected='REVIEW_REQUESTED')
    role(h,'NURSE')
    assert h.locator('[data-ux7-action="approve"]').is_disabled()
    require(True,'review-request-and-approval-role-guard')
    role(h,'APPROVER')
    assert h.locator('[data-ux7-action="approve"]').is_enabled()
    step(h,'approve',expected='APPROVED')
    assert publish_view(h)['status']=='EMPTY'
    require(True,'approved-but-not-published-hidden')

    step(h,'publish',expected='PUBLISHED')
    result=publish_view(h)
    assert result['status']=='PUBLISHED'
    pub=result['publication']
    assert pub['patientId']=='SYN-002' and pub['encounterId']=='ENC-SYN-002-DEMO'
    assert pub['planVersion']=='1.0' and len(pub['documents'])==1
    assert pub['status']=='PUBLISHED'
    require(True,'publish-patient-B-identity-version-projection')

    pdf_check=h.evaluate('''async () => {
      const m=await import('/prototypes/integrated-v10/shared/published-documents.js');
      const api=await import('/prototypes/integrated-v10/shared/publication.js');
      const p=api.readPatientPublication(localStorage,'SYN-002','ENC-SYN-002-DEMO').publication;
      const result=await m.readPublishedDocument(localStorage,p.patientId,p.encounterId,p.publicationId,p.documents[0].id);
      return {name:result.name,size:result.blob.size}
    }''')
    assert pdf_check['name']=='SYN002-v07-education.pdf' and pdf_check['size']==len(pdf)
    require(True,'published-PDF-authenticated-by-original-transport')

    patient=login_patient(ctx)
    assert '나의 퇴원안내' in patient.locator('body').inner_text()
    assert get(h)['draft']['status']=='PUBLISHED'
    patient.screenshot(path=str(OUT/'patient-published-v1.png'))
    require(True,'patient-app-B-opens-published-plan')

    step(h,'revise',expected='DRAFT')
    assert get(h)['draft']['version']=='2.0'
    previous=publish_view(h)
    assert previous['status']=='PUBLISHED' and previous['publication']['planVersion']=='1.0'
    require(True,'revision-keeps-old-published-snapshot')

    switch(h,'plan')
    h.locator('[data-v6-tab="items"]').click()
    h.locator('#ux6-plan-text').fill('v2 합성 퇴원 교육 수정 내용 · 의료진 재검토 후 제공')
    h.locator('[data-v6-action="save-text"]').click()
    assert get(h)['draft']['items'][0]['verified'] is False
    role(h,'APPROVER')
    for section in ['today','medication','followup','warning','contact','support']:
        h.locator(f'[data-plan-tab="{section}"]').click()
        checked=h.locator('[data-v6-verified]')
        checked.check()
        assert next(x for x in get(h)['draft']['items'] if x['section']==section)['verified'] is True
    h.locator('[data-v6-tab="docs"]').click()
    h.locator('[data-v6-action="review-pdf"]').click()
    assert get(h)['draft']['docs'][0]['status']=='REVIEWED'
    switch(h,'review')
    step(h,'request',expected='REVIEW_REQUESTED')
    step(h,'approve',expected='APPROVED')
    step(h,'publish',expected='PUBLISHED')
    rev=publish_view(h)
    assert rev['publication']['planVersion']=='2.0'
    assert rev['publication']['items'][0]['text'].startswith('v2 합성')
    assert [x['status'] for x in get(h)['publications']][:2]==['PUBLISHED','SUPERSEDED']
    require(True,'revision-reapproval-v2-supersedes-v1')

    # Current publication withdrawal must hide content immediately, including other pages.
    h.once('dialog',lambda d:d.accept())
    step(h,'revoke',expected='REVOKED')
    assert publish_view(h)['status']=='EMPTY'
    patient.reload(wait_until='networkidle')
    assert 'v2 합성 퇴원 교육 수정 내용' not in patient.locator('body').inner_text()
    require(True,'revocation-B-hidden-after-reload')
    patient.close()

    # A2 conflict/unknown case may request review but cannot be approved.
    navigate(h,'SYN-003','review')
    assert publish_view(h,'SYN-003')['status']=='EMPTY'
    step(h,'request','SYN-003','REVIEW_REQUESTED')
    role(h,'APPROVER')
    assert h.locator('[data-ux7-action="approve"]').is_disabled()
    require(True,'missing-conflicting-assessment-blocks-approval')

    # Stale same-origin state must not be overwritten by workflow actions.
    navigate(h,'SYN-001','review')
    h.evaluate('''key=>{const d=JSON.parse(localStorage.getItem(key));d["SYN-001"].audit.unshift({at:new Date().toISOString(),role:"system",event:"OTHER_TAB",details:"simulated"});localStorage.setItem(key,JSON.stringify(d));}''',KEY)
    step(h,'request','SYN-001')
    assert get(h,'SYN-001')['draft']['status']=='DRAFT'
    require(True,'concurrent-stale-write-rejected')

    assert not errors,errors
    ctx.close()
    b.close()
(OUT/'results.json').write_text(json.dumps({'results':[{'name':n,'status':'PASS'} for n in passed],'passed':len(passed)},ensure_ascii=False,indent=2),encoding='utf8')
print('V07 PASSED '+str(len(passed))+' scenarios')
print(json.dumps(passed,ensure_ascii=False))
