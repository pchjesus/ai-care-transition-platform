from playwright.sync_api import sync_playwright
URL='http://127.0.0.1:8765/prototypes/hospital-ux2-v06/standalone.html'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (1440,390):
  ctx=browser.new_context(viewport={'width':width,'height':850})
  page=ctx.new_page()
  errors=[]
  page.on('pageerror',lambda err:errors.append(str(err)))
  page.goto(URL,wait_until='networkidle')
  page.locator('h1').wait_for()
  page.wait_for_function('window.CB_INLINE_MODULES && document.querySelector(".prototype-pill").textContent.includes("v0.6")')
  if width<=700:page.locator('[data-action="menu-open"]').click()
  page.locator('.nav-item[data-view="patients"]').click()
  page.locator('[data-open="SYN-002"]').first.click()
  if width<=700:page.locator('[data-action="menu-open"]').click()
  page.locator('.patient-route[data-view="plan"]').click()
  page.locator('#ux6-plan-text').wait_for(timeout=5000)
  page.locator('#ux6-plan-text').fill('단일 HTML 시연 검증')
  page.locator('[data-v6-action="save-text"]').click()
  page.wait_for_function("""() => JSON.parse(localStorage.getItem('care-transition-integrated-v10-a3-synthetic-only'))?.['SYN-002']?.draft?.items?.[0]?.text==='단일 HTML 시연 검증'""")
  page.reload(wait_until='networkidle')
  page.wait_for_function("""() => document.getElementById('ux6-plan-text')?.value==='단일 HTML 시연 검증'""")
  assert not errors, (width,errors)
  print('STANDALONE_HTTP_PASS',width)
  ctx.close()
 browser.close()
