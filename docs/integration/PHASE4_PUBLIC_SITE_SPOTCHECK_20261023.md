> **역사적 4차 기준 문서:** 이후 5차 직접 공개 사이트 검증은 [PHASE5_QA_REFACTOR_AND_R13_READINESS_20261023.md](./PHASE5_QA_REFACTOR_AND_R13_READINESS_20261023.md)를 우선 참고하세요.

# 4차 GitHub Pages 공개 사이트 스모크 점검 및 현장 확인표 — 2026-10-23

상태: **부분 검증**. 프로젝트: 케어브릿지랩. 신규 코드 패치 없음. 본 문서는 검증되지 않은 항목을 PASS로 처리하지 않는다.

## 1. 정확한 기준

- 기준 원격 `main` HEAD: `3daa92577256a5d3fbc616d7c6373d175f3ed547`
- 4차 최종 실행 코드: `cbe1868afb922417b80808f9faf019ec8dabe5f1`
- 배포 `gh-pages` HEAD: `6f6da8ab5550164e74e1d353ca5c1b298f0abf47`
- Pages `release-manifest.json`: `sourceCommit=cbe1868afb922417b80808f9faf019ec8dabe5f1`
- 기존 4차 최종 회귀: Node 98개 범위 PASS / Chromium 최종 39개 고유 범위에서 미해결 실패 없음. 최종 137개를 하나의 단일 실행으로 돌렸다는 뜻 아님.
- 이 점검에서는 기존 로컬 테스트 재실행이나 새 코드 변경을 수행하지 않았다.

## 2. 이번 채팅에서 직접 확인한 사실

| 항목 | 상태 | 확인한 내용과 경계 |
| --- | --- | --- |
| 원격 브랜치 HEAD | PASS | GitHub API에서 main 및 gh-pages 현재 커밋을 읽음 |
| Pages 배포 파일 무결성 | PASS | 메인 소스와 gh-pages의 **변경 실행 파일 9개**가 Git blob SHA로 전부 일치, 누락 0 |
| `gh-pages` 매니페스트 | PASS | 4차 최종 실행 코드 커밋을 가리킴 |
| 실제 공개 독립 B 로그인 화면 | PASS(표시 확인만) | 연결된 브라우저의 `https://pchjesus.github.io/ai-care-transition-platform/patient/index.html` 탭에서 가상 환자 접속 안내, 체험 코드 `CARE2026`, 안내 시작 버튼 텍스트를 확인 |
| 공개 Pages HTTP 상태코드·정적 자원·캐시 | NOT VERIFIED | 외부 HTTP 검사 도구는 Pages URL 읽기에 실패. GitHub 원본 조회로 대체하지 않음 |
| 독립 B 로그인 후 오늘/일정/알림/PDF/도움/큰 글자 | NOT RUN | 연결된 브라우저는 읽기 전용이며 실제 클릭·저장 조작은 하지 못함 |
| A2/A3 4칸 지표/240px 선택창·승인·발행/연동 B | NOT RUN | 배포 소스 일치만 확인. 화면 조작 검사는 미수행 |
| 실제 모바일 기기·Safari·Firefox·스크린리더 | NOT RUN | 기기/환경 직접 검증 미수행 |
| 외부 카카오맵 경로 | NOT VERIFIED | 외부 지도 결과를 검사하지 않음 |

변경 9개: `patient/index.html`, `prototypes/integrated-v10/a3/app.js`, `review-display.js`, `tutorial-tour.js`, `tutorial-tour.css`, `prototypes/integrated-v10/patient/app.js`, `comfort-ui.js`, `comfort.css`, `prototypes/integrated-v10/unified.css` (상대 경로는 각 디렉터리에 따름).

## 3. 운영자의 실제 브라우저 스모크 체크 — 아직 미수행

**원칙:** Chrome 새 프로필 또는 시크릿 창에서만 합성 테스트. 실제 개인정보 입력 금지. 기존 개인 브라우저의 로컬 저장소를 무단 초기화하지 않는다. PC와 모바일을 별도 표시한다.

| ID | 공개 경로 / 시나리오 | 합격 조건 | 결과 |
| --- | --- | --- | --- |
| PUB-01 | [메인 홈](https://pchjesus.github.io/ai-care-transition-platform/) | 메인 카드·독립 B·A1~A3 진입 링크 표시, 404 및 주요 자원 누락 없음 | NOT RUN |
| PUB-02 | [독립 B](https://pchjesus.github.io/ai-care-transition-platform/patient/index.html), `CARE2026` | 가상 로그인 → 홈/오늘 진입, 데모 개인정보 경고 | NOT RUN |
| PUB-03 | 독립 B의 모바일 5탭, 글자 크게·사용 안내·튜토리얼 | 터치·확대·뒤로·홈·안내 모두 작동, 내용 잘림 없음 | NOT RUN |
| PUB-04 | B 알림 종 → 개인 준비/외래/최근 내역 | 3개 펼침 그룹, 부가 설정, 알림 저장·재열기·미저장 보호 표시 | NOT RUN |
| PUB-05 | B 일정·PDF·도움 | 링크 및 PDF가 새로 열리고, 합성 정보만 보임 | NOT RUN |
| PUB-06 | [A3 통합](https://pchjesus.github.io/ai-care-transition-platform/prototypes/integrated-v10/a3/index.html?screen=plan&patient=SYN-002) | 6영역·30항목 원래 규칙, 업무 우선도 0~3 등급의 4칸 표시, 공통 상세, 240px 환자 선택 | NOT RUN |
| PUB-07 | A3 합성 환자 SYN-002 검토 요청→최종 승인자 승인→발행 | 미발행/발행/철회 상태가 구분되고 의료진 승인 전 계획 환자 공개 없음 | NOT RUN |
| PUB-08 | [연동 B](https://pchjesus.github.io/ai-care-transition-platform/prototypes/integrated-v10/patient/index.html?patient=SYN-002&encounter=ENC-SYN-002-DEMO) | 동일 브라우저 발행본만 열람. 미발행·철회된 계획, 잘못된 환자/입원건 접근 차단 | NOT RUN |
| PUB-09 | PC Chrome + Android Chrome에서 새로고침·탭 간 저장 충돌 | 의도한 미저장 보호·재읽기·데이터 분리 유지, 실제 에러 메시지 기록 | NOT RUN |

**점검 기록란** — 날짜/시간: ____; 브라우저·버전: ____; 기기/뷰포트: ____; PUB ID: ____; 기대 결과: ____; 관찰: ____; PASS/FAIL/NOT RUN: ____; 재현 경로: ____; 스크린샷 파일(합성 정보만): ____.

캐시/서비스 워커 의심 시 먼저 동일 URL의 새 시크릿 프로필을 확인하고, 브라우저 개발자 도구 Network/Console에서 요청 실패 및 로드 파일을 검사한다. 로컬 파일·GitHub 소스와 화면 차이가 있어도 바로 배포 결함이라고 단정하지 않는다.

## 4. 후속 판단

- 실제 브라우저 PASS 결과가 모두 확보되기 전에는 **공개 사용성 최종 검증 완료**라고 표현하지 않는다.
- 화면에서 재현 가능한 결함이 발견되면 재현 조건·기대 동작·스크린샷을 기록한 뒤 독립 수정 브랜치에서 최소 수정과 관련 회귀만 검토한다.
- 별도 R13 파일럿은 승인받은 안전한 합성 시나리오 및 실제 브라우저 스모크 PASS 이후 착수한다.
- `main`, `gh-pages`, PR, 개발 UI/데이터/승인 계약은 이번 작업에서 수정하지 않는다.
