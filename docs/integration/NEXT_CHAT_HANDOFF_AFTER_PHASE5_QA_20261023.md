# 케어브릿지랩 — 5차 QA 완료 후 R13 사용성 관찰 인수인계

작성: 2026-10-23 KST. **합성 데이터 연구·수업 MVP**, 공식 의료서비스 아님.

1. 최신 실행 코드: `main`의 `898bd1e2fe8b0568b308c4bda996eb21413e5f69` 기반(후속 문서·검사 커밋은 별도). Pages 실행 파일은 `gh-pages` `da24d7329865e1380fb5e6e8090cc35c1ebce227`.
2. 검증 요약: Node 98/98 PASS, Chromium 통합·회귀 고유 102개 검사 범위 PASS(분산 실행), Pages 48개 파일/133 참조 PASS, Pages 로컬 접두사 3/3 PASS, **실제 공개 URL** 7개 HTTP 파일 + 임상의 A2/A3 + 독립 B 로그인·알림 화면 PASS(분산 실행). 정확한 실행 이력: `docs/integration/PHASE5_QA_REFACTOR_AND_R13_READINESS_20261023.md`.
3. 기능 변경 없음. 현재 승인·발행·개정·철회, A2 업무우선도 0~3등급, 합성자료, 환자/입원건 분리, 저장 실패 및 미발행 공개 방지는 보존. 테스트 코드의 오래된 삭제 CTA 참조만 수정함.
4. 리팩토링: 본 파일럿 전 대규모 개편 보류. 후보 `unified.css` 표시 규칙, A3와 환자용 뷰 모듈 분리, 독립 B의 단일 대형 HTML. 안전 계약 변경 금지.
5. R13 실행 준비: `docs/research/R13_PATIENT_CAREGIVER_USABILITY_PILOT_v0.1.md`, `docs/research/R13_MODERATOR_FIELD_SHEET_20261023.md`로 과업·관찰을 시작할 수 있는 **서식** 마련. **실제 참가자 실험 NOT RUN**. 시작 전 연구윤리/동의/가상사례 전문가 검토, 물리 기기 점검, 내부 리허설이 필요함.
6. 이전 프로토콜/메인 UI를 처음부터 재분석하지 말 것. 다음 작업은 참여자가 과업 중 실제로 막히는 부분, 클릭 위치, 도움 요구, 의료정보/알림 오인을 비유도성으로 수집하는 것. 관찰 이후에만 우선순위 높은 UX 문제를 최소 수정.
7. 공개 URL: https://pchjesus.github.io/ai-care-transition-platform/ . 온디맨드 CI 워크플로 `Phase 5 live public Pages smoke`은 개발자 검증이며 실제 환자/보호자 참여와 다르다.
