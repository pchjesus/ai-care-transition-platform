# 병원용 워크벤치 리팩토링 — 최종 검증

기준일: 2026-10-21. 브랜치: `codex/hospital-workbench-refactor` (`main` 대상, 병합 금지).

## 범위 및 원본 보존

최신 원격 `main`은 `f87402f8915f23b2e6da55079e770c49733cb140`. 첨부 필수 소스·테스트·예시 및 제공 SHA256SUMS를 확인한 후 전체 파일 해시를 `baseline-sha256.json`에 기록했다. ZIP SHA-256은 `c30c6254bf02bc1785526ff43f78e19791f4eef02c23f8faa99b82912f5b8b56`.

- `prototypes/hospital-a2/`: 기존 A2 v0.5를 변경하지 않음. 전체 파일/파일 목록 해시 검증 PASS.
- `prototypes/hospital-a3/`: 첨부 A3 v0.3 원본 그대로 등록. 최초 보존 커밋 `73b35c4`. 전체 파일/파일 목록 해시 검증 PASS.
- `prototypes/hospital-a3-v04/`: 독립 개선 후보. `styles.css`, `index.html`, `data.js`도 v0.3과 동일. 평가 규칙 변경 없음.
- 환자용 v1.3과 실제 인증·EMR·Firebase는 읽거나 수정·연결하지 않음. A2/A3 정식 통합 제외.

## 수정 결과

원인·재현·분류는 [C0_RISKS.md](C0_RISKS.md)에 기록했다.

1. `workflow.js`: 파생 이슈가 누락되어도 평가값에서 결측·상충·알 수 없는 필수 옵션을 다시 검사. 개정 시 검토 이슈 보존.
2. `source-library.js`: 누락 대상과 알 수 없는 대상 종류를 거부하고 기존 환자·입원 건·필드 계약 유지.
3. `app.js`: 비동기 PDF 첨부의 환자·작업 공간·역할 고정, 정확히 동일한 PDF의 검토/승인 유지 복원, 실습 환자 선택 유실 및 이전 인쇄 영역 잔류 수정. 불용 import/함수/상태 제거.
4. `storage.js`: 저장 검증을 분리. 환자 식별·데이터 형태 확인, 손상된 원문 보존, 다른 탭의 저장 변경 감지. v0.4 일반/실습/레이아웃 키는 v0.3과 분리하며 자동 마이그레이션 없음.
5. `tests/`: 기존 기능을 HTTP와 독립 HTML 양쪽에서 실행. 안전성·실제 저장·키보드·PDF·발행 버전 회귀, A2 계약 동등성, 원본 해시/빌드/화면 비교 추가. 테스트 출력은 원본 예시/소스 밖에 생성.

## 전후 테스트

PASS/FAIL/NOT RUN은 아래처럼 구분한다. 원본 실패를 후보의 통과 결과로 덮어쓰지 않았다. 실행 로그는 이 폴더와 `final/`에 보존.

| 검사 | 원본 C0 | v0.4 후보/최종 |
|---|---|---|
| A2 엔진 | PASS 5/5 | 원본 동결, A3 후보의 전 선택지 동등성 추가 PASS |
| A2 기존 standalone 스모크·사이드바 | PASS / PASS | 원본 파일·엔진 유지 |
| A2 기존 `http_ui.py` | FAIL: 이전 버튼 이름에서 timeout | 그대로 FAIL인 기준선. 별도 `tests/a2_http.py`가 현재 UI/미평가 기대값으로 5개 viewport에서 PASS |
| A3 기존 Node | PASS 15/15 | 기존 15개 포함 PASS 27/27 |
| A3 기존 브라우저 스모크·v0.3 기능 | standalone 주입 PASS 32/32 · 44/44 | 실제 HTTP 및 standalone 각각 PASS 32/32 · 44/44 |
| SYN-001 완주 | standalone PASS | HTTP/standalone 각각 7건 보완 → 6개 항목 직종 검토 → 승인·발행 PASS |
| SYN-002 PDF 생성 | standalone PASS | HTTP/standalone 각 PASS: 실제 생성 PDF에 한국어/환자/버전 포함 |
| 추가 승인·원천자료 안전성 | 5개 중 FAIL 4 / PASS 1 | 모두 PASS (Node 27개에 포함) |
| 초기 HTTP 안전성 | 7개 중 FAIL 6 / PASS 1 | 확장된 HTTP 검사 13/13 PASS |
| 동일 PDF 복원 / 다른 탭 저장 유실 | 추가 원본 재현 각각 FAIL | 실제 SHA-256·복원·다중탭 보호 PASS |
| 저장 손상·환자/학습 격리·새로고침·reset | C0 HTTP 회귀에서 실패/일부 신규 검사는 NOT RUN | HTTP 13개 및 storage 단위 검사 PASS |
| SYN-003 상충·회신·A2 재인계 | standalone PASS | HTTP/standalone PASS. 원자료를 고치지 않으면 차단 유지 |
| SYN-004 개정·철회·발행본/PDF 버전 | 개정까지만 기존 검사 PASS | v1 스냅샷 불변, v2 재검토·발행·PDF 내용, 철회 PASS |
| 320/390/800/801/1024/1440px | 기존 standalone PASS | HTTP/standalone overflow 검사 및 실제 HTTP 모달 Enter/Escape·초점 복귀 PASS |
| XSS·이벤트 중복 | 신규 HTTP 검사는 NOT RUN | 입력을 텍스트로 표시·저장 복원 PASS, 중복 PDF 없음·단일 승인/발행 후 상태/이력 검사 PASS |
| 변경 전후 시각 비교 | 새 검사 | 6개 폭 × 계획/평가/학습/실습 = 24쌍 모두 픽셀 동일 |
| standalone 재빌드 일치 | 새 임시 디렉터리 검사 | A2 원본/A3 원본/v0.4 세 가지 모두 PASS |
| 실제 임상 성능·의료진 사용성 | NOT RUN | NOT RUN |
| 서버 인증·원자적 PDF 발행·EMR/Firebase | NOT IMPLEMENTED | NOT IMPLEMENTED |

시각 비교는 같은 Chromium·시간·폰트·viewport에서 수행했다. [1440px 이전](screenshots/before-1440.png) / [이후](screenshots/after-1440.png), [390px 이전](screenshots/before-390.png) / [이후](screenshots/after-390.png). 기본 화면은 별도 육안 검토도 수행했다. 손상된 저장소 안내·새 첨부 취소/복원 안내는 오류 경로에서만 나타난다.

중간 검증의 테스트 자체 수정: 실습 종료 후 원래 학습 화면으로 돌아온 상태에서 숨겨진 환자 selector를 조작하던 신규 테스트를, 계획 화면으로 이동한 후 검사하도록 수정했다. `http-safety-intermediate.log`의 해당 ERROR는 이 harness 오류이며 최종 13개는 모두 실행·완료됐다.

재실행: 후보 디렉터리에서 `python3 tests/run_checks.py`. 현재 검증 환경 Node 24.19.0 / Python 3.12.14 / Playwright 1.62.0 / Chromium / PyMuPDF 1.26.6 / Pillow 12.3.0. 새 테스트의 출력·PDF·스크린샷은 `/tmp/hospital-a3-v04-artifacts/` 기본 경로로 분리한다.

## 남은 위험·후속 제안

- 로컬 역할 선택은 실제 인증이 아니다. 브라우저 저장소를 직접 조작할 수 있는 사용자를 막는 권한 시스템/임상 보안 검증을 주장하지 않는다.
- PDF 바이트는 메모리 전용이며 새로고침 후 동일 파일 재첨부가 필요하다. 장기 보관·서버 PDF/데이터 원자적 발행은 미구현. 출력 PDF는 브라우저 환경/폰트에 영향을 받는다.
- 손상된 저장소는 원문을 보존하고 저장을 중지한다. 자동 복구·마이그레이션·탭 간 자동 병합은 없다. 현재 작성 내용을 별도로 보존한 후 문제를 해결해야 한다. 저장 변경 비교는 완전한 다중 사용자 트랜잭션이 아니다.
- FNV fingerprint는 로컬 변경 감지용이며 암호학적 승인 서명이 아니다.
- 큰 렌더링/학습 코드는 이번에 전면 분해하지 않았다. CSS와 승인 UI를 유지했고 저장 경계만 분리했다.
- A2 기존 HTTP 테스트의 오래된 기대값은 별도 후속 테스트 정비 대상으로 남긴다. 승인된 A2 파일은 수정하지 않았다.
- 정식 통합 전에는 A2 객체 스키마 → A3 스냅샷 어댑터 계약(환자·입원·평가 ID, 규칙 버전, 타임스탬프, 30개 raw 값), 출처 필드 매핑, 인계 후 승인 무효화 조건을 먼저 합의한다. 그다음 별도 PR에서 서버 권한·영구 PDF/hash·승인/발행 트랜잭션을 검증한다. 현재 화면 안의 독립 A2 연습 기능을 실제 A2 연계로 표현하지 않는다.

## 전달 상태

Git HTTPS 브랜치 푸시는 가능하지만 `api.github.com` 연결은 환경 프록시가 HTTP 403으로 차단한다. Draft PR 생성은 별도 실제 명령 결과에 따라 보고하며, 생성되지 않았다면 PR 번호/주소를 만들지 않는다. PR 본문은 `PR_BODY.md`에 보존한다. `main`에 직접 푸시하거나 병합하지 않는다.

실제 전달 결과: 개발 브랜치 푸시 성공. `gh pr create --repo pchjesus/ai-care-transition-platform --base main --head codex/hospital-workbench-refactor --draft --title 'fix(hospital): preserve A3 baseline and harden v0.4 review workflow' --body-file docs/hospital-refactor/PR_BODY.md`는 `Post "https://api.github.com/graphql": Forbidden`으로 실패했다. 이는 실행환경의 API 프록시 차단으로, Git 브랜치 쓰기 실패와 구분한다. 생성된 PR은 없다. GitHub가 반환한 PR 생성 경로는 https://github.com/pchjesus/ai-care-transition-platform/pull/new/codex/hospital-workbench-refactor 이며, 환경에서 API 접근이 복구되면 위 명령으로 Draft PR 생성을 재시도할 수 있다.
