#!/usr/bin/env python3
"""Generate deterministic synthetic-patient PDF & PNG from the audited HTML fixture.

This file does not create any clinical guidance; its source HTML contains only
existing mock education text. Intended for the isolated candidate branch.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import fitz

ROOT=Path(__file__).resolve().parents[1]
ASSET=ROOT/'patient'/'assets'
HTML=ASSET/'lee-walker-guide-source.html'
PDF=ASSET/'lee-walker-guide-v193.pdf'
PREVIEW=ASSET/'lee-walker-guide-v193.png'
TEXT=[
 '가상 교육자료','보행 보조기 안내','이 자료는 실제 치료 지침이 아닙니다.',
 '어떤 경우에 보조기를 사용하나요?', '설명이 헷갈리면 어떻게 하나요?',
 '다음 진료 전에 준비할 것','의료진 승인·검증: 해당 없음',
 '실제 보행 방법·운동량·금기사항은 포함하지 않습니다.'
]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':794,'height':1123},device_scale_factor=1)
    page.goto(HTML.as_uri(),wait_until='networkidle')
    page.evaluate('document.fonts.ready')
    page.pdf(path=str(PDF),format='A4',print_background=True,prefer_css_page_size=True,margin={'top':'0','bottom':'0','left':'0','right':'0'})
    browser.close()
doc=fitz.open(PDF)
assert len(doc)==1, f'Expected one printable A4 page; got {len(doc)}'
full=' '.join(doc[0].get_text().split())
for snippet in TEXT:
    assert snippet in full, f'Missing existing source text in PDF: {snippet}'
assert 8000 < PDF.stat().st_size < 2000000, 'Suspicious or empty PDF'
pix=doc[0].get_pixmap(matrix=fitz.Matrix(1.3,1.3),alpha=False)
pix.save(PREVIEW)
doc.close()
assert PREVIEW.stat().st_size > 20000
print(f'GENERATED_PDF_OK: {PDF.stat().st_size} bytes / preview {PREVIEW.stat().st_size} bytes; 1 page; 8 preservation checks')
