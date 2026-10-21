# Codex C0 진단 작업 계약 — A3 v0.3

**작업: 읽기·진단 우선. 코드 변경, 브랜치, GitHub 푸시 금지.** 사용자 승인 후 작은 패치만 진행.

## 최소 읽기 순서
1. `README.md`, 이 문서, 해당 경로의 `AGENTS.md`가 있으면 읽기.
2. Node/Chromium 테스트 실행 결과 (`tests/workflow.test.js`, `tests/source_contract.test.js`, `tests/v03_features.py`, `tests/v03_full_case.py`, `tests/browser_smoke.py`).
3. FAIL 시 **관련 파일만** 읽기: 상태/승인 문제 `workflow.js`, `source-library.js`; UI/동작 `app.js` 해당 함수·`index.html` 구조·`styles.css` 해당 선택자; 저장 문제 `app.js` 저장 함수; 빌드 차이 `build_standalone.py`.
4. 전체 코드/문서 재열람, 별도 환자용 v1.2 일괄 조회, A2 승인 원본 수정은 피하기.

## 반드시 진단할 문제
- A2 v0.5 원본과 A3 내부 재현판의 차이 및 이중관리 위험(원본 수정 없음)
- 로컬 상태와 실습 상태 분리, 새로고침/다른 환자 전환 시 오염
- 원천자료 연결 유효성(동일 환자·입원 건·필드·확인 상태), A2 미해결 값 우회 가능성
- 역할/검토/승인 상태 전이, 수정 이후 승인 무효화, publishedSnapshot 불변성
- SYN004 v1.0 → v2.0, 구버전 유지/대체/철회
- 미리보기 접기·교육탭/자료 팝업 키보드 및 반응형
- PDF 원본 유실·첨부/공개 상태 및 인쇄 자료의 승인 대상 일치성
- CSS 중복/반응형 충돌, 이벤트 재등록·XSS/HTML 이스케이프

## 산출 형식
`BLOCKER / BUG / MAINTAINABILITY / OPTIONAL` 우선순위 분리, 파일·함수·재현절차·원인·최소 수정안·회귀 범위 제시. PASS/FAIL/NOT RUN 구분. 사용자 승인 전 코드 변경하지 말 것.

주의: 실제 역할 선택은 인증이 아니며, PDF의 브라우저 출력은 서버 원자적 발행이 아니다. 실제 의료정보/외부기관/파이어베이스 연결 금지. A2 v0.5와 환자용 v1.2 절대 수정 금지.
