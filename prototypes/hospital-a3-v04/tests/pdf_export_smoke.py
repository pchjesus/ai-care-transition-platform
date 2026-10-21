from browser_support import load_app, ARTIFACTS
"""Simulate approving a synthetic plan and inspect the browser print-to-PDF output."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import fitz
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ARTIFACTS/'SYN-002_sample_care_plan.pdf'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':850})
    load_app(page,ROOT)
    page.locator('#patient-select').select_option('SYN-002')
    page.locator('#request').click()
    page.locator('#actor').select_option('APPROVER')
    page.locator('#approve').click()
    page.locator('#publish').click()
    assert page.locator('#workflow-state').inner_text()=='발행 완료'
    page.locator('[data-tab="documents"]').click()
    page.evaluate('window.print = () => undefined')
    page.locator('[data-action="print-published"]').click()
    assert '퇴원 후 관리계획' in page.locator('#print-sheet').inner_text()
    page.pdf(path=str(OUTPUT),format='A4',print_background=True,prefer_css_page_size=True)
    browser.close()
pdf=fitz.open(OUTPUT)
content='\n'.join(page.get_text() for page in pdf)
for key in ('SYN-002','v1.0','퇴원 후 관리계획','외래·검사 일정'):
    assert key in content,f'PDF missing: {key}'
print('PDF output:',OUTPUT, 'pages:',len(pdf),'size:',OUTPUT.stat().st_size,'bytes')
print('Korean text and prototype version present: PASS')
pdf[0].get_pixmap(matrix=fitz.Matrix(1.4,1.4)).save(str(OUTPUT.with_suffix('.png')))
pdf.close()
