# 케어브릿지랩 3차 통합 안정화·배포 검증 — 2026-10-22

기준 main: `931fca4d105355ac2870baeabb19936a5355e9b1` · 기존 Pages: `00eed8d43f0af54137c9cadfab61c4d4bd0f3b68`.
합성 데이터 전용 로컬 MVP. 이전 170 PASS는 이번 결과에 합산하지 않았다.

## 실제 수정

| 확인된 문제 | 원인 및 최소 수정 | 증거 |
|---|---|---|
| 열린 알림함에 다른 탭에서 끈 개인 알림이 남음. 저장소가 손상돼도 이전 알림이 표시됨 | 알림함이 캐시한 설정을 다시 사용함. storage/전경 갱신에서 최신 설정을 읽고 손상 시 안내 및 안전한 빈 상태 표시 | [수정 전 FAIL](phase3-verification/reproduced-reminder-failures.log), 신규 Chromium 재현 테스트 |
| 시간이 지나도 설정창의 예정 알림이 남음 | 전경 tick이 설정창의 파생 목록을 갱신하지 않음. 별도 읽기 전용 저장소로 목록만 재계산하며 미저장 입력·포커스·편집 저장소의 충돌 감지 토큰 유지 | 동일 재현 로그, 입력/포커스/저장 불변 및 다른 탭 덮어쓰기 차단 테스트 |
| 동시 탭 저장 실패 메시지가 뒤늦은 이벤트에 덮임 | 저장 충돌 뒤 도착한 storage 이벤트가 오류 안내를 교체함. 실패 메시지를 보존하고 실제 저장 거부·미저장 입력 유지도 검증 | [수정 전 FAIL](phase3-verification/reproduced-concurrent-notice-failure.log), 지연 이벤트 회귀 검사 |
| v1.9 다음 v1.10을 새 발행으로 표시 | parseFloat 비교가 소수 버전을 잘못 정렬함. 숫자 major/minor 비교로 개정·재발행 표시 수정 | [수정 전 FAIL](phase3-verification/reproduced-version-failure.log), Node 회귀 테스트 |
| 390px에서 200% 확대 시 알림 모달이 보이는 화면 밖으로 나감 | layout viewport만 기준으로 너비 계산. visualViewport 크기·이동·키보드에 맞춰 모달 배치하고 확대 해제 시 기존 스타일 복원 | [수정 전 FAIL](phase3-verification/reproduced-zoom-failure.log), Chromium CDP 200% 경계·가로 넘침 검사 |
| Pages 시작 화면의 /favicon.ico 404 | 배포 전용 시작·비교 화면에 아이콘 지정이 없음. 기존 페이지 내용·주소를 보존하고 빈 data favicon 명시 | 실제 Chromium 콘솔의 /favicon.ico 404 재현, 배포 트리 E2E |

시간대는 `한국 시간(서울, UTC+9)` 등 지역 이름과 실제 오프셋으로 표시한다. 브라우저에서 확인된/저장된 IANA 코드는 유지하며 사용자 저장 없이 한국 시간으로 바꾸지 않는다. 목록 외 시간대 직접 입력도 보존했다. DST와 자정 경계 계산, 존재하지 않는 현지 시각 거부, 중복 시간의 단일 알림을 검사했다.

동시 탭 검사는 첫 전체 실행에서 실패했고, 첫 보완 단건 확인에서도 한 차례 5초 메시지 검사 기한을 넘겼다([로그](phase3-verification/notice-candidate-retest.log)). 이후 이벤트 순서를 계측한 3회 검사와 지연 storage 이벤트를 명시적으로 보내는 결정적 회귀 검사를 수행했다. 설정 자료의 덮어쓰기를 허용하거나 검증 조건/기한을 완화하지 않았다. 최종 관련 전체 재실행 결과는 아래에 기록한다. 계측하지 않은 단건 실패의 정확한 실행 순서는 소급 확정할 수 없다.

A2 엔진·원본 A2/A3/B·승인/발행/철회·환자/입원건 식별·저장 스키마는 변경하지 않았다. 알림은 개인 준비 시연이며 처방 추론을 하지 않는다. 앱 종료·백그라운드 정시 발송 및 외부 전송을 제공하지 않는다.

2차 보고서의 선택형 기관 프리미엄 문구는 **후속 검증이 필요한 가설**로 바로잡았다. 사업계획서 브랜치를 병합하거나 해당 가설이 검증됐다고 주장하지 않았다.

## 최종 실제 실행

검증 환경: Node 24.19.0, Python Playwright 1.62.0, `/usr/bin/chromium` 154.0.8037.57, 로컬 HTTP. 모든 데이터·PDF·지도 목적지는 합성 시험 자료다.

| 명령 | 최종 결과 | 로그 |
|---|---:|---|
| `npm test` | PASS 95 / FAIL 0 | [Node](phase3-verification/node.log) |
| `python3 tests/comfort_http.py` | PASS 15 / FAIL 0 | [환자 편의](phase3-verification/comfort.log) |
| `python3 tests/patient_http.py` | PASS 22 / FAIL 0 | [환자 B](phase3-verification/patient.log) |
| `python3 tests/spotlight_http.py` | PASS 10 / FAIL 0 | [스포트라이트](phase3-verification/spotlight.log) |
| `python3 tests/unified_http.py` | PASS 14 / FAIL 0 | [병원 통합](phase3-verification/unified.log) |
| `python3 tests/phase1_http.py` | PASS 17 / FAIL 0 | [평가 인계](phase3-verification/phase1.log) |
| `python3 tests/stabilization_http.py` | PASS 8 / FAIL 0 | [신규 안정화](phase3-verification/stabilization.log) |
| `CAREBRIDGE_SITE_PARENT=… python3 tests/release_http.py` | PASS 3 / FAIL 0 | [배포 경로 Chromium](phase3-verification/release-http.log) |
| `python3 tests/release_assets.py --stage …` | PASS: main 실행 파일 47개 SHA-256 일치, 상대 참조 131개 유효 | [정적 파일 검사](phase3-verification/assets.log) |

첫 전체 회귀 뒤 알림 동시 탭 메시지 결함을 수정했으므로 직접 영향을 받는 환자 편의·신규 안정화 전체 및 배포 경로 E2E를 재실행했다. 다른 다섯 필수 명령의 통과 결과는 그 변경의 영향을 받지 않는다. 표는 각 검사의 최종 결과만 집계하며 집중 검사/반복 실행은 중복 합산하지 않는다.

검사 범위:

- A1 SYN-002 선택 → A2 수정·인계 → A3 원천 확인·외래 확정·목적지 대조·복약 PDF 검토 → 승인·발행 → B 알림·문서·길찾기 진입 → 양쪽 튜토리얼 → 철회. 실제 클릭과 다운로드한 PDF 바이트 확인.
- SYN-003 결측·상충, SYN-004 및 4개 학습 시나리오, 일반/학습 저장소 분리. A2 원본과 전체 선택지·점수 계산 동등성은 Node 기존 검사 재실행.
- 환자·입원건·발행 ID·버전 격리, 미승인/미발행 비공개, 개정 중 이전 공개본 유지, 재발행 후 이전 알림 비활성화, 철회 차단. 발행본·이해 확인·프로필·PDF 격리 및 XSS.
- 저장 실패·손상·quota/권한 거부·동시 탭 쓰기 및 CAS 충돌, 새로고침, 실제 Chromium 재시작 후 독립 B 알림 설정 복원. 저장 실패를 성공으로 표시하지 않음.
- 승인 PDF 분류·정확한 파일·누락/저장 실패·철회 시 열린 뷰어 종료, 인쇄 호출. 다운로드된 파일은 사후 회수 불가라는 기존 안내 유지. 물리적 프린터 출력은 검증하지 않음.
- 지도 공식 HTTPS URL·공개 목적지 스냅샷·개인 식별자 미포함·opener 차단, 차단된 팝업/연결 실패의 주소 확인 대안. 외부 접속 성공으로 모의 응답을 보고하지 않음.
- 독립/연동 B 390/768/1024/1440px, 큰 글자, PC 2열/모바일 세로, 메뉴·카드·탭·프로필·이해 확인·홈/이전/다음·키보드·터치·모달 내부 스크롤·포커스 복귀.
- 병원 10단계/환자 3단계: 전환·강조·스크롤·누락 대상 대안·재진입·이전/다음/닫기/건너뛰기/Escape·200% visual zoom·저장 및 발행 상태 불변.

기존 [2차 설정 화면](patient-comfort-verification/settings-mobile.png)과 [변경 후 독립 B 390px](phase3-verification/independent-settings-390.png), [연동 B 1440px](phase3-verification/connected-settings-1440.png)을 직접 비교했다. 기존 녹색·타이포그래피·모달·카드 구조는 보존하고 시간대 선택 영역만 국소 변경했다. [한국 시간 선택](phase3-verification/korean-zone-390.png)과 [200% 확대](phase3-verification/settings-zoom200.png)도 확인했다. 큰 글자와 확대에서 설정창 내부 스크롤로 모든 조작에 접근한다. 스크린샷 비교는 대표 화면의 육안 확인이며 전체 픽셀 동일성이나 실제 고령 사용자 사용성 검증을 뜻하지 않는다.

## 배포 경로와 재현

`tests/release_assets.py`로 기존 Pages 전체를 보존한 임시 트리에 main의 실행 파일을 복사하고 SHA-256 일치 및 정적 상대 경로를 검사한다. main의 테스트·캐시·개발 문서는 새로 배포하지 않으며 기존 Pages 파일은 보존한다. 기존 시작·비교 화면 및 `a2/`, `a3/` 리다이렉트는 보존한다. 독립 `patient/`와 통합 `prototypes/integrated-v10/{patient,a3,shared}` 모듈을 함께 배포한다. 원본 A2 비교 화면의 실행 파일도 보존한다. 배포 설정 변경·강제 푸시는 하지 않는다.

```bash
cd prototypes/integrated-v10
npm test
python3 tests/comfort_http.py
python3 tests/patient_http.py
python3 tests/spotlight_http.py
python3 tests/unified_http.py
python3 tests/phase1_http.py
python3 tests/stabilization_http.py
# 기존 Pages를 export한 프로젝트 폴더에 실행 파일을 반영한 뒤:
python3 tests/release_assets.py --stage /tmp/carebridge-phase3-site/ai-care-transition-platform --copy
CAREBRIDGE_SITE_PARENT=/tmp/carebridge-phase3-site python3 tests/release_http.py
```

개발 실행은 저장소 루트에서 `python3 -m http.server 5500` 후 `/prototypes/integrated-v10/a3/index.html?screen=patients` 또는 `/patient/index.html`. A3 연동 B는 같은 출처에서 합성 환자를 발행한 뒤 연다. 시연 코드 `CARE2026`은 인증이 아니다.

배포 파일 반영: **PASS**. 고유 최종 테스트는 Node 95 + Chromium 89 = **184 PASS / 0 FAIL**이며 main 실행 파일 47개와 상대 참조 131개도 통과했다.

- main 런타임 구현 커밋: [`50f166b606da5ae57fbac228879282f1825776a9`](https://github.com/pchjesus/ai-care-transition-platform/commit/50f166b606da5ae57fbac228879282f1825776a9).
- gh-pages: [`fe58d210ac0bfe8bd4f3c7b158c8b0d1b6dda436`](https://github.com/pchjesus/ai-care-transition-platform/commit/fe58d210ac0bfe8bd4f3c7b158c8b0d1b6dda436). 1·2차 미배포 실행 파일까지 최신 main과 맞췄으며 기존 진입점은 보존했다. 원본 A2 preview는 기존 main 파일을 그대로 복사했다.
- 원격 gh-pages를 다시 fetch하고 manifest의 **70개 파일 전체**를 Git 객체에서 읽어 SHA-256·바이트 수·검증한 임시 배포 트리와 대조했다: [실제 배포 증거](phase3-verification/deployed-files.json). `release-manifest.json`은 런타임 기준 main SHA와 이전 Pages SHA를 담는다.
- main과 gh-pages 모두 일반 fast-forward push. 기존 PR #1~#4·사업계획서 브랜치·배포 설정 변경 없음. 이 결과를 추가한 후속 main 커밋은 문서/증거만 변경하며 배포 런타임은 동일하다.
- 공개 주소: <https://pchjesus.github.io/ai-care-transition-platform/>.
- **공개 브라우저 동작: NOT VERIFIED**. 배포 후 실제 Chromium으로 시작 화면, 병원 워크벤치, 연동 B, 독립 B, 비교 화면 및 카카오맵에 접속했지만 모두 `net::ERR_TUNNEL_CONNECTION_FAILED`였다: [실제 시도 기록](phase3-verification/public-browser.json). Pages 빌드 완료·CDN 캐시 갱신·공개 사이트 실행 성공은 확인하지 못했다. 로컬 배포 경로 3 PASS와 구분한다.

변경 파일: 실행 코드 `patient/{comfort-ui.js,comfort.css,time-zones.js}`, `shared/publication-events.js`; 단위 검사 `shared/{destinations,time-zones}.test.js`; 브라우저 검사 `tests/{comfort_http,stabilization_http,release_http}.py`; 정적 파일 검증 `tests/release_assets.py`; 이 보고서/증거와 2차 보고서의 가설 문구.

## 미검증·잔여 한계와 R13 준비

- **NOT VERIFIED**: 공개 Pages 실제 브라우저, 카카오맵 실서버 연결 및 실제 앱 설치/미설치 분기. 환경의 HTTP CONNECT 403 및 Chromium `net::ERR_TUNNEL_CONNECTION_FAILED`로 차단됨. 로컬 URL/새 창/차단 대안 검증과 구분한다.
- **NOT RUN**: 실물 모바일 기기, Safari, Firefox, 스크린리더, 실제 프린터, R13 고령 사용자 시험. Chromium 모바일/터치는 에뮬레이션이다.
- 알림톡·웹 푸시·서버 스케줄러·카카오 T·EMR·실제 인증/기관 전송은 미구현. localStorage/Web Locks는 동일 출처 시연이며 서버 보안·기기 간 동기화·영구 보관·실제 백그라운드 전달을 보장하지 않는다.
- 후속 R13: 합성 과제와 동의/관찰 기록지 준비, 고령 참여자가 오늘 안내·외래·알림 설정·도움·PDF를 찾는 과제 수행, 개인 준비 알림/의료진 처방과 승인 상태 이해도 확인. 실제 iOS/Android·스크린리더·확대·공개 사이트 및 지도 앱 분기 확인 후 관찰된 실패를 수정한다. 실제 사용자 검증 완료를 주장하지 않는다.
