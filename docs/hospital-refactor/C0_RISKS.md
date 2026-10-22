# C0 — 기준선과 위험 분류

2026-10-21, `main` = `f87402f8915f23b2e6da55079e770c49733cb140`. 필수 파일과 제공 체크섬 모두 확인. ZIP SHA-256 = `c30c6254bf02bc1785526ff43f78e19791f4eef02c23f8faa99b82912f5b8b56`. 전체 파일 해시는 `baseline-sha256.json`에 기록.

범위는 A2 v0.5 동결, A3 v0.3 원본 등록, A3 v0.4 독립 후보. 첨부 문서의 ZIP 필수·로컬 브랜치 한정 지침은 이번 사용자 요청의 브랜치 푸시·Draft PR 전달 지시로 대체한다. 누락 원본을 재개발하거나 A2/A3를 통합하지 않는다.

| 분류 | 원본 파일/함수 | 재현·원인 | 최소 수정/회귀 위험 | 검증 |
|---|---|---|---|---|
| BLOCKER | workflow.js / blockers, makeRevision | 평가값 결측인데 이슈 목록을 누락시키고 항목을 확인하면 승인 가능. 게이트가 파생 이슈 배열만 신뢰하며 개정 시 이슈를 비움 | 평가값에서 게이트 재계산·개정 이슈 보존. 기존 차단 건수/완주 회귀 확인 | safety.test.js 첫 2건, 원본 FAIL → 후보 PASS |
| BUG | source-library.js / usableSource | 누락 issue 대상에서 예외, 미지의 targetType도 issue로 처리 | 명시적인 대상 종류·null 검사. 정상 근거 선택 보존 | safety.test.js 3~5건 |
| BUG | app.js / addDoc | 해시 완료 전 환자 또는 실습 모드를 전환하면 새 get() 대상에 PDF 등록 | 시작 레코드·저장소·역할 캡처 후 재검사. 대상 변경 시 취소 | HTTP 안전성 첫 2건, 원본 FAIL → 후보 PASS |
| BUG | app.js / 저장 초기화·save | 손상 JSON은 빈 저장소로 덮어쓰고 동일 schema의 타 환자 레코드는 그대로 표시 | storage.js에서 식별/형태 검증, 원문 보존·저장 중지. 자동 복구 대신 명시적인 실패 | corrupt/foreign HTTP 검사, storage.test.js |
| BUG | app.js / save | 두 탭이 읽은 저장소 전체를 교대로 쓰면 먼저 저장한 변경 유실 | 마지막 읽은 직렬화 값 확인 후 쓰기, 충돌 표시. 자동 병합은 제외 | stale-tab-before.log 원본 FAIL, 후보 HTTP/Node 검사 |
| BUG | app.js / patient-select change | leavePractice가 render하면서 이벤트 target.value를 이전 환자로 바꿈 | 선택값을 렌더 전에 캡처 | patient picker HTTP 검사, 원본 FAIL → 후보 PASS |
| BUG | app.js / buildPrint, render | 환자 변경 후 인쇄 영역에 이전 환자의 내용 잔류 | 화면/계획 렌더 시 인쇄 DOM 비우기 | print-sheet HTTP 검사, 원본 FAIL → 후보 PASS |
| BUG | app.js / addDoc | 승인 후 새로고침하면 파일 바이트가 사라짐. 같은 PDF를 다시 첨부해도 새 문서만 생기고 기존 첨부 미복원 | 파일명·크기·실제 SHA-256 일치 시 기존 ID로 복원. 다른 바이트는 승인 복원 불가 | pdf-restore-before.log 원본 FAIL, HTTP 실제 해시 검사 PASS |
| BUG (기준선 보존) | A2 tests/http_ui.py | 이전 버튼 이름·A3 문구·샘플 상태 기대값이 현재 UI와 다름 | A2 테스트는 그대로 두고 후보의 별도 테스트에서 현재 계약 검증 | 원본 FAIL / a2_http.py PASS |
| MAINTAINABILITY | app.js 저장/학습/이벤트 | 렌더링과 저장 검증이 한 파일에 섞임 | 저장 경계만 모듈화, 불용 상태·함수 제거. CSS/렌더 분할은 보류 | 전체 기존 기능 + 24쌍 픽셀 비교 |
| OPTIONAL / 범위 밖 | 로컬 역할·발행 | 실제 의료인 인증·서버 저장·원자적 PDF 발행 없음 | 구현된 것처럼 표현하지 않고 후속 계약으로 제안 | NOT IMPLEMENTED |

A2/A3의 30항목 이름·필수 여부·선택지·점수는 Boolean 필수값 정규화 후 동일하다. A3 원본은 배열 스키마, A2는 객체 스키마이며 A2의 상세 설명/trace 형식은 다르다. 통합하거나 원본 엔진을 교체하지 않았다. 모든 선택지·결측·상충·알 수 없는 필수 입력에 대해 양쪽 엔진의 결과 동등성을 별도 회귀 검사한다.
