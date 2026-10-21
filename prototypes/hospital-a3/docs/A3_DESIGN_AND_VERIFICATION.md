# A3 v0.1 상세 설계·검증 계약

2026-10-21 · 상태: 작동하는 연구용 독립 프로토타입. 실제 병원 제품이 아니다.

## 제품 계약

A1 환자목록 → **A2 v0.5 사용자 승인 워크벤치** → **A3 v0.1 (이 프로토타입)** → 환자용 v1.2 (독립 보존, 실제 연결 전).

- 레이아웃: A2와 동일한 다크 포레스트 그린 `#214B3B` 사이드바(펴짐 242px/접힘 78px), 2열 계획 편집/환자 미리보기, 1024px 이하 세로 배열.
- 화면: A3-01 평가 스냅샷, A3-02 근거·상충 검토, A3-03 계획 편집, A3-04 PDF/공개 미리보기, A3-05 모의 승인, A3-06 발행·이력.
- A2의 0~3/미평가/상충은 업무 검토용 규칙. 발행 가능 여부와 별개. 0등급이라도 기본 퇴원안내를 생략하지 않음.
- 기본 환자 안내: 오늘 해야 할 일, 복약·약물, 외래·검사, 주의사항, 도움·문의, 생활·이동 지원. 근거 없는 특정 처방·처치 지시를 자동 생성하지 않음.
- 사용자가 선택한 정책: **핵심 미해결 사항이 남은 경우 전체 계획 발행 보류**, PDF 첨부 + PDF 출력 지원.

## 데이터 모델

| 개체 | 시연 구조 | 생산/보존 규칙 |
|---|---|---|
| AssessmentSnapshot | `assessment.id/ruleVersion/capturedAt/values/domainResults` | A2와 복사된 합성 평가 데이터. 읽기 전용. 원본 A2와 실시간 연동 아님 |
| ReviewIssue | `id/domain/title/reason/status/source/resolution/reviewer` | A2 누락 또는 `CONFLICT`, 약물 `reconciliation=conflict`에 별도 발행 차단 이슈 |
| PlanItem | `id/section/title/text/source/verified/visibility` | 원천 기록 참조 + 직종 확인 필요. 공개/내부 분리 |
| DocumentRecord | `id/name/size/fileHash/visibility/status` | 파일 원본은 메모리, 메타데이터는 localStorage. 환자 공개 문서 미검토 시 차단 |
| CarePlanVersion | `draft.version/status/items/docs/issues/approval` | 승인 후 변경 시 기존 승인 무효화; 발행 후 수정은 새 버전 |
| ApprovalRecord | `by/role/at/digest` | 모의 최종 승인자의 지문; 실제 신원 인증 아님 |
| PublicationRecord | `id/snapshot/status` | 환자 공개 필드 화이트리스트; 기존 발행본 이력 보존 |
| AuditEvent | `at/role/event/details` | 시연 120개 최근 이벤트 보존. 실제 변조방지 로그 아님 |

## 상태 전이

- `DRAFT → REVIEW_REQUESTED → APPROVED → PUBLISHED`.
- `REVIEW_REQUESTED → CHANGES_REQUESTED → DRAFT`.
- 수정 시 `REVIEW_REQUESTED`/`APPROVED`를 `DRAFT`로 되돌리고 승인 지문 제거.
- 최초 승인 시 초안 `0.1`을 `1.0`으로 확정. 발행 이후 개정은 `2.0`, `3.0` 순.
- `PUBLISHED → (새 버전 DRAFT + 기존 PUBLISHED 유지) → 새로운 PUBLISHED` 시 이전 버전 `SUPERSEDED`.
- `PUBLISHED → REVOKED`는 최종 승인자 역할에서만 가능(모의 권한 검사).
- 블로커 = 미해결 ReviewIssue, 미확인/근거 누락 환자 공개 PlanItem, 필수 섹션 누락, 환자 공개 PDF 미검토·원본 부재.

## 코드상 발견한 A2 경계

- A2 `reconciliation: 'conflict'`는 자체 엔진상 tier 3 옵션이어서 일반 `CONFLICT` 선택에 따른 상태 `CONFLICTING`과 다르다. A3는 **A2를 수정하지 않고** 자체 HARD 이슈를 추가한다.
- A2가 보유한 30개 입력은 상태 선택값이며 실제 처방 원문·환자별 진료시간·연락처를 포함하지 않는다. 계획에 텍스트가 생겨도 자동으로 의료적 근거로 취급하지 않는다.
- 공식 통합돌봄 선별 6문항과 제품 자체 6영역을 혼합하지 않는다.

## PDF 기능 경계

- 첨부: 브라우저 환경 `crypto.subtle` 요구, 파일명 `.pdf`, 4MB 이하, `%PDF-` 시작 확인, SHA-256 digest 작성. 악성 PDF 탐지·전자서명은 미구현.
- 계획 PDF: print-only DOM → 브라우저 `인쇄 > PDF 저장`; 시연 SYN-002 발행 v1.0에서 **실제 PDF 1쪽 생성 및 한글 추출 확인**.
- **원자적 발행 계약 미구현**: PDF 생성 파일이 앱 저장소의 승인 스냅샷과 동일한지 자동 hash 검증하거나 저장 완료까지 모의 발행을 지연하지 않음. 실제 통합 승인 이전에는 구현 필요.

## 테스트 결과

| 범위 | 결과 |
|---|---|
| Node 도메인 테스트: 9개 | PASS |
| Chromium 주입 UI·상태·반응형 검사: 32개 | PASS |
| 반응형 너비: 320/390/800/801/1024/1440px | PASS, 가로 넘침 없음 |
| SYN-003 블로커/승인 차단 | PASS |
| SYN-002 요청→권한 검사→승인→발행→개정 | PASS |
| 환자 공개 데이터에서 내부 source/reviewer 식별정보 제거 | PASS |
| PDF 합성 시연 계획 1쪽 출력·한글 및 v1.0 추출 | PASS |
| PDF 첨부 UI 동작 | PASS (Chromium 주입시 WebCrypto test-stub, **암호학 검증 아님**) |
| 모듈형 `index.html` 실제 HTTP 탐색 | NOT RUN (실행 환경 차단) |
| 실제 `file://` 탐색, 저장 후 새로고침 복원, 실제 브라우저 WebCrypto SHA | NOT RUN (환경 제한) |
| 의료인 실제 사용성·임상 유효성·실서비스 보안 | NOT RUN |

## 다음 구현 전 주요 위험

1. 환자별 입력·파일 저장을 실사용 가능한 안전한 서버 저장소와 접근통제로 바꿔야 함. 현재 localStorage는 보안 제어가 아님.
2. 평가 A2와 A3 사이에서 같은 환자·입원 건·스냅샷 버전의 일치 검증이 필요. 현재 합성 데이터 고정 복제.
3. 의사·간호사·약사·최종승인자의 실제 책임 범위와 예외 승인 조건을 기관 정책으로 검토.
4. 처방/진료 지시·교육자료 원문·첨부 공개 범위 및 보호자 동의를 별도 출처로 관리.
5. PDF 생성/검증/내구 저장을 발행과 원자적으로 결합하고 중복 요청 보호·감사 로그 변조방지를 구현.
6. A3 초안 카드 구성 및 보호자에게 공개할 최소항목을 실제 의료진과 사용자 테스트로 검증.
