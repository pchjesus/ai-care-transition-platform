# A3 v0.4 후보 — 의료진 검토·발행 워크벤치

A3 v0.3의 승인된 화면·기능을 보존하는 독립 개선 후보입니다. 원본은 [../hospital-a3/](../hospital-a3/), A2 v0.5는 [../hospital-a2/](../hospital-a2/)에 그대로 보존합니다. A2/A3 정식 통합 및 환자용 v1.3 변경은 포함하지 않습니다.

## 실행과 검증

이 디렉터리에서 `python3 -m http.server 5501 --bind 127.0.0.1`을 실행하여 모듈형 `index.html`을 엽니다. `preview.html`은 CSS/JS를 포함하는 생성본이며 `python3 build_standalone.py`로 생성합니다. 예시 PDF를 사용하려면 `examples/`도 함께 유지합니다.

검증 환경: Node 24.19.0, Python 3.12.14, `/usr/bin/chromium`, `requirements-test.txt`의 Python 패키지. 새 환경에서는 가상환경에 `python3 -m pip install -r requirements-test.txt`를 실행하고 OS의 Chromium을 준비합니다. 앱 자체는 npm 의존성·DB·비밀키가 필요하지 않습니다.

```bash
node --test tests/*.test.js
python3 tests/run_checks.py
```

통합 검증은 Node, 실제 HTTP 모듈, 독립 HTML 주입, 안전성·저장·PDF 회귀, A2 별도 HTTP 검증, 24쌍 화면 비교, 원본 해시 및 standalone 빌드 일치를 확인합니다. 출력은 기본 `/tmp/hospital-a3-v04-artifacts/`이며 `A3_ARTIFACTS`로 바꿀 수 있습니다. 원본 파일과 예시 PDF를 덮어쓰지 않습니다. A2 원본의 오래된 HTTP 테스트 기대값은 수정하지 않고 `tests/a2_http.py`에서 현재 화면·데이터에 맞춰 검사합니다.

개별 브라우저 테스트는 HTTP가 기본입니다. `A3_MODE=standalone python3 tests/browser_smoke.py`와 같이 실행하면 주입형 standalone 검증을 수행합니다. 주입 환경의 WebCrypto 대체는 기존 UI 스모크에만 제한되며, 실제 SHA-256·저장 복원은 `tests/http_regression.py`의 HTTP 검사에서 확인합니다.

## 변경 내용

- `storage.js`: 환자/입원 식별과 저장 구조 검증, 손상된 원문 보존, 저장 충돌 감지. 잘못된 저장값은 기본값으로 덮어쓰지 않고 `저장 불가`를 표시합니다.
- 일반/실습 키는 각각 `a3-prototype-v04-synthetic-only`, `a3-study-v04-synthetic-only`입니다. v0.3 데이터와 자동 병합·마이그레이션하지 않습니다. 사이드바·미리보기 설정도 v0.4 전용입니다.
- PDF 비동기 처리를 시작한 환자·작업 공간·역할을 확인합니다. 대상이 바뀌면 첨부를 취소합니다. 새로고침 후 파일명·크기·실제 SHA-256이 모두 같은 PDF를 재첨부하면 기존 검토 상태와 승인을 유지하며 원본 바이트만 복원합니다.
- 평가 이슈 목록이 누락되어도 원자료의 결측·상충·잘못된 필수 옵션을 다시 검사합니다. 개정 시 기존 이슈를 보존합니다. 원천자료의 대상 종류·필드·입원 건을 검증합니다.
- 환자/계획 렌더 시 이전 인쇄 DOM을 비우고, 실습 종료 중 환자 선택값이 바뀌는 문제를 수정합니다.
- 사용하지 않는 함수·상태·import만 제거했습니다. HTML/CSS 및 평가 규칙을 재설계하지 않았습니다.

## 저장과 한계

브라우저 로컬 합성 데이터만 사용합니다. 역할 선택은 교육용이며 실제 인증·권한 경계가 아닙니다. PDF 바이트는 세션 메모리에만 존재합니다. 발행은 로컬 스냅샷이고 계획 PDF는 브라우저 인쇄입니다. 서버의 원자적 발행·첨부 영구 보관·실제 환자 앱 전송은 없습니다.

손상된 저장소는 원문을 보존한 상태로 저장을 중지합니다. 저장 공간 문제나 다른 탭의 변경을 해결하기 전에 작성 중인 내용을 별도로 보존해야 합니다. 충돌 감지는 자동 병합이나 트랜잭션을 제공하지 않습니다. `fingerprint`는 변경 감지용이며 암호학적 서명이나 위변조 방지 장치가 아닙니다. 실제 임상 성능·사용성 검증은 수행하지 않았습니다.

결과·잔여 위험과 통합 제안은 [검증 보고서](../../docs/hospital-refactor/REPORT.md)를 참조하세요.
