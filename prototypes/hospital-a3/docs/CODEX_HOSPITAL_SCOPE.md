# Codex — 병원용 A2/A3 작업 범위 (토큰 절약, A2 디자인 보호)

## 기준
- Repository `pchjesus/ai-care-transition-platform`, `main`, 확인된 SHA `f87402f8915f23b2e6da55079e770c49733cb140` (실행 시 HEAD 다시 확인).
- 승인된 `prototypes/hospital-a2/` v0.5는 시각·평가 동작 보존. A3 독립 로컬 시연본은 별도 제공 ZIP이며 GitHub에 **아직 없음**.
- 첫 작업은 코드 변경 없는 **C0 진단·테스트**. 사용자 승인 전 리팩토링/반영 금지. 환자용 v1.2는 범위 밖.

## 읽기 범위
1. `prototypes/hospital-a2/NEXT_CHAT_HANDOFF.md`, `CODEX_WORK_SCOPE_v0.1.md`, `README.md`를 먼저 읽되 반복 전체 문서 정독 금지.
2. 필요한 경로만: `data.js`, `engine.js`, `app.js`, `index.html`, `styles.css`, `tests/*`; 루트 `README.md`는 필요한 부분만. `AGENTS.md` 존재 시 우선 적용.
3. A3 ZIP 받은 경우 `README.md` 및 `docs/A3_DESIGN_AND_VERIFICATION.md`를 먼저 보고, 그 후 변경과 관련 있는 JS/CSS만 읽기.

## 작업 단위 (한 번에 하나씩)
- **H-C0 / 검사 전용**: HTTP `index.html`·독립 `preview.html` 실행/동등성, A2 Node/Chromium 회귀, A3 Node/Chromium 테스트, 320~1440px 이미지 비교. PASS/FAIL/NOT RUN 증거와 위험만 보고.
- **H-C1 / 별도 승인**: A2 CSS 중복/전역 상태 분리, 공통 평가 모델/가상 저장 인터페이스의 소규모 변경만. A2 v0.5 스크린샷·30입력·등급·접이식 사이드바 보존.
- **H-C2 / 별도 승인**: A3에서 A2 스냅샷 인수·보안/검증·버전/문서/발행 스냅샷 계약 보강. PDF 저장 원자성·실제 HTTP E2E 추가. A2 본체 재디자인 금지.

## 작업 계약
- 변화 전 해당 영역 테스트 실행→최소 파일만 패치→기존 회귀+새 테스트 실행→전후 스크린샷 비교.
- 사용자 승인 전 `main` push/merge/PR 생성/실제 환자·Firebase·EMR 연결 금지.
- 의료적 점수·정부 선별 6문항·약물 용량을 추론하여 새 규칙/지시로 추가하지 말 것.
- 성공 보고는 diff, 테스트 명령·결과, 아직 남는 NOT RUN/위험만. 자율 대규모 리팩토링·문서 증식 금지.

## v0.2 이후 추가 검사 항목

- 신규 `tests/navigation_v02.py`의 A1 선택·A2 30개 항목·명시적 인계·팝업 점프·접힘/독립 미리보기를 회귀에 포함.
- 승인된 A2 v0.5 GitHub 원본과 A3 내 복사된 `data.js`의 항목/선택지/등급 처리 드리프트 비교. 수정 여부는 별도 제안, 자동 동기화 금지.
- 수정 전에 `A3 v0.2`의 1개 기본 펼침 + 나머지 접힘 인터랙션, 6개 화면 너비의 글자/가로 넘침 유지.
- `app.js`의 새로운 보조 화면 렌더링/대화창 이벤트를 기능별로 분리할 수 있는지 **읽기 전용 진단 우선**. 기존 승인·발행 상태 전이는 고위험으로 별도 작은 PR.
