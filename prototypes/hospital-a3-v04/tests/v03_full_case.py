from browser_support import load_app
"""SYN-001 synthetic full issue+plan+approval journey."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900})
 errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 load_app(page,ROOT)
 assert '7건' in page.locator('#gate-banner').inner_text(),page.locator('#gate-banner').inner_text()
 page.locator('#actor').select_option('PHARMACIST')
 page.locator('[data-tab="issues"]').click()
 root=page.locator('[data-issue="ISS-plan-med-original"]')
 root.locator('[data-action="select-source"]').click()
 page.locator('[data-connect-source="SRC-SYN001-MED-02"]').click()
 root=page.locator('[data-issue="ISS-plan-med-original"]')
 root.locator('[data-issue-edit="resolution"]').fill('약료 담당자 가상 확인 기록으로 환자용 복약 교육 원문을 재확인하였습니다.')
 root.locator('[data-action="resolve"]').click()
 assert '6건' in page.locator('#gate-banner').inner_text()
 plan=[('today','NURSE','NUR-01'),('medication','PHARMACIST','MED-02'),('followup','PHYSICIAN','APT-01'),('warning','PHYSICIAN','WARN-01'),('contact','NURSE','CON-01'),('support','NURSE','SOC-01')]
 page.locator('[data-tab="plan"]').click()
 for section,role,src in plan:
  page.locator('#actor').select_option(role)
  article=page.locator(f'[data-item="{section}"]')
  if article.get_attribute('open') is None:article.locator('summary').click()
  article.locator('[data-action="select-source"]').click()
  page.locator(f'[data-connect-source="SRC-SYN001-{src}"]').click()
  article=page.locator(f'[data-item="{section}"]')
  if article.get_attribute('open') is None:article.locator('summary').click()
  article.locator('[data-edit="verified"]').check()
  assert article.locator('[data-edit="verified"]').is_checked(),section
 assert '확인사항 없음' in page.locator('#gate-banner').inner_text(),page.locator('#gate-banner').inner_text()
 page.locator('#request').click()
 page.locator('#actor').select_option('APPROVER')
 assert page.locator('#approve').is_enabled()
 page.locator('#approve').click()
 assert page.locator('#publish').is_enabled()
 page.locator('#publish').click()
 assert page.locator('#workflow-state').inner_text()=='발행 완료'
 assert page.locator('#preview-frame').get_by_text('지금 필요한 일부터 모았어요.').count()==1
 assert not errs,errs
 print('SYN-001 FULL FLOW PASS: 7 blockers -> verified 6 items -> approved -> published')
 b.close()
