# 4차 후속 UI/UX 정밀 보정 — 2026-10-23 KST

기준: 작업 시작 시 원격 main `691ec107c95d8573d00d1e6a946507990720601f`. 기존 4차 보고서의 계약을 유지하며 `codex/phase4-ux-refinement`에서 작업했다. 관련 경로에 AGENTS.md는 없었다. main·gh-pages·기존 PR·사업계획서 브랜치·배포 설정은 변경하지 않았다.

## 구현과 영향 범위

- 의료진: 항목명 / 판정·실제 등급 / 작은 4칸 지표를 같은 행에 정렬했다. 반복 0–3 숫자와 개별 규칙 펼침을 제거하고 공통 **상세 원천·규칙 보기**로 통합했다. 0은 기준점이며 2등급은 2칸을 채운다. 미평가·상충은 숫자 0으로 치환하지 않는다. 등급은 업무 검토 우선도이며 임상 위험도가 아니다. 계산·원문 근거·규칙 ID는 유지했다.
- 환자 선택: 환자 정보 오른쪽의 240px 선택창으로 압축하고 발행 확인 패널과 상단을 맞췄다. 모바일에서도 카드 높이를 늘리는 별도 행을 없앴다.
- 독립/연동 B 공통: 홈·이전·다음을 사이드바로 옮기고 이전·다음을 접근성 이름과 비활성 상태가 있는 화살표로 표시했다. 모바일에는 본문 상단 이동 버튼과 기존 하단 5탭을 제공한다. 글자 크게·사용 안내는 본문 구분선 아래 우측에 둔다. 중복 내 정보 버튼을 제거하고 통합 홈·독립 예시 링크는 PC 사이드바의 **개발·시연** 안으로 옮겼다.
- 알림: 설정과 알림함을 일반 본문에 통합했다. 시간대, 개인 복약 준비, 확정 외래, 추가 안내, 예정 알림, 최근 내역을 구분하고 기존 계산·저장소·Web Locks·충돌 검사를 재사용했다. 여러 폼 중 한 폼을 저장하거나 글자를 확대해도 다른 미저장 입력을 보존한다. 충돌 시 입력을 유지하고 명시적 **최신 설정 다시 읽기**를 제공한다. 읽기용 최신 내역 갱신은 편집자의 비교·저장 토큰을 갱신하지 않는다.
- 이동/새로고침: 알림·프로필의 미저장 입력과 대기 중 저장을 확인 후 이탈하게 했다. 이탈 취소와 글자 확대 후 입력 유지, 대기 저장 취소를 실제 Chromium에서 검사했다.
- 튜토리얼: 3단계와 실제 상세·일정·알림 이동 연습을 유지했다. 주요 버튼은 최대 2개, 이전·건너뛰기는 보조 링크형 버튼으로 정리하고 반복 대상 다시 보기를 숨겼다. 배경 불투명도를 0.78 → 0.50(기존의 약 64%)으로 낮췄다. 기록·설정은 변경하지 않는다.

수정 중 확인한 실제 연결 결함: 발행본이 없을 때 B의 공통 클릭 처리기가 알림 탭까지 차단했다. 로컬 발행·철회 내역 화면만 진입을 허용하도록 수정했다. 철회된 계획·설정·문서 공개는 계속 차단한다.

변경 소스(9): `patient/index.html`; 통합 경로의 `a3/app.js`, `a3/review-display.js`, `a3/tutorial-tour.js`, `a3/tutorial-tour.css`, `patient/app.js`, `patient/comfort-ui.js`, `patient/comfort.css`, `unified.css`. 테스트(6): `comfort_http.py`, `patient_http.py`, `spotlight_http.py`, `stabilization_http.py`, `phase4_http.py`, 신규 `refinement_http.py`. 원본 hospital-a2/hospital-a3/patient-v13 및 공유 평가·발행·알림 계산/저장 스키마는 변경하지 않았다.

## 실제 검증

Node 24.19 / Python Playwright 1.62 / 실제 headless Chromium 154(`/usr/bin/chromium`) / 로컬 HTTP / 합성 데이터. PASS는 실제 실행 결과다. 재실행은 중복 집계하지 않았다.

| 검사 | 최종 결과 | 증거 |
| --- | --- | --- |
| `npm test` (통합 경로) | PASS 98 | [Node 로그](refinement-verification/node.log) |
| `python3 tests/phase1_http.py` | PASS 17 | [로그](refinement-verification/phase1.log) |
| `python3 tests/unified_http.py` | PASS 14 | [로그](refinement-verification/unified.log) |
| `python3 tests/patient_http.py` | PASS 22개 범위¹ | [전체 실행](refinement-verification/patient.log), [수정 후 재검사](refinement-verification/patient-retest.log) |
| `python3 tests/comfort_http.py` | PASS 15 | [로그](refinement-verification/comfort.log) |
| `python3 tests/spotlight_http.py` | PASS 10 | [로그](refinement-verification/spotlight.log) |
| `python3 tests/stabilization_http.py -f` | PASS 8 | [로그](refinement-verification/stabilization.log) |
| `python3 tests/phase4_http.py` | PASS 8개 범위¹ | [전체 실행](refinement-verification/phase4.log), [수정 후 재검사](refinement-verification/phase4-retest.log) |
| `python3 tests/refinement_http.py` | PASS 6 | [로그](refinement-verification/refinement.log) |

¹ `patient_http.py` 전체 실행은 21 PASS / 1 ERROR(이동한 개발 전용 링크를 모바일 헤더에서 찾던 검사), `phase4_http.py`는 7 PASS / 1 FAIL(팝업 닫기 대신 오늘 탭으로 이탈한 뒤 알림 화면을 찾던 검사)이었다. 새 UI의 실제 경로로 테스트를 수정한 뒤 각각 같은 실패 검사를 재실행하여 PASS했다. 기존 데이터·저장·공개 안전 조건은 완화하지 않았다. 초기 알림 철회 진입 FAIL과 스크롤 애니메이션 완료 전 좌표를 읽던 검사도 수정했고 comfort 15개, stabilization 8개를 다시 실행하여 전부 PASS했다.

최종 중복 제외: **Node 98 + Chromium 100 = 198개 PASS**, 미해결 FAIL 없음. 6영역·30항목 계산 동등성, SYN 시나리오, 승인·발행·개정·철회, 환자·입원건·발행 버전 격리, 저장 실패·손상·다른 탭 충돌, PDF 열람/다운로드, 이해 확인, 지도 링크 계약, 내비게이션·새로고침·터치·키보드, 튜토리얼 전후 local/session 저장소 불변을 포함한다. 390/768/1024/1440px 및 큰 글자, CDP 200% 확대를 검사했고 콘솔·런타임 오류도 검사했다.

## 화면 비교

동일 SYN-002, 기본 글자, 390/1440×950, 새 브라우저 문맥에서 기준 main과 작업본을 각각 HTTP로 실행해 전후 **28장**을 캡처했다. 독립 B는 같은 독립 합성 예시를 사용했다. 의료진은 동일하게 기능 영역에서 보행 ‘보조기 사용’을 선택했다. 스크린샷을 열어 PC·모바일에서 비교했다. 아래는 대표 쌍이며 같은 폴더에 두 B의 홈·알림·튜토리얼 전체 쌍이 있다.

| 화면 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 의료진 PC | [전](refinement-verification/before-hospital-1440.png) | [후](refinement-verification/after-hospital-1440.png) |
| 의료진 모바일 | [전](refinement-verification/before-hospital-390.png) | [후](refinement-verification/after-hospital-390.png) |
| 연동 B PC 홈 | [전](refinement-verification/before-connected-home-1440.png) | [후](refinement-verification/after-connected-home-1440.png) |
| 독립 B 모바일 홈 | [전](refinement-verification/before-independent-home-390.png) | [후](refinement-verification/after-independent-home-390.png) |
| 연동 B 모바일 알림 | [전](refinement-verification/before-connected-reminders-390.png) | [후](refinement-verification/after-connected-reminders-390.png) |
| 연동 B 모바일 튜토리얼 | [전](refinement-verification/before-connected-tour-390.png) | [후](refinement-verification/after-connected-tour-390.png) |

헤더 버튼 밀집과 환자 선택의 별도 행, 등급 숫자·펼침 반복을 줄였다. 알림 화면은 모달 스크롤 대신 문서 스크롤로 바뀌어 캡처 높이가 길어진다. 색상·정보·기능을 유지하며 가로 넘침과 튜토리얼 화면 이탈을 자동 검사했다.

## 한계와 실행

- NOT RUN: 실제 모바일 기기, Safari/Firefox, 스크린리더, 배포 사이트 검증. 배포는 수행하지 않았다.
- NOT VERIFIED: 카카오맵 외부 서비스의 실제 길찾기 결과. 공식 링크·새 창·연결 실패 안내는 응답 가로채기로 검사했다.
- 알림은 앱 전경 localStorage 시연이다. 실제 인증·서버 트랜잭션·백그라운드 푸시·카카오톡 발송을 구현하거나 보장하지 않는다. 이미 내려받은 PDF는 철회 후 회수할 수 없다.

저장소 루트에서 `python3 -m http.server 8000`. 병원은 `/prototypes/integrated-v10/a3/index.html?screen=plan&patient=SYN-002`, 독립 B는 `/patient/index.html`(합성 로그인 `CARE2026`). 연동 B는 A3에서 검토 요청 → 지정 최종 승인자 → 승인 → 발행 후 `/prototypes/integrated-v10/patient/index.html?patient=SYN-002&encounter=ENC-SYN-002-DEMO`로 접근한다.
