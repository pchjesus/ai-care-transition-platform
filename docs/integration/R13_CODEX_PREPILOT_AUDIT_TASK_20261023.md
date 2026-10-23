# R13 Codex 사전 코드 검증 — 최소 토큰·필수 범위 v1.0

2026-10-23. Repository: `pchjesus/ai-care-transition-platform`.
**목표:** 사용자 관찰 *전에* 기존 택시·이동지원 UX처럼 R13 보조기구 목업 + 독립/연동 B 모바일 드로어의 조작·안전·회귀 문제를 1회 집중 검증. Codex는 **검증 사실/의심/실행 불가를 구분**. 사람 대상 시험은 실행하지 않는다.

## 0. 코드베이스 및 분기 관계 — 중요
- `main` **절대 수정 금지** 기준: `24e16bee0a6158002d513e63294b5333d7df0dc9`.
- `gh-pages` **절대 수정/배포 금지** 기준: `600d19db15750016914afeee5a0ceb463897b514`.
- R13 문서+독립 목업/테스트: `docs/r13-service-ideas-20261023`. Codex 실행 직전 최신 HEAD 다시 확인(작성 중 변경 가능).
- **독립 B/연동 B 공통 모바일 드로어:** `feature/patient-mobile-drawer-krds-20261023` 기준 `0d435c0b1f7a5ebc4407396029a701e694dcae59`.
- **실수 금지:** 독립 `patient/index.html`이 원본과 동일 SHA여도, 그 페이지가 공통 `standalone-comfort.js → comfort-ui.js`를 읽어 드로어 변경 영향을 받음. R13 docs 브랜치에서 모바일 드로어 코드를 찾지 못했다고 누락/미구현 결론 금지.

## 1. 조회·작업 범위 (전면 탐색 금지)
1. 작업 시작 시 각 원격 branch HEAD와 실제 `AGENTS.md`(루트/작업 디렉터리에 **존재하는 것만**) 확인. 없음이면 없음 기록.
2. **필수 먼저 읽기:** `docs/integration/NEXT_CHAT_R13_USER_FRICTION_AND_BM_SHORTLIST_20261023.md`의 6번 절, `docs/research/R13_STATIC_EXPERT_WALKTHROUGH_AND_TEST_MATRIX_v0.2.md`의 실행표, `docs/research/R13_EQUIPMENT_LOCAL_CHROMIUM_VERIFICATION_20261023.md`. 필요 시만 진행자 패킷.
3. **직접 대상:** `prototypes/concepts/equipment-pathways-r13.html`, `prototypes/concepts/tests/test_equipment_pathways_r13.py`; 드로어 브랜치의 `prototypes/integrated-v10/patient/{comfort-ui.js,comfort.css,standalone-comfort.js}`, `prototypes/integrated-v10/tests/patient_mobile_drawer_http.py`, 직접 의존 테스트/화면; 독립 `patient/index.html`.
4. 이미 실행한 4차 전체 개발 재분석, 시장조사/정책 반복 조회, 관계없는 UI 리팩터링, 패키지 교체, 대규모 테스트 재실행은 금지.

## 2. 실행 전략
- **두 기준을 혼합하지 말 것:** R13 docs와 드로어 기능 브랜치를 각각 checkout/worktree하여 개별 검증; 테스트 목적으로 merge/rebase/cherry-pick하지 않는다.
- 가능하면 의존성 추가 없이 이미 설치된 Node/Python/Chromium/Playwright 사용. 설치가 막히면 NOT RUN으로 정확히 기록.
- **R13 목업:** `python prototypes/concepts/tests/test_equipment_pathways_r13.py` (Chromium 실행파일만 있으면 `R13_CHROMIUM=/usr/bin/chromium`); 4경로·질문·이전·초기화·키보드/포커스·320~1440px 넘침·예상치 못한 외부 요청/JS 오류. 추가 필요할 때만 CSS 200% 모사와 실제 브라우저 200%를 구분해 확인.
- **독립 B:** 합성코드 로그인→오늘/일정/문서(PDF)→5탭→모바일 메뉴 열기/닫기·Escape·포커스 복귀·글자 확대→미저장 프로필 이동 방지 확인.
- **연동 B:** 합성 A3 발행 후 B 진입→동일 메뉴/탭·PDF·일정→알림 미저장 이동 취소 보존→발행 버전 변경/철회 후 구버전·타 환자/입원건 노출 없는지 확인.
- **이동 지원:** 실제 목적지가 없으면 가짜 주소/길찾기 생성 X; 택시 준비·보조기구·도착 도움 체크가 예약/기관통지/푸시/결제 완료로 표시되지 않는지 확인.
- 화면: 390·768·1440px, 필요하면 320px + 키보드. 스크린샷/콘솔·실패 재현(상태 포함), 최소 한 번의 실제 브라우저 DOM 조작. 테스트가 이미 존재하면 재사용하고 중복 생성 금지.
- 추가 정적 점검: no PHI, localStorage 시연을 실제 서버 트랜잭션/보안으로 표현 X, 개인정보 외부 전송 X, 실제 공단 급여판정·장비 의료 적합성 자동결정 X. 공공 경로를 민간 상업추천처럼 표시 X.

## 3. 결함 발견 시
- **Confirmed bug** = 재현 경로/원인/스크린샷 또는 로그 있음. **UX hypothesis** = 실제 사용자 이해가 미측정인 예상문제.
- 반복 재현 가능한 **실행 차단/안전 S0·S1**만 독립 `codex/r13-prepilot-audit-20261023` 브랜치에 최소 수정+직접 테스트. 원본 docs/feature/main/gh-pages에는 쓰지 않는다. 두 개발 라인을 결합하지 않는다. 공유 저장·발행 계약이나 승인 UX 변경을 요구한다면 **수정 대신 위험·대안만 보고하고 중단**.
- 단순 문구·상용기능·4경로 구조 변경, 오해 가능성만 근거로 UX 개편 금지. 기존 환자 앱에 콘셉트를 무단 통합하지 않는다.
- 실패 시 관련 파일/로그만 추가 탐색. 무관한 리팩터링 금지.

## 4. 완료 보고 — 딱 이 형식
```text
BASELINES: main SHA / gh-pages SHA / docs SHA / mobile SHA
SCOPE: 본 파일들 + 필요해서 확장한 파일명(사유)
R13 CONCEPT: PASS x/y, FAIL, NOT RUN
STANDALONE B: PASS x/y, FAIL, NOT RUN
A3-CONNECTED B: PASS x/y, FAIL, NOT RUN
SAFETY CONTRACT: PASS / FAIL / NOT VERIFIED (핵심 근거)
CONFIRMED BUGS: 파일:행 + 재현 + 심각도 + 수정 여부
UX HYPOTHESES: 상위 3개만
ENV LIMITS: 실제 기기/Pages/확대 미검증 여부
USER PILOT GATE: TECH-GO / TECH-BLOCKED / INSUFFICIENT + 이유
CHANGES: 브랜치/커밋/바뀐 파일(없으면 none), main·gh-pages 무변경 확인
```
**업무 완수 기준:** 위 항목 누락 없음. 일부 NOT RUN이 존재하면 이유와 최소 재시도 조건 명시. 성능·사용성·임상 검증 완료 주장 금지.

## 5. 관찰 착수 게이트
기술 게이트 `TECH-GO`는 사용자 실험 승인과 같지 않음. 실제 참가자 관찰 전에 지도교수/기관의 해당 활동 IRB·면제 여부 판단, 설명 및 동의, 합성 사례/안전 고지, 비식별 기록·보관·삭제, 사용 기기/화면 버전을 별도로 확정한다. 그때까지는 **조원 내부 리허설만 가능**하며 그것을 실제 사용자 결과로 표기하지 않는다.
