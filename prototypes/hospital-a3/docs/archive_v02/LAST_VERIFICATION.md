# 재검증 기록 — 2026-10-21

- `node --test tests/workflow.test.js`: **9/9 PASS**
- `python tests/browser_smoke.py`: **32/32 PASS** (Chromium HTML 주입 테스트)
- `python tests/pdf_export_smoke.py`: **PASS**, 한글 포함 1페이지 PDF 생성
- HTTP 실주소 내비게이션, 브라우저 새로고침 후 지속 저장, 실권한 인증, 실제 환자 정보: **NOT RUN / NOT IMPLEMENTED**
- PDF 생성과 발행 트랜잭션의 원자성: **NOT IMPLEMENTED**, 브라우저 인쇄 PDF 저장 방식임
- 환자용 v1.2 원본은 라이브러리에서 구조 일부 확인, 로컬 원본 materialize 실패; 원본 변경·코덱스 리팩토링 실행 안 함
- 기존 GitHub main, 병원용 A2 v0.5 원본, 환자용 v1.2 원본: **변경하지 않음**
