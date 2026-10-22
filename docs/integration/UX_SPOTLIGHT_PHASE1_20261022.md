# 케어브릿지랩 1차 UX·실제 화면 튜토리얼 검증

- 기준: 원격 `main` **19b755ae88ee9895250cd36291b738454afce6a9**, 2026-10-22.
- 적용: `GUIDED_SPOTLIGHT_TOUR_REFERENCE_v1.0.md`의 10단계 계약. `PATIENT_B_HOME_SUMMARY_20261022.md`와 멘토링 v1.4 인수인계 중 환자 사용성 지침만 참고.
- 환경: Node 24.19.0, Python Playwright 1.62.0, Linux Chromium 154.0.8037.57, 로컬 HTTP.

## 구현 및 수정

- L01/L04의 기존 정적 미니어처를 실제 A1 목록 → 환자·입원건 → A2 영역·입력/결과 → A3 계획·다중 출처·역할·승인/발행 안내·미리보기의 **10단계 스포트라이트**로 교체했다. 기존 L01~L05와 SYN-001~004 직접 실습은 유지했다.
- 실제 대상의 위치를 따라 4면 마스크·강조 링·방향 말풍선을 배치한다. 자동 스크롤, 스크롤/화면 크기/DOM/시각적 뷰포트 변경 추적, 대상 누락 시 중앙 안내, 이전·다음·건너뛰기·닫기·Escape·진행률을 제공한다.
- native modal dialog, 이벤트 차단, 포커스 순환·복귀, 단계 발표 영역, 44px 버튼을 사용한다. 화면이 매우 낮으면 설명 영역을 키보드로 스크롤할 수 있다. 종료 시 원래 화면·탭·카드 펼침·스크롤을 복원한다.
- A2 데스크탑의 `display:contents`는 자체 경계가 0이므로 실제 입력·결과 자식 경계의 합집합으로 강조한다. 200% 확대 시 visualViewport의 크기와 이동량을 반영하여 말풍선이 화면 밖으로 나가지 않게 했다.
- 마지막 단계는 **원본 독립 B v1.3**을 새 탭으로 연다. 현재 A3 발행본과 데이터 출처가 다름을 명시한다. 연동 B로 바꾸거나 승인 상태를 만들어내지 않는다.
- 독립 B에 통합 홈·앱 홈·이전·다음을 추가했다. 앱 내부 방문 목록만 사용하며 직접 진입 시 이전/다음은 비활성화한다. 기존 탭·상세·PDF·프로필 동작은 그대로 사용한다.
- 두 B의 긴 한국어·주소 줄바꿈과 최소 너비를 보완했다. 독립 B 헤더는 큰 글자와 작은 화면에서 줄바꿈한다. 초록색 디자인, 관리계획/외래 일정의 PC 2열·모바일 세로 배치, 오늘 안내/자세한 설명의 위계를 유지했다.

## 실제 검증

| 검사 | 변경 전 | 변경 후 |
|---|---|---|
| `npm test` (integrated-v10) | PASS 78/78 | PASS 80/80 |
| `tests/spotlight_http.py` | NOT RUN (신규) | PASS 10/10 |
| `tests/unified_http.py` | NOT RUN | PASS 14/14 |
| `tests/phase1_http.py` | NOT RUN | PASS 17/17 |
| `tests/patient_http.py` | PASS 22/22 | PASS 22/22 |

- 투어: 390/768/1024/1440px에서 **전체 10단계**의 실제 DOM·강조 영역·말풍선 경계 및 비중첩 확인. 정상/학습 모드, 반복 재진입, 이전·다음·건너뛰기·Escape, 대상 누락, 마우스 스크롤·리사이즈·재위치, 키보드 포커스, 모바일 터치, CDP 실제 200% page scale을 검증했다.
- 저장 불변: 각 단계와 종료 후 **전체 localStorage 문자열**을 바이트 단위로 비교했다. 일반/실습 저장소, 발행본·철회본·승인·버전·감사 이력이 그대로였다. 역할 변경·철회에 대한 배경 DOM 이벤트도 차단됨을 확인했다. URL·환자·입원건·역할과 원래 진입 버튼 포커스를 유지했다.
- B: 독립/연동 각 4개 폭에서 오늘·일정·도움·내 정보, 큰 글자 유지, 가로 넘침 없음, 이정희/윤미경 이름 및 PC 2열을 확인했다. 독립 B의 이전/다음·홈, 프로필 확인 모달·저장·새로고침, PDF 이미지 열람·실제 `%PDF-` 다운로드·Escape 포커스 복귀를 확인했다.
- 콘솔/런타임 오류 없음: 신규 브라우저 검사에서 pageerror와 console error를 수집해 빈 목록임을 확인했다.
- FAIL: 최종 실행 실패 없음. 개발 중 `display:contents` 대상 계산·확대 위치·반응형 테스트 선택자 문제를 재현하고 수정한 뒤 재실행했다.
- NOT RUN: Safari/Firefox, 실제 모바일 기기·스크린리더, 브라우저 메뉴의 데스크탑 200% zoom(대신 Chromium CDP page scale 200% 실행), 외부 공개 사이트 검증. 스크린리더 발표 마크업은 구현했으나 실제 낭독 품질을 검증했다고 주장하지 않는다.

## 화면 및 증거

[검증 로그·대표 캡처](ux-spotlight-verification/)를 같은 커밋에 저장했다. 4개 폭의 전체 캡처를 생성했고, 대표 모바일/PC 화면을 직접 검토했다. 환자 화면의 변경 전 캡처는 기준 커밋의 파일을 HTTP 응답으로 주입하고 동일 브라우저·큰 글자 조건에서 생성했다. 투어 화면은 의도한 실제 DOM 강조로 바뀌고, B의 본문·색상·카드 순서는 보존됐다. 독립 B 헤더 높이는 새 탐색 버튼과 줄바꿈에 따라 늘어난다.

| 대표 확인 | 캡처 |
|---|---|
| 모바일 A2 실제 입력/판단 + 말풍선 | [390px](ux-spotlight-verification/tour-mobile-assessment.png) |
| PC A3 원천자료 강조 | [1440px](ux-spotlight-verification/tour-desktop-sources.png) |
| 독립 B 모바일·큰 글자 | [전](ux-spotlight-verification/independent-mobile-before.png) / [후](ux-spotlight-verification/independent-mobile-after.png) |
| 연동 B PC·큰 글자 | [전](ux-spotlight-verification/connected-desktop-before.png) / [후](ux-spotlight-verification/connected-desktop-after.png) |

## 변경 범위·잔여 사항

- 소스: `a3/tutorial-tour.{js,css}`, `a3/app.js`의 읽기 전용 표시 브리지/L01·L04 문구, `patient/index.html`, 연동 B `patient/connected.css`.
- 테스트: `a3/tests/tutorial-tour.test.js`, 신규 `tests/spotlight_http.py`. 그 외 변경은 이 보고서와 검증 증거다.
- A2 엔진·규칙, A3 workflow/storage, shared 발행·문서 모듈과 식별 계약은 수정하지 않았다. 임상 데이터·승인 기록을 투어용으로 생성하지 않는다.
- 환자 3단계 선택형 안내는 필수 기능이 아니며 이번에는 추가하지 않았다. 알림·지도·택시·외부 전송은 구현하지 않았다.
- 합성 localStorage MVP이다. 실제 인증·기관 연계나 임상 성능 검증을 의미하지 않는다. 실기기·스크린리더 확인이 후속 과제다.
- 검증된 소스는 `main`에 반영한다. 기존 PR·무관한 브랜치·배포 설정은 변경하지 않으며 **gh-pages 배포는 수행하지 않는다**.

## 재현

```bash
cd prototypes/integrated-v10
npm test
python3 tests/spotlight_http.py
python3 tests/patient_http.py
python3 tests/unified_http.py
python3 tests/phase1_http.py
```

브라우저 테스트는 `/usr/bin/chromium`과 Python Playwright를 사용해 임시 로컬 HTTP 서버를 띄운다. 수동 확인은 저장소 루트에서 `python3 -m http.server 5500` 실행 후 `/prototypes/integrated-v10/a3/index.html?screen=learn&patient=SYN-002`의 튜토리얼 버튼으로 시작한다. 독립 B는 `/patient/index.html`, 체험 코드는 `CARE2026`이다. 연동 B는 A3에서 유효한 발행 후 같은 환자·입원건 경로로 진입한다.
