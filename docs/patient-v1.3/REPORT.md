# 환자용 v1.3 안정화 검증 보고서

기준일: 2026-10-21. 브랜치: `codex/patient-v1.3`, 대상: `main`. 배포·병합하지 않는다.

## 기준선 확인과 보존

- 최신 원격 `main`: `f87402f8915f23b2e6da55079e770c49733cb140`.
- 원격 main·브랜치·조회 가능한 PR refs에는 환자용 v1.3 코드가 없었다. 병원용 개발 브랜치는 별도로 존재하며 이 작업에 포함하지 않았다. GitHub PR 목록 API는 프록시 403으로 **NOT RUN**이므로 PR 메타데이터까지 확인했다고 주장하지 않는다.
- ZIP SHA-256: `9f61bb64e1036e567bb604e43d5d88591e7a798de211222f54e4befa4c2b923e`. 필수 파일을 확인한 뒤 기준선 코드를 변경하지 않고 테스트했다.
- ZIP의 한글 PDF 파일명이 UTF-8 flag 없이 저장되어 CP437로 해석되는 문제는 올바른 `보행_보조기_안내_시연용.pdf` 이름으로 복원했다. 모든 파일 바이트를 원본 ZIP과 직접 대조해 동일함을 확인했다. 원본/추출 파일명 차이는 인코딩 복원뿐이다.
- v1.2 원본 19개 파일은 `prototypes/patient-v12/`와 최초 커밋 `dcbf123`에 보존했다. [baseline-sha256.json](baseline-sha256.json)에 전체 파일 목록과 해시를 기록했다. 최종 원본 해시·빌드 재현성 PASS.
- 기준선에서는 `index.html`과 개발용 `preview.html` 모두 내장 CSS/JS/PDF를 가진 독립 HTML이며, `app.js`·`styles.css`·`build_standalone.py`가 수정 원본이었다. 저장은 v1.2 profile/schemaVersion 1 및 font 키, 계획 상태는 메모리였다.

## 확인된 오류와 최소 수정

| 원본 경로/함수 | 재현 문제 | v1.3 수정 및 검증 |
|---|---|---|
| app.js / profilePage, font, input | 저장 전 주소 입력 후 글자 크게 → 입력 유실 | profileDraft를 input 이벤트로 유지. 같은 HTTP 재현 검사 PASS |
| app.js / help, render | 검색 후 글자 크게 → 검색어는 남지만 결과가 초기 목록으로 바뀜 | render 후 현재 검색어로 결과 재계산. PASS |
| app.js / modal-save, modal-transfer | 저장 실패에도 수정 차수·화면 정보를 확정하고 모의 요청 가능 | persist 성공 뒤 상태 확정. 실패 시 draft/편집 유지 및 요청 차단. PASS |
| app.js / demoRepository | 손상 JSON을 기본값으로 불러온 뒤 저장하면 원문 덮어쓰기 | 저장 구조 검증·손상 원문 보존. CAS 비교로 다른 탭의 저장 덮어쓰기 차단. PASS |
| app.js / publish, withdraw | 새로고침하면 철회 취소/버전 1 복귀, 다른 열린 탭은 오래된 계획 표시 | 합성 계획 상태 저장 및 storage 이벤트 동기화. 손상 계획은 차단. PASS |
| app.js / pdf-open | Blob URL 생성 오류가 처리되지 않아 런타임 예외 | PDF 오류 안내·재시도 가능 화면, 이미지 미리보기 오류 fallback. 실제 다운로드/원본 바이트 검사 PASS |
| app.js / reset, pdf-close | 초기화 시 PDF URL 정리 누락, 닫기/Escape 시 초점 유실 | Blob URL 공통 정리, 모달 닫은 뒤 유효한 트리거 또는 main으로 초점 복귀. PASS |
| app.js / confirmDialog, font | 동의 체크 후 재렌더 시 체크 유실 | 별도 consent 상태 유지. 성공 요청 후 중복 버튼 비활성·초점 복귀. PASS |

오류 재현은 `safety-before.log`에 기록했다. 최초 12개 검사 중 10 FAIL / 1 ERROR / 1 PASS였으며, PDF 오류 주입 harness의 반환값 문제를 고친 뒤 원본 앱의 실제 예외를 별도로 다시 재현했다(`pdf-error-before.log`). 제품 오류와 테스트 실행기의 오류를 구분했고 검증 조건을 완화하지 않았다. 새 테스트 작성 중 인쇄 stub도 실행기가 즉시 호출하지 않도록 함수 반환을 제거했으며 최종 검사는 인쇄가 정확히 한 번 발생하는지 확인한다.

## 변경 파일과 구조

- `README.md`: 환자용 개발 경로와 검증 보고서 링크 추가. 기존 병원용 안내 변경 없음.
- `prototypes/patient-v12/**`: 첨부 원본 그대로 보존. 상세 목록/해시는 manifest 참조.
- `prototypes/patient-v13/app.js`: 기존 렌더/이벤트/세션 구조를 유지하며 위 결함 수정.
- `data.js`: 기존 아이콘·합성 안내·도움 목록·가상 기본값 추출. 문구·콘텐츠를 변경하지 않음.
- `storage.js`: 기존 데이터 검증/마이그레이션·쓰기 실패·충돌·계획 상태 경계 분리.
- `pdf-assets.js` / `pdf.js`: 기존 대형 Base64 자산과 PDF 생성 로직 분리. PDF 바이트 동일성 PASS.
- `index.source.html` / `preview.source.html`: 수정할 HTTP 모듈형 shell. 원본 화면 마크업을 유지.
- `build_standalone.py`, `index.html`, `preview.html`: source shell과 모듈에서 독립 HTML 생성. 수동 산출물 편집 없음.
- `styles.css`: v1.2와 바이트 동일.
- `tests/`, `test_v12.py`: 기존 assertion을 유지한 공통 진입점 검사, 새 저장/PDF/HTTP/시각 회귀 검사. 기존 명령도 wrapper로 유지.
- `package.json`, `requirements-test.txt`, `.gitignore`, README/CHANGELOG: 재실행에 필요한 최소 설정과 안내.

큰 렌더링 파일 전체를 다시 작성하거나 새 UI 프레임워크·서버 의존성을 도입하지 않았다. 현재 브랜치에는 병원용 A1/A2/A3 코드 변경이 없다.

## 저장 호환성

기존 v1.2 schemaVersion 1의 profile/address/contact/revision/lastRequest를 검증한 뒤 v1.3 키로 복사한다. v1.2 원문은 수정·삭제하지 않는다. 기존 v1.3 값 우선, 글자 크기는 v1.2 fallback 후 v1.3 별도 쓰기다. 새 수정은 이전 요청을 초기화한다. reset은 v1.3 기본 profile과 계획을 명시적으로 저장하여 v1.2 데이터가 다시 나타나지 않게 하고 글자 크기는 유지한다. reset의 두 번째 쓰기 실패 시 profile을 되돌리는 검사도 추가했다.

마이그레이션은 Node와 실제 브라우저에서 주소·연락처·수정 차수·LOCAL_ONLY 요청 이력·큰 글자 유지 및 원본 키 불변을 확인했다. 잘못된 schema, 손상 JSON, 유효하지 않은 요청, 저장 한도 오류, 오래된 탭, 실패한 마이그레이션도 검사했다. 자료를 읽을 수 없으면 덮어쓰기를 중지하고 오류를 표시한다.

## C0/C3 결과

| 검사 | v1.2 / C0 | v1.3 최종 |
|---|---|---|
| 기존 test_v12.py | PASS, 6개 폭·주요 탭·확대·profile/request·PDF·시연 상태 | 같은 assertion: 모듈 HTTP / 생성 HTML HTTP / 주입형 standalone 모두 PASS |
| 새 저장/PDF 단위 검사 | 기존에 없음 (NOT RUN) | Node 12/12 PASS |
| 실제 HTTP 안전성·상태·전체 도움 경로 | 추가 C0 12개 중 11 FAIL/ERROR, 1 PASS | 모듈 HTTP 및 생성 HTML HTTP 각각 20/20 PASS |
| 가상 로그인 | 기존 버튼 PASS | 버튼 및 Enter, 잘못된 코드 PASS |
| profile 저장/복원·기관 요청 | 저장소 모의 검사 PASS | 실제 origin 저장/새로고침·동의·중복 요청 방지·새 수정 시 이전 요청 무효화 PASS |
| 오늘/일정/도움/내 정보·하위 화면 | 기존 주요 경로 PASS | 상세/문제/전체계획 및 모든 도움 항목/인쇄 경로 PASS |
| 글자 크게 | 390px에서 7개 화면 크기 변화 PASS | 같은 검사 + 입력/검색/동의 유지·새로고침 복원 PASS |
| PDF | 이미지·Blob 링크 존재 PASS | 생성 오류/이미지 오류/닫기·Escape/URL 정리/실제 다운로드·SHA-256 원본 일치 PASS |
| 계획 상태 | 기존 메모리 시연 PASS | 정확히 v2로 개정·새로고침/환자 화면 반영·구버전 PDF 제한·철회/미발행/손상 상태 차단 PASS |
| 반응형 | 기존 320/360/390/768/1024/1440px PASS | 기존 경로와 320/390/768/1024/1440px 화면 비교/키보드 검사 PASS |
| 모달·초점 | 새 검사에서는 FAIL | PDF/저장 모달 Tab 순환·Escape·트리거/main 초점 복귀 PASS |
| HTML 주입 | 추가 C0 텍스트 표시 PASS | 저장·새로고침 후에도 태그를 텍스트로 표시, 이벤트 미실행 PASS |
| 콘솔/런타임 | 정상 흐름 PASS, PDF 오류 경로 예외 | 실제 HTTP 20개 및 기존 정상 흐름에서 pageerror 없음 |
| 원본 해시·standalone 재생성 | 새 검사 | v1.2 전체 해시와 v1.2/v1.3 양쪽 HTML 재생성 일치 PASS |
| 직접 file:// 브라우저 실행 | 기존 환경에서도 제한 | NOT RUN — net::ERR_BLOCKED_BY_ADMINISTRATOR. 실행 시도 로그 보존 |
| 실환자·서버 인증·기관 전송·EMR/Firebase | 미구현 | NOT IMPLEMENTED / 범위 밖 |

검증 환경: Node 24.19.0 / Python 3.12.14 / Playwright 1.62.0 / Chromium / Pillow 12.3.0. `prototypes/patient-v13/`에서 `python3 tests/run_checks.py`로 재실행한다. 로그는 [final/](final/)에 보존했다. 직접 파일 접속의 차단을 우회하거나 미실행 결과를 성공으로 바꾸지 않았다. 독립 HTML의 주입 검사는 origin·브라우저 파일 권한 검증을 대신하지 않는다.

## UI 전후 비교

동일 Chromium·폰트·viewport·콘텐츠·배율에서 5개 폭 × 11개 화면(로그인/오늘/일정/도움/내 정보/상세/문제/큰 글자 오늘/큰 글자 내 정보/PDF/저장 모달) **55쌍 픽셀 동일**. 기본 화면은 육안 검토도 수행했다.

[390px 이전](screenshots/before-today-390.png) / [이후](screenshots/after-today-390.png), [1440px 이전](screenshots/before-today-1440.png) / [이후](screenshots/after-today-1440.png). 전체 비교 결과는 `final/visual-results.json` 참조.

오류 경로의 차이는 의도적이다. PDF 생성 실패는 예외 대신 안내를 표시하고([이전](screenshots/before-pdf-error.png) / [이후](screenshots/after-pdf-error.png)), 저장 실패는 완료된 정보처럼 보이지 않도록 편집 입력을 유지한다([이전](screenshots/before-save-error.png) / [이후](screenshots/after-save-error.png)). 기본 색상·타이포그래피·레이아웃 변경이 아니라 재현된 오류를 수정한 결과다. 키보드 닫기 후 초점 복귀도 접근성 수정이다.

## 남은 문제와 후속 개발

1. 현재 클라우드 브라우저는 file://를 차단한다. 사용자가 허용된 데스크톱 Chromium에서 직접 파일 실행을 별도로 확인해야 한다. Safari/Firefox 및 실제 환자·보호자 사용성 검증은 NOT RUN.
2. localStorage 접근이 차단되면 저장·철회 동기화/새로고침 보존을 보장할 수 없다. 현재 세션의 철회 내용은 가리고 오류를 표시한다. 실제 서비스의 접근 제한은 서버 권한/승인 스냅샷으로 구현해야 한다.
3. 이 저장소는 합성 환자 한 명만 다룬다. 가상 코드는 인증이 아니며 localStorage는 위변조 방지 경계가 아니다. 탭 간 충돌 감지는 자동 병합·다중 사용자 트랜잭션을 제공하지 않는다. 손상 데이터 자동 복구는 없으며 원문을 보관한 뒤 문제를 해결해야 한다.
4. 로그인·미저장 입력·문제 풀이 상태는 기존처럼 세션 단위다. 이번에는 저장 성공/실패와 profile·요청·계획·font의 일관성만 안정화했다.
5. 후속 개발은 별도 합의 후 승인된 계획의 환자/입원/버전 계약과 접근 권한을 먼저 정하고, 테스트용 서버 저장·문서 권한/철회·실제 기기 접근성을 검증하는 순서를 제안한다. 병원용 코드 통합이나 실제 의료 시스템 연결은 이번 작업에 포함하지 않는다.

## GitHub 전달

코드·테스트·보고서를 개발 브랜치에 커밋·푸시하고 Draft PR 생성 명령을 실행한다. GitHub API는 현재 환경 프록시에서 403으로 차단되어 있으며, 실제 PR 생성 결과를 별도로 기록한다. 생성되지 않은 PR 번호/주소를 제시하지 않는다. PR 본문은 [PR_BODY.md](PR_BODY.md)에 보존한다. `main` 직접 수정·병합·배포는 하지 않는다.

기타 확인: 새 코드의 Git 공백 검사는 검토했으며, v1.2 CSS의 빈 줄에 있던 두 칸 공백과 이를 포함하는 생성 HTML 두 곳의 경고는 원본 CSS 바이트 보존을 위해 그대로 두었다. 기능/빌드 실패를 무시한 것이 아니며 테스트의 FAIL/NOT RUN과 구분한다.
