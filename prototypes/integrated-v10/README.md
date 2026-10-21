# 병원용 통합 워크벤치 v1.0

A3 공통 사이드바·상단바·환자 선택 안에서 A1 환자 목록 → A2 평가 → A3 검토·승인·발행을 수행한다. 합성 데이터 전용 시연이며 임상 척도·실제 의료기관 인증이 아니다.

## 실행

**저장소 루트**에서 실행한다. 원본 비교 iframe도 같은 HTTP 서버에서 제공해야 한다.

```sh
python3 -m http.server 5500
# http://localhost:5500/prototypes/integrated-v10/
```

- 홈: `index.html`
- A1: `a3/index.html?screen=patients`
- A2: `a3/index.html?screen=assessment&patient=SYN-002`
- A3: `a3/index.html?screen=plan&patient=SYN-002`
- 환자용 시연 미리보기: `a3/index.html?screen=patient-preview`
- **A3 발행 연동 환자용 B:** `patient/index.html?patient=SYN-002&encounter=ENC-SYN-002-DEMO` (체험 코드 `CARE2026`는 본인인증 아님)
- 비교: `a3/index.html?screen=compare`
- 기존 `a2/index.html?patient=1` 또는 `?patient=SYN-002`는 통합 A2로 이동한다. 숫자 0/1/2도 유지한다.
- 기존 `a3/index.html?handoff=SYN-002`는 환자만 선택한다. Phase 1 인계는 A3의 **Phase 1 외부 인계함**을 펼쳐 명시적으로 반영한다.
- Phase 1 독립 A2는 `a2/legacy.html`로 보존했다. 독립 원본은 `../hospital-a2/index.html`이며 변경하지 않았다.

A1에서 SYN-002 평가 시작 → 보행/이동 변경 → **변경된 평가 A3로 인계** → 안내 항목 재검토 → 검토 요청 → 최종 승인자 역할 → 승인 → 발행 순서로 시연한다. 발행 후에는 먼저 새 버전 개정을 시작해야 한다.

## 상태와 경계

- `a2/engine.js`와 `a2/data.js`가 단일 평가 기준이다. `shared/assessment-adapter.js`가 A3 표시 형식만 변환한다. 6영역·30항목, 점수·필수 결측·상충·사회환경 복합 규칙은 원본 그대로이다.
- 미반영 평가 입력도 환자별로 저장한다. 입력 즉시 승인을 무효화하며, 반영 전에는 발행할 수 없다. 반영 후 계획 항목과 환자 공개 PDF를 다시 검토한다.
- 기존 Phase 1 schema 2/저장키를 유지한다. 기존 승인·발행 스냅샷은 조회만으로 재계산하거나 변경하지 않는다.
- SYN-001~004 학습은 별도 저장키와 `mode=study` URL을 사용한다. 실습 시작/종료 시 이동 기록을 새로 시작하며 정상 작업과 섞지 않는다.
- **이전·다음**은 현재 페이지에서 방문한 화면/환자의 이동 기록이다. 직접 진입·새로고침 시 둘 다 비활성화되며 브라우저의 외부 방문 기록으로 이동하지 않는다. 통합 홈은 항상 사용할 수 있다.
- A3의 기존 **내부 환자용 미리보기**는 그대로 유지한다. 새로 추가된 [환자용 B 통합 시연](patient/index.html?patient=SYN-002&encounter=ENC-SYN-002-DEMO)은 B v1.3 스타일시트를 그대로 사용하되, A3에서 실제로 **저장 완료한 합성 발행 기록**만 공개 허용 항목으로 보여준다. 독립 B v1.3 원본/PR #2는 수정하지 않는다.
- 환자용 B는 승인 전·미발행·철회·환자/입원건 불일치·자료 손상 시 차단한다. 새 개정 중에는 이전 현재 발행본을 유지한다. 새 버전 발행 후 새 본문을 표시한다. 다른 탭 변경은 localStorage storage 이벤트로 감지하며 실제 서버 트랜잭션이나 인증은 없다.
- 병원 A3의 '환자용 B 열기'는 `../patient/index.html?patient=SYN-002&encounter=ENC-SYN-002-DEMO` 등의 **합성 환자·입원건** 링크를 연다. 기존 '큰 화면에서 보기'는 내부 미리보기를 유지한다. B에는 홈/이전/다음 및 큰 글자 버튼이 있으며, 과거 방문 기록은 새로고침마다 초기화된다.
- 통합 B에서는 다른 환자용으로 고정된 이름·가상 예약·복약 안내·PDF·퀴즈를 재사용하지 않는다. 승인된 PDF 원본만 실제 열람·다운로드한다. 내 정보의 식별자는 읽기 전용이고, 주소·연락처는 별도의 로컬 합성 입력으로 편집한다. 이해 확인도 발행 ID별 로컬 기록이다. 원본 B 독립 시연은 그대로 보존한다. 비교 화면의 원본 입력도 독립적이며 자동 동기화하지 않는다.
- A3 작업 중 첨부 바이트는 세션에 보관한다. 새 발행 시 검토된 공개 PDF는 발행 ID별 IndexedDB에도 저장하여 B에서 열고 다운로드할 수 있다. 개정 시 PDF 재검토가 필요하며 A3 작업 세션을 새로 열었다면 원본을 다시 첨부해야 승인할 수 있다. 파일 저장 실패 시 발행하지 않는다.
- 저장 실패와 순차적인 다른 탭 변경은 저장 시점에 차단한다. 서버 트랜잭션·실시간 병합은 제공하지 않는다.
- `file://`, Safari/Firefox, 실제 인증·EMR·Firebase는 지원 검증 범위가 아니다. gh-pages 배포는 수행하지 않았다.

## 검증

```sh
cd prototypes/integrated-v10
npm test
python3 tests/patient_http.py
python3 tests/unified_http.py
python3 tests/phase1_http.py
```

Node.js 24, Python 3, Python Playwright, Chromium이 필요하다. PDF 검증에는 PyMuPDF가 필요하며 브라우저 경로는 `/usr/bin/chromium`이다. 자동 테스트는 임시 HTTP 서버와 합성 저장소만 사용한다.

전후 화면 재현(저장소 루트에서 기준선 export 후):

```sh
mkdir -p /tmp/unified-baseline
# 동일 디렉터리의 기존 파일을 덮어쓰지 않도록 빈 export 경로를 사용한다.
git archive 0bd2692ee73e360c7c5a2f5396468c5d33000cbe prototypes/integrated-v10 prototypes/hospital-a2 | tar -x -C /tmp/unified-baseline
python3 prototypes/integrated-v10/tests/unified_visual.py --baseline /tmp/unified-baseline
```

`phase1_visual.py`는 이전 Phase 1의 픽셀 동일성을 검사하는 당시의 스크립트다. 통합 레이아웃의 의도된 변경 비교에는 `unified_visual.py`를 사용한다.

[개발·회귀 검증 보고서](../../docs/integration/HOSPITAL_UNIFIED_V1_REPORT.md) · [이전 Phase 1 보고서](../../docs/integration/PHASE1_IMPLEMENTATION_REPORT.md)


## A3 → 환자 B 연계 검증 현황

실제 Node **65/65**, 환자 연계 Chromium HTTP **22/22** (전체 21건 + 추가 터치 1건), 병원 통합 **14/14**, Phase 1 **17/17** PASS. 390/768/1024/1440px과 전후 화면을 검증했다. 프로필·모의 요청·발행본별 이해 확인·승인 PDF 열람/다운로드를 제공한다. 기관 전송·실제 인증·서버 연동은 제공하지 않는다. 세부 결과와 NOT RUN/NOT VERIFIED 항목은 [A3→B 보고서](../../docs/integration/A3_PATIENT_B_V1_REPORT.md)를 참조한다.

B 화면은 환자·입원건 URL을 명시한다: `patient/index.html?patient=SYN-002&encounter=ENC-SYN-002-DEMO`. 체험 코드는 `CARE2026`이며 본인인증이 아니다. B에서 입력하는 주소/연락처는 빈 값에서 시작하는 **로컬 합성 입력**이고 A3 발행 내용을 변경하지 않는다. PDF는 A3에서 실제 파일 첨부·환자 공개·검토 후 발행한 바이트만 제공한다. 문서 누락/철회/저장 오류에는 다른 시연 파일을 대체 표시하지 않는다.

전후 B 화면 재현: 빈 디렉터리에 `git archive 3a572fd76dcb9816deef84129c6528b0949936f6 prototypes/integrated-v10`를 export한 뒤 `python3 prototypes/integrated-v10/tests/patient_visual.py --baseline <export한_저장소_루트>`를 실행한다. `main`·원본·PR #1/#2·배포는 변경하지 않는다.
