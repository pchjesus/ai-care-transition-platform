# 케어브릿지랩 5차 기능 전수 점검·리팩토링 검토·R13 준비 기록

기준일: 2026-10-23 KST · 평가 상태: **자동화 QA 완료 / 실제 사용자 파일럿 미실시**
저장소: `pchjesus/ai-care-transition-platform` (합성 데이터 기반 대학생 창업 MVP)

## 1. 기준·범위

- 검증 대상 실행 소스 `main`: `898bd1e2fe8b0568b308c4bda996eb21413e5f69`.
- 검증 대상 공개 `gh-pages`: `da24d7329865e1380fb5e6e8090cc35c1ebce227`.
- 이번 후속 변경은 **테스트, QA 기록, 사용성 파일럿 자료**에 한정한다. A1/A2/A3/B 실행 소스 및 승인·저장·발행·철회 안전 계약 변경 없음.
- 개발 검증은 직접 GitHub Actions의 Node/Chromium으로 수행함. **Codex 에이전트를 직접 실행한 것으로 기록하지 않음.**

## 2. 최종 검증 결과

| 계층 | 검사 | 결과 | 증거 및 제한 |
| --- | --- | --- | --- |
| Node | 공유 평가·상태·발행·알림·저장 단위 테스트 | **98/98 PASS** | run [39839768809](https://github.com/pchjesus/ai-care-transition-platform/actions/runs/39839768809) |
| Chromium | phase1 17, unified 14, patient 22, comfort 15, spotlight 10, stabilization 8, phase4 8, refinement 8 | **고유 102개 검사 범위 PASS** | runs [39836533297](https://github.com/pchjesus/ai-care-transition-platform/actions/runs/39836533297), [39836962075](https://github.com/pchjesus/ai-care-transition-platform/actions/runs/39836962075), [39838726709](https://github.com/pchjesus/ai-care-transition-platform/actions/runs/39838726709), [39839768809](https://github.com/pchjesus/ai-care-transition-platform/actions/runs/39839768809) **분산·부분 재검사**. 단일 마지막 일괄 실행 아님 |
| 배포본 무결성 | 변경 및 기존 Pages 런타임, 상대 참조 | **48 파일 + 133 의존 경로 PASS** | run 39839768809 |
| 배포본 Chromium | 실제 Pages 파일을 같은 프로젝트 URL 접두사로 로컬 서빙 | **3/3 PASS** | run 39839768809; **공개 URL 직접 접속과는 구분** |
| 실제 공개 URL HTTP | 랜딩, 독립 B, A3, 변경된 CSS/JS 등 7개 URL GET | **PASS** | run [39840854352](https://github.com/pchjesus/ai-care-transition-platform/actions/runs/39840854352) |
| 실제 공개 URL Chromium | A2/A3 영역·등급 화면, 독립 B 로그인·알림 카드 너비 | **2/2 PASS** | 진료자 화면: 39840854352; 환자용: [39841089580](https://github.com/pchjesus/ai-care-transition-platform/actions/runs/39841089580), **분산 재검사** |
| 실제 휴대전화/Safari/Firefox/스크린리더 | 물리 기기·다른 엔진 및 보조공학 | **NOT RUN** | 기존 Chromium 에뮬레이션과 다름 |
| R13 고령 사용자·보호자 관찰 | 실제 사람 대상 과업 시행 | **NOT RUN** | 동의/IRB 검토 및 참가자 모집 필요 |

**주의:** 이 테스트 건수는 개별 유닛·브라우저 테스트/검증 경로의 수이지, 임상 효과·개인정보 보호·의료기관 인증에 대한 실증 수치가 아님.

## 3. 실패 이력과 조치

1. 최초 CI는 검증 전용 PDF 패키지 `fitz`(PyMuPDF) 미설치로 중단. 검증 환경에 의존성 추가, 통과 구간 재실행 생략.
2. 사용자가 요청해 제거한 외래 알림 CTA를 예전 테스트 두 곳에서 클릭하던 **검사 경로 오류**: `comfort_http.py`, `refinement_http.py`를 실제 '알림 탭 → 외래 알림 설정' 경로로 교정하고 해당 검사를 재실행해 PASS.
3. 공개 URL 직접 검사에서 1440px의 숨겨진 모바일 하단 메뉴를 클릭하던 **스모크 테스트 선택자 오류**: 화면에 표시되는 내비게이션만 선택하도록 수정 후 PASS.
4. 위 결함은 테스트·검증 환경 오류로 재현됐고 실행 소스의 수정 필요성이 확인되지 않았다. 다만 검증에 포함되지 않은 환경의 무결성을 보증하지 않는다.

## 4. 리팩토링 후보 검토(제안, 구현 아님)

| 후보 | 관찰 | 위험·권고 |
| --- | --- | --- |
| `prototypes/integrated-v10/unified.css` | 레이아웃 오버라이드 및 반응형 규칙이 누적됨 | **중간 우선**. A2/A3 도메인 카드·공통 상단 컨텍스트·환자 도구 규칙을 주제별로 정리할 가치 있음. CSS 단위 교체 시 390/768/1024/1440px와 확대·키보드 회귀 필수 |
| `prototypes/integrated-v10/a3/app.js` | 약 91KB의 화면·라우팅·편집/검토 동작 집중 | **중·장기**. 렌더링/페이지 도우미만 안전하게 분리 검토. approval/publish/revoke, 이전 발행본/수정 이력, 환자/입원건 격리는 그대로 |
| `prototypes/integrated-v10/patient/comfort-ui.js` | 알림 입력/수정·포커스·문서·내비게이션 표시가 한 파일에 밀집 | **중·장기**. 순수 뷰 표시/컴포넌트 분리 가능. 미저장 보호·다중 탭·시간대/DST·알림 오인 방지 손상 위험 높음 |
| `patient/index.html` | 약 333KB의 독립 환자용 HTML/CSS/JS 결합 | **중·장기**. 파일 분리로 유지보수 용이. 로그인·로컬 데이터 하위 호환·정적 Pages 경로 검증 전제 |

**결론:** 현 시점 대규모 리팩토링은 **보류**. R13 첫 사용자 관찰 전 화면 변동을 늘리지 않는 것이 더 합리적이다. 먼저 실제 과업 방해 요인을 수집하고, 확인된 문제와 연결되는 CSS/표시 계층을 작은 독립 변경으로 개선한다. 앱의 평가엔진·승인계약·저장 로직 변경 제안은 현재 근거 없음.

## 5. R13 사용자 관찰 전 조건

- 사용자용 과업·중립 질문·기록지는 `docs/research/R13_PATIENT_CAREGIVER_USABILITY_PILOT_v0.1.md` 및 `R13_MODERATOR_FIELD_SHEET_20261023.md` 참조.
- 첫 탐색적 라운드는 **5~8명 잠정 목표**, 고령 사용자와 성인 보호자 경험자를 구분한다. 통계적 일반화·임상효과 주장 금지.
- 평가 시작 전 소속 기관/지도교수의 연구윤리 심의·면제 필요 여부 판단 및 참여 동의·중단·자료 취급 절차 확정. 실제 환자정보는 사용하지 않는다.
- 시험 전 참가자별 합성 브라우저·가상 사례/정답표 고정 및 진행자 내부 리허설. 실제 단말 터치/큰 글자/PDF/알림 확인.
- 의료진 승인 미발행 정보/철회본, 실제 예약/처방·백그라운드 푸시·보호자 권한을 존재하는 기능처럼 설명하지 않는다.
- 다음 단계는 **실제 사람 관찰**, 기술적 PASS를 사용자 이해도나 접근성 인증으로 대신하지 않는다.

## 6. 운영·보존 조건

- `main`에는 이번 검증의 **테스트 경로 정정 및 문서**, `workflow_dispatch` 공개 URL 재검증 워크플로만 추가할 수 있다.
- 실행 중인 A1/A2/A3/B, 원본 평가 규칙, 상태 저장 및 환자 발행 계약은 변경하지 않는다.
- `gh-pages`는 실행 파일이 바뀌지 않는 한 재배포하지 않는다.
- 자동화 검증 PASS와 사용자 실측 NOT RUN을 별도 표기한다.

## 참고

- World Wide Web Consortium. (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/
- World Wide Web Consortium. (2024). *Involving users in evaluating web accessibility*. https://www.w3.org/WAI/test-evaluate/involving-users/
