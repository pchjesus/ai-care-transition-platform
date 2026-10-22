# 4차 UI/UX·업무 흐름 개선 — 2026-10-23

기준: main `975e1e9cc9ca6419b76f599b748a8ceb08300827`. 독립 브랜치: `codex/phase4-workflow-ux`.
3차 결과는 참고 기준으로만 사용하고 아래 검사를 이번에 실제 실행했다. 관련 AGENTS.md는 없었다.

## 구현과 보존 계약

- **등급**: 4칸(0~3)에서 0은 비충전 기준점, 2등급은 1·2칸만 채움. 숫자·기존 판정·입력 근거·접근성 설명을 함께 유지했다. 결측·상충은 확정 0등급으로 표시하지 않는다. A2의 등급은 업무 검토 우선도이며 임상 위험도나 퇴원 허가 점수가 아니다. 기존 엔진·6영역·30항목·계산 규칙 변경 없음.
- **의료진 상단**: 환자 선택을 환자 정보와 같은 카드 안에 배치하고 입원건, 평가 확정 영역, 우선 검토, A2 변경 반영 여부를 함께 표시한다. 오른쪽 발행 확인 카드와 패딩·높이를 정렬했다. 초안/승인/발행 버전은 기존 상태 표시를 재사용한다.
- **확인사항**: 기존 `blockers()` 결과 전체를 발행 차단 사항으로 그대로 표시한다. 확정 3등급 영역은 별도 우선 검토 항목, 평가/문서 대조 안내는 참고 항목으로 구분하고 실제 검토 위치로 연결한다. 분류가 승인 조건을 낮추거나 검토를 자동 완료하지 않는다.
- **근거**: 선택지 설명과 한글 영역/항목 이름을 우선 표시한다. `function.gait.device` 등 원본 식별자·규칙·출처 연결 코드는 펼침 영역에 보존했다. A3 근거에서 해당 A2 원 입력으로 이동하고 평가 ID·규칙·미반영 변경을 확인할 수 있다.
- **이동 보호**: 이동 전에 초점이 남은 평가/계획 입력의 기존 저장 처리를 마친다. 저장 실패 시 내부 이동·환자 변경·홈 이동을 중지하고, 브라우저 이탈 시 경고한다. 실제 브라우저 뒤로/앞으로 이동 후 입력 복원도 검사했다. 실패한 변경은 기존 계약대로 저장 전 값으로 복원되며 재입력이 필요하다. 새 임상 초안 저장 스키마나 별도 자동 복구 버퍼는 도입하지 않았다.
- **두 B 공통**: 내 정보 위에 알림 탭을 추가했다. 설정/내역/예정 알림을 구분하고 기존 모달·저장소·발행본별 설정을 재사용한다. 모바일은 오늘·일정·도움·알림·내 정보 5개 탭이다. 연결 B는 기존 session 경로 복원에 새 탭을 포함한다. 독립 B의 새로고침 후 홈 진입 동작은 유지하고 저장한 알림은 다시 열어 복원한다.
- **홈·문서**: 중앙의 알림/문서/사용 안내 버튼 묶음과 중복 개인 알림 버튼을 제거했다. 외래 알림 설정은 외래 카드에서 계속 바로 연다. 사용 안내는 외래 카드 우상단, 문서는 더 자세한 설명/전체 안내와 개별 상세 과업에서 접근한다. 두 상단 카드의 높이와 오늘 확인할 안내의 위계를 정리했다.
- **환자 튜토리얼**: 3단계 안에 선택형 화면 이동 연습을 추가했다. 오늘 항목→상세, 일정 탭→확정/확인 중 구분, 알림 탭→설정/내역이다. 강조 영역 또는 말풍선의 버튼이 안전한 화면 표시 브리지를 호출한다. 실제 퀴즈·읽음·저장·승인·설정 버튼을 대신 실행하지 않는다. 이전/다음/건너뛰기/종료/Escape·누락 대상 대안·복귀와 병원 10단계는 보존했다.

A3 workflow/storage, A2 engine/data, publication 및 알림 계산/저장소 스키마는 변경하지 않았다. 환자·입원건·발행 ID·버전·공개 범위·다중 근거·직종별 검토·개정·철회·철회 요청은 기존 코드 경로를 유지한다. 테스트는 기존 공개/저장 안전성 검사를 삭제하거나 조건을 완화하지 않았다.

## 확인한 결함과 수정

첫 알림 전체 실행에서 기존 동시 탭 오류 안내 검사 1건이 실패했다([초기 결과](phase4-verification/comfort-initial-failure.log)). 이는 3차 보고서에도 기록된 간헐 메시지 실패다. 단독 반복 5회는 통과하여 그 실패의 정확한 브라우저 이벤트 순서를 소급 확정하지는 못했다.

별도로 **Web Locks 완료 Promise를 지연하면, 콜백이 이미 저장 실패를 확인해도 UI는 계속 저장 중으로 남음**을 결정적으로 재현했다([수정 전 FAIL](phase4-verification/delayed-failure-before.log)). 실패 안내를 콜백 시점에 표시하고, 성공 여부를 명시적으로 반환하여 실패 후 성공 안내로 진행하지 않게 했다([동일 검사 수정 후 PASS](phase4-verification/delayed-failure-after.log)). 원래 CAS 비교·잠금·발행본/화면 소유 확인·실패 시 기존 자료 보존·편집값 보존 조건은 그대로다. 이후 영향받는 전체 알림/안정화 검사를 재실행했다. 이 보강이 앞선 간헐 실패와 동일한 원인이었다고 단정하지 않는다.

## 실제 검증 결과

| 이번 실행 명령 (`prototypes/integrated-v10/`) | 최종 결과 | 로그 |
|---|---:|---|
| `npm test` | PASS 98 / FAIL 0 | [Node](phase4-verification/node.log) |
| `python3 tests/comfort_http.py` | PASS 15 / FAIL 0 | [알림·PDF·지도·환자 튜토리얼](phase4-verification/comfort.log) |
| `python3 tests/patient_http.py` | PASS 22 / FAIL 0 | [환자 B](phase4-verification/patient.log) |
| `python3 tests/spotlight_http.py` | PASS 10 / FAIL 0 | [병원 튜토리얼](phase4-verification/spotlight.log) |
| `python3 tests/unified_http.py` | PASS 14 / FAIL 0 | [병원 통합](phase4-verification/unified.log) |
| `python3 tests/phase1_http.py` | PASS 17 / FAIL 0 | [평가 인계](phase4-verification/phase1.log) |
| `python3 tests/stabilization_http.py` | PASS 8 / FAIL 0 | [저장·발행·알림 안정화](phase4-verification/stabilization.log) |
| `python3 tests/phase4_http.py` | PASS 8 / FAIL 0 | [4차 UX·안전 회귀](phase4-verification/phase4.log) |

고유 최종 결과: **192 PASS / 0 FAIL** (Node 98 + Chromium 94). 집중 검사 후 전체 관련 검사, 추가 문구/CSS 변경 뒤 [레이아웃 2건](phase4-verification/layout.log)과 [원천자료·인쇄 1건](phase4-verification/source-print.log)도 통과했다. 최종 알림 저장 UI 변경 후 4차·알림·안정화 전체를 재실행했으며, 다른 통과 검사는 이 변경의 영향을 받지 않는다.

신규 검사: 등급 칸 수/미확정 상태, 차단 항목 ID의 기존 계산과 완전 일치, 환자·입원건 전환, 카드 정렬, 저장 실패 이동 차단, 실제 브라우저 뒤로/앞으로, 두 B의 알림 저장·복원·내부 이전/다음, 3단계의 상세/일정/알림 이동 연습, 키보드/터치, 튜토리얼 전후 localStorage/sessionStorage 바이트 불변, 저장 완료 지연 시 오류 표시.

기존 검사는 A2 계산 동등성·SYN-003 결측/상충·SYN-004 실습, 승인·발행·개정·철회·철회 요청, PDF 정확한 바이트/분류/미검토 차단/누락, 환자별 프로필·이해 확인 격리·XSS, 저장 실패·동시 탭·브라우저 재시작, 지도 URL·새 창·실패 대안을 포함한다. 인쇄 호출은 검사하되 물리적 출력 성공을 주장하지 않는다.

환경: Node 24.19.0 / Playwright 1.62.0 / 실제 Chromium 154, 로컬 HTTP. 390/768/1024/1440px, 큰 글자, 200% visual zoom, 키보드/터치 에뮬레이션. 콘솔·런타임 오류도 검사한다. 추가 CSS·문구 변경 뒤 카드 정렬/글자 확대와 원천자료/인쇄 영향 범위를 별도 재검사했다. 반복 검사는 중복 합산하지 않는다.

대표 화면은 기준 커밋을 임시 폴더로 export하여 동일 합성 환자·발행 상태·너비·기본 글자 조건으로 촬영한 후 직접 비교했다.

| 화면 | 변경 전 | 변경 후 |
|---|---|---|
| 의료진 상단 1440px | [원본](phase4-verification/before-hospital-1440.png) | [통합 카드](phase4-verification/after-hospital-1440.png) |
| 연동 B 390px | [원본](phase4-verification/before-connected-home-390.png) | [홈 정리](phase4-verification/after-connected-home-390.png) |
| 연동 B 1440px | [원본](phase4-verification/before-connected-home-1440.png) | [2열 정렬](phase4-verification/after-connected-home-1440.png) |
| 독립 B 390px | [원본](phase4-verification/before-independent-home-390.png) | [홈 정리](phase4-verification/after-independent-home-390.png) |
| 독립 B 1440px | [원본](phase4-verification/before-independent-home-1440.png) | [2열 정렬](phase4-verification/after-independent-home-1440.png) |

[2등급 데스크탑](phase4-verification/assessment-2-desktop.png) · [모바일 판단 패널](phase4-verification/assessment-2-mobile.png) · [큰 글자 알림 메뉴](phase4-verification/independent-notifications-large.png) · [모바일 실제 항목 강조](phase4-verification/connected-tour-390.png).

## 변경 범위·실행·제한

- 의료진: `a3/{app.js,index.html,review-display.js,tutorial-tour.js,tutorial-tour.css}`, `unified.css`.
- 환자: `patient/index.html`(독립 B), `prototypes/integrated-v10/patient/{app.js,comfort-ui.js,comfort.css}`.
- 검사: `a3/tests/review-display.test.js`, `tests/phase4_http.py`; 기존 comfort/stabilization/release 검사에는 홈 단축 버튼 대신 새 알림 탭으로 이동하는 도우미를 반영했다. 기존 데이터/오류 기대값은 유지했다. release 검사는 이번에 배포하지 않았으며 실행 결과에 합산하지 않았다.

저장소 루트에서 `python3 -m http.server 5500` 후 `/prototypes/integrated-v10/a3/index.html?screen=patients` 또는 `/patient/index.html`. 연결 B는 같은 출처에서 합성 계획을 승인·발행한 후 연다. 시연 코드는 CARE2026이며 실제 인증이 아니다.

- **NOT RUN**: 실기기·Safari·Firefox·스크린리더·실제 프린터·R13 사용자 시험. 200% 검사는 Chromium의 visual viewport 확대이며 모든 OS 확대 조합을 검증한 것은 아니다.
- **NOT VERIFIED**: 카카오맵 실서버/실제 앱 설치·미설치 분기. 이번 검사는 공식 URL과 브라우저 동작·실패 대안을 확인하는 로컬 제어 검사다.
- 공개 사이트의 새 UI는 **NOT RUN**: 이번 변경을 배포하지 않았다. 알림톡·웹 푸시·택시·EMR·실제 기관 전송·서버 인증은 미구현 상태를 유지한다. localStorage와 Web Locks는 실제 서버 보안·기기 간 동기화·백그라운드 발송을 보장하지 않는다.
- 동시 탭 간헐 메시지 실패의 원래 실행 순서는 미확정이다. 결정적 지연 검사와 최종 원래 회귀 결과를 구분하며 실기기·느린 탭 전환에서도 후속 관찰이 필요하다.

브랜치만 일반 push로 전달한다. 새 PR은 생성하지 않는다. 원격 main `975e1e9cc9ca6419b76f599b748a8ceb08300827`, gh-pages `fe58d210ac0bfe8bd4f3c7b158c8b0d1b6dda436`을 변경하지 않는다. 기존 PR #1~#4·사업계획서 브랜치·배포 설정은 수정하지 않는다.

[브랜치 변경 비교](https://github.com/pchjesus/ai-care-transition-platform/compare/main...codex/phase4-workflow-ux)


## 4차 배포 후속 기록 — 2026-10-23

사용자의 명시적 배포 요청에 따라 독립 개발 브랜치 `codex/phase4-workflow-ux`의 검증된 구현을 `main`에 fast-forward 반영하고, `gh-pages`에 실행 파일만 선택 배포했다.

- 런타임 기준 `main`: `de85a0c17beea082af26a9c998f5a031e543385f` (이 기록을 추가하는 후속 문서 커밋과 구분).
- `gh-pages`: `6e3303b4742bc9bff093044520ea73c134e73caf`, 이전 `fe58d210ac0bfe8bd4f3c7b158c8b0d1b6dda436`에서 일반 fast-forward.
- **PASS (Git 객체 검증)**: 실행 파일 48개 중 변경 파일 9개 교체·신규 `review-display.js` 1개 추가, 나머지 38개 동일 Git blob 유지. 기존 배포 파일 삭제 0개, 새 배포 트리에서 10개 교체·추가 파일 모두 원본과 blob SHA 동일. 시작·비교·기존 A2/A3 별칭, `.nojekyll` 보존. `release-manifest.json` 갱신(기준 실행 커밋·이전 Pages 커밋 및 71개 파일).
- **PASS (원격 상태)**: `main`과 `gh-pages` HEAD를 GitHub에서 다시 읽어 반영 확인하고, `gh-pages`의 `release-manifest.json` 원격 내용도 확인했다.
- **PASS (기존 Codex 실행 기록)**: 4차 개발에서 Node 98/98 + Chromium 94/94. 배포 작업에서 자동화 테스트를 새로 실행하지 않았으므로 배포 후 독립 실행 PASS로 재표현하지 않는다.
- **NOT VERIFIED**: GitHub Pages CDN 게시 완료, 공개 URL의 실제 브라우저 렌더링·사용자 상호작용. 공개 주소 직접 열기를 시도했지만 접근 도구의 캐시 실패/접근 제한으로 확인하지 못했다. 정적 원격 Git 객체 검증과 구분한다.
- 기존 PR #1~#4·사업계획서 브랜치·GitHub Pages 배포 설정은 변경하지 않았다. 추가 제안이었던 알림 아이콘 구분과 일부 이전·다음 이동 보호 경로 개선은 이번 배포 범위에 포함하지 않았다.

공개 URL: https://pchjesus.github.io/ai-care-transition-platform/
