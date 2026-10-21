# 퇴원 후, 나의 하루 — 환자용 v1.3 안정화 검토본

환자용 v1.2의 UI·문구·콘텐츠를 보존한 안정화 버전입니다. 실제 환자정보·의료인 인증·EMR·Firebase·기관 전송·배포는 포함하지 않습니다. 누구나 아는 `CARE2026` 코드는 합성 환자 한 명을 여는 시연 기능이며 인증이 아닙니다.

## 실행

이 폴더에서 `python3 -m http.server 5501 --bind 127.0.0.1`을 실행합니다.

- `index.source.html`: 모듈형 환자 화면. 수정하는 원본 shell이며 `app.js`·CSS·각 모듈을 HTTP로 로드합니다.
- `preview.source.html`: 같은 앱의 개발 시연 화면. 기존 승인·발행·철회·초기화 시나리오를 유지합니다. 병원용 A1/A2/A3와 연결하지 않습니다.
- `index.html` / `preview.html`: 위 두 화면에서 생성하는 독립 HTML. JS/CSS/PDF가 내장되어 있습니다. **생성본을 수동으로 수정하지 마세요.** `python3 build_standalone.py`로 갱신합니다.

원본 v1.2는 [../patient-v12/](../patient-v12/)에 파일 해시와 함께 보존합니다. 원본의 설계 및 미래 연계 문서는 그 폴더에서 확인합니다.

## 구조 및 수정

- `data.js`: 기존 아이콘·합성 안내·도움 목록·가상 계정 기본값
- `storage.js`: profile/request·글자 크기·계획 상태 저장, v1.2 호환 및 검증
- `pdf-assets.js` / `pdf.js`: 기존 PDF/이미지 바이트와 Blob URL 생성
- `app.js`: 기존 화면 렌더링·이벤트·세션 상태, PDF 자원 정리와 오류 처리
- `styles.css`: v1.2와 바이트 동일. 색상·타이포그래피·레이아웃 재설계 없음

주소/연락처 입력은 저장 확인 전까지 세션 draft이며 글자 확대·화면 이동에 유지됩니다. 저장 실패 시 저장된 정보나 수정 차수를 갱신하지 않으며 모의 기관 요청을 허용하지 않습니다. 오류 경로에서만 안내 문구가 추가됩니다.

## 저장 호환성

v1.2의 `discharge_navigator_v12_mock_profile`(schemaVersion 1)을 검사해 주소·연락처·수정 차수·LOCAL_ONLY 요청 이력을 `discharge_navigator_v13_mock_profile`로 복사합니다. **v1.2 키는 수정·삭제하지 않습니다.** 이미 v1.3 값이 있으면 우선합니다. v1.2 글자 크기도 초기 fallback으로 읽으며 변경은 v1.3 키에만 저장합니다.

새 계획 키는 `discharge_navigator_v13_mock_plan`이며 합성 계획의 발행 여부·버전만 저장합니다. 기본 예시는 기존과 같이 승인된 v1입니다. 저장된 미발행/철회 또는 손상된 계획은 안내를 차단합니다. 같은 HTTP origin의 다른 탭에서 계획을 바꾸면 열린 화면에도 반영됩니다. 파일 URL의 저장소 공유는 브라우저별로 다를 수 있습니다.

손상된 데이터는 기본값으로 덮어쓰지 않습니다. 다른 탭의 저장과 충돌하면 현재 draft를 보존하고 저장을 중지합니다. 저장 공간 문제나 충돌을 해결하기 전에 입력 내용을 별도로 보관하세요. 개발 시연의 초기화는 v1.3 profile/요청/계획을 원래 합성 상태로 되돌리며 글자 크기는 유지합니다. 이전 v1.2 데이터를 다시 가져오지 않도록 기본 profile을 명시적으로 저장합니다.

## 검증

현재 확인 환경: Node 24.19.0, Python 3.12.14, Playwright 1.62.0, Pillow 12.3.0, `/usr/bin/chromium`. 앱 런타임 npm 의존성·API 키는 없습니다. 테스트용 Python 패키지는 가상환경에 `python3 -m pip install -r requirements-test.txt`로 설치할 수 있습니다.

```bash
node --test tests/*.test.js
python3 tests/run_checks.py
```

기존 v1.2 검사의 모든 assertion은 `tests/legacy_regression.py`에 유지했습니다. `python3 test_v12.py`도 이 검사를 호출합니다. 기본은 생성 HTML의 실제 HTTP 검증이며 다음처럼 진입점을 바꿀 수 있습니다.

```bash
PATIENT_MODE=source python3 test_v12.py
PATIENT_MODE=injection python3 test_v12.py
PATIENT_MODE=file python3 test_v12.py
PATIENT_ENTRY=index.source.html python3 tests/http_regression.py
```

결과·스크린샷·PDF 다운로드는 기본 `/tmp/patient-v13-artifacts/`에 생성하며 `PATIENT_ARTIFACTS`로 바꿀 수 있습니다. 원본 v1.2 파일은 변경하지 않습니다. `file://` 직접 접속은 현재 클라우드 브라우저 정책상 차단되어 NOT RUN입니다. 생성 HTML은 실제 HTTP 및 기존 주입 방식에서 검사합니다. 파일 실행이 검증됐다고 주장하지 않습니다.

## 남은 한계

모든 정보는 합성 데이터이며 저장소는 서버 권한 시스템이 아닙니다. 같은 origin의 스크립트나 사용자가 저장소를 직접 조작하는 것을 방어하는 제품 보안 경계가 아닙니다. 서버·기관 전송·실제 승인 확인이 없으므로 임상 안전성이 검증된 앱으로 사용하면 안 됩니다.

localStorage 사용이 차단되면 현재 세션의 철회 화면은 가리지만 상태를 새로고침/다른 탭에 영구 전달할 수 없습니다. 오류 메시지를 표시합니다. 탭 간 변경 감지는 서버 트랜잭션이나 자동 병합이 아닙니다. 로그인·문제 풀이·미저장 입력은 기존처럼 세션 단위이며 새로고침 후 가상 로그인이 다시 필요합니다.

최종 전후 결과·시각 비교·미실행 항목은 [검증 보고서](../../docs/patient-v1.3/REPORT.md)에 기록합니다.
