# MVP 워크플로·데이터·개발 계약 초안 v0.2

> **문서 상태 업데이트 (2026-10-20):** 현재 프런트엔드 첫 제품은 [환자 중심 MVP PRD v0.2](./PATIENT_FIRST_MVP_PRD_DRAFT_v0.2.md). 여기의 병원 전체 의뢰·행정 상태설계는 확장시 참고하며 초기 P0 범위가 아님.

- 작성일: 2026-10-20
- 상태: **DRAFT / 아직 구현·실제 시스템 연동 없음**
- 목적: R01/R02 조사 결과를 HTML/CSS/JavaScript 기반의 구현 가능한 화면·데이터·상태 계약으로 변환.
- 기존 설계: [PRD v0.1](./MVP_PRD_DRAFT_v0.1.md), [기술 방향](./TECH_ARCHITECTURE_DIRECTION_v0.1.md), [R01](./R01_DISCHARGE_WORKFLOW_VERIFICATION_v0.1.md), [R02](./R02_EXISTING_SYSTEM_AND_COMPETITOR_REVIEW_v0.1.md).
- 잠정 판단: 첫 사업가치 검증은 **병원 내부 발굴·사전평가·서식 준비/검토**, 의뢰·기관회신·환자포털은 단일 가상 환자 여정 완성에 필요한 최소 기능만 구현.

## 1. 문제·사업가치와 기능을 한 줄로 연결

| 검증할 문제 가설 | MVP 기능 | 테스트 지표 | 지불가치 근거 상태 |
|---|---|---|---|
| 퇴원환자 기록의 여러 장소에 정보가 산재 | 가상 EMR 정보 모으기·근거 링크 | 찾기/재입력 시간 | 미실측 |
| 공식 선별·신청·평가서식 입력의 중복 | 입력값 재활용 + 초안 자동 채우기 | 클릭·문서 작성시간·누락률 | 미실측 |
| 병원/지자체/사업별 담당 역할 차이 | 정책·병원 프로필 기반 업무경로 | 적용 가능한 프로필 수, 오류 | 미검증 |
| 평가 결과를 환자에게 전달하기 어려움 | A2 의료진 설명 모드 → B 포털 | 이해 문항·설명 시간 | 미실측 |
| 의뢰 후 처리 결과 확인이 어려움 | 의뢰/접수/수락/제공·미제공 상태 | 미회신·미완료 탐지율 | 공공망 기능 중복 가능 |
| 병원은 도입 성과를 증명해야 함 | 처리건수·시간·오류 KPI | 초기 업무 vs MVP 변화 | 목표 가설 |

**주의:** 기존 공공의료연계망이 평가·의뢰·모니터링 기능과 양방향 의뢰 추진을 공개함. 해당 기능이 전혀 없다고 주장하지 않는다.

## 2. 첫 업무 흐름: 하나의 합성 환자

1. 담당자가 가상 퇴원예정 환자를 선택한다.
2. '기관 프로필'에서 병원 유형·사업 참여·지자체 협약·서식 담당자 등이 적용된다.
3. 가상 진료기록에서 추출한 필드와 환자/보호자 확인 필드를 출처·시점과 함께 제시한다.
4. 공식 **선별 6문항** 체크리스트(별도 제도 기준), 자체 돌봄 필요 6개 영역(설계 분류)을 별도 탭/섹션으로 표시한다.
5. 누락·모순·미확인 필드를 확인하고 필요한 정보를 보완한 후 모의 신청/평가서 초안을 작성한다.
6. 의료진/담당자가 가상 초안을 수정·승인하거나 보류한다. '최종 지자체 판정' 상태는 담당자의 승인과 동일하지 않다.
7. 의뢰를 모의 전송하고 가상 지자체/기관이 접수, 추가자료 요청, 수락/거절, 서비스 제공 결과를 회신한다.
8. 승인·공개된 돌봄계획·진행상태만 A2 상담모드와 B 환자 보기로 전파한다.
9. D 관리자 화면에서 처리 소요시간, 결측 보완, 상태 미완료 등을 모의 이벤트 기반 집계한다.

## 3. 화면 계약

### A1 담당자 워크벤치 (우선)
- 상단: 오늘 처리해야 할 작업/기한 만료/서류 보완/기관 회신 대기.
- 본문: 환자 목록(가명 아닌 완전한 허구 ID), 검토사유, 정보 완결성, 정책 경로, 담당자, 상태, 행동 버튼.
- 액션: 환자 선택, 검토 시작, 평가 재실행(기존 승인 미덮어쓰기), 서류 검토 이동.
- 검색/필터: 업무상태·병원 프로필·시연환자 유형.
- 성공: 제출 서류 준비가 기준 수기 절차보다 빠르고, 누락·중복 오류가 줄어드는가.

### A2 환자 분석·상담
- 의료진 화면: 평가 출처, 결측, 규칙버전, 선택한 돌봄 필요영역, 공식 선별 vs 자체 평가 구분.
- 상담 화면: 임상적 단정·미승인 AI 점수 미노출, 확정·검토 중 표시, 인쇄용 요약 후보.
- 성공: 설명 과정에서 'AI가 최종 지원을 승인했다'는 오해가 발생하지 않는가.

### C 서식·의뢰
- 필수정보 미확인 시 초안 생성 자체는 가능하되 '검토완료/가상전송'은 막거나 추가확인 요구.
- 동의 상태와 실제 복지지원 자격 판정을 구분.
- '요청/접수/보완요청/수락/거절/서비스개시/제공완료/미제공' 분리.
- 정책기간 적용 여부와 기관별 수가/수당 경로는 **검토 안내**, 자동 청구 기능 아님.

### B 환자·보호자 포털
- 본인/보호자에게 공개할 수 있는 승인된 설명·서비스 예약/진행정보만 독립적으로 표시.
- 의료진 내부 메모/미확인 급여상태/승인전 추천 자동공개 금지.
- 실제 인증체계가 없는 첫 프런트엔드에서는 역할전환을 **모의 프리뷰**로 설명.

### D 성과
- 전체 평가 후보 / 추가정보 요청 / 검토 완료 / 모의 의뢰 / 모의 수락 / 실제 제공 완료(모의) 각각 별도 집계.
- 완료율 분모와 분자, 날짜별 처리량 정의 공개.
- 이 지표들은 **시연용 이벤트**이므로 사업효과 실증 결과라고 소개 금지.

## 4. 기관별 프로필 예시 (확정 전)

기관 프로필 스키마 제안:
- institutionId (fictional), hospitalCategory, participatingPrograms, partnerMunicipalityIds, intakeStaffRole, evaluationStaffRole, finalReviewRole, formsRequired, acceptedReferralChannel, applicablePolicyVersion.
- profile override는 실제 현장 업무 조사에서 확인된 값만 '정식'으로 등록.
- 초기 시험 프로필은 서로 다른 역할 분담을 가정한 **가상 구성**임을 표시.
- 병원 역할 차이는 데이터·설정으로 처리하고 앱을 병원별로 복제하지 않는다.

## 5. 공식/자체/서비스 관련 정보의 분리

| 데이터 분류 | 예시 | 시스템의 허용 출력 |
|---|---|---|
| 법정/공식 선별에 쓰는 정보 | 퇴원예정지, 독립생활 상태, 연령, 보호자 여건 등 | 해당 경로의 규칙 확인 후보·결측 |
| 자체 돌봄 필요 영역 | 의료·간호·약료·기능·사회환경·연속성 | 추가 검토가 필요한 영역·근거 |
| 서비스 프로그램 조건 | 일반 통합돌봄/퇴원 후 긴급 생활지원 | 요건 체크리스트·기한 알림 |
| 병원 업무 권한 | 평가/검토/결재/의뢰 담당자 | 행동 허용 여부(시연 시 규칙 검증) |
| 지자체 공식 결정 | 종합판정·개인별 지원계획 | 확인된 회신 없이는 '결정됨' 표시 금지 |

## 6. 데이터 모델 제안(초기 명세 수준)

- patients: fake patientId, demographicSummary, consentStatus.
- encounters: fake encounterId, patientId, admitDate, plannedDischargeDate, dischargeDestination.
- observations: sourceType, fieldKey, value, observedAt, isSynthetic=true, confidenceStatus (KNOWN/UNKNOWN/CONFLICTING/NOT_APPLICABLE).
- institutionProfiles: participatingProgramIds, roleResponsibilities, templateMapping, municipalityChannel.
- programRules: programId, policyVersion, effectiveFrom, eligibilityQuestions, requiredEvidence, officialSource.
- evaluations: evaluationId, encounterId, officialScreeningAnswers, careDomainFindings, needsReviewReasons, evidenceRefs, ruleVersion.
- draftForms: templateId, version, fields, fieldSources, missingFields, validationIssues.
- reviews: reviewId, evaluationVersion, reviewerRole, decision, timestamp, amendments.
- referrals: referralId, approvedReviewId, receiver, sentAt, mockStatus, responseHistory, serviceOutcome.
- publishedCarePlans: patientId, approvalRef, limitedVisibleFields, publishedAt.
- auditEvents: actorSimulation, operation, previousState, nextState, timestamp, entityRef.

모든 ID는 실환자번호/주민등록번호가 아닌 가상 식별자. 이 MVP의 데이터 모델은 정부 표준 서식 그 자체가 아니다.

## 7. 기술 구조

초기 기술: HTML/CSS/Vanilla JavaScript ES modules. 예시 개발 구조:

    /index.html
    /src/styles/
    /src/ui/
    /src/domain/screening.js
    /src/domain/assessment.js
    /src/domain/form-mapping.js
    /src/domain/workflow.js
    /src/domain/publishing.js
    /src/data/mock-patients.js
    /src/data/mock-repository.js
    /src/app.js
    /tests/

장기 저장/인증은 Firebase 별도 프로젝트(가상 자료 전용)로 확장하되, 현재 프런트엔드 코드의 role simulation은 실제 환자 접근통제로 주장하지 않는다.
환자·보호자 공개 데이터는 승인된 snapshot으로 구성하고, Firestore Security Rules를 도입할 때 서버 권한·거부 테스트를 별도로 구현한다.

## 8. 테스트 및 안전 계약

- 결측 입력에서 자동 확정 판정하지 않기.
- 선별지원 대상 후보라도 공적 지원 '승인'으로 표시하지 않기.
- 승인 전 의뢰 전송 불가, 보류/반려에서는 전송 불가.
- 정책 변경 이후에도 기존 평가/승인 당시 적용한 version과 근거 보존.
- 같은 환자에게 같은 의뢰를 두 번 전송하는 중복 처리 차단.
- 기관 거절, 미응답, 보완 요청, 서비스 미제공의 예외 흐름.
- 환자 A와 B의 상태/기록 혼합 금지.
- 저장·복원·초기화 후 감사기록과 게시된 환자 설명의 일관성.
- 공개 데모에 실제 개인정보/내부 의료기관 데이터/기밀 첨부 금지.

## 9. R01-C·R02 이후 남은 게이트

- [ ] 4월 개정 신구 대비표 및 서식의 필수 필드·서명 조건 원문 직접 확인.
- [ ] 기존 EMR/공공망의 서식 자동작성 지원 범위, 양방향 회신 실사용 여부 검증.
- [ ] 실제 구매·사용자 역할과 병원별 업무 경로 인터뷰.
- [ ] R05 환자군별 통계·질환·기능·사회적 공변량에 기반한 합성 사례 데이터 확정.
- [ ] UI 와이어프레임, 상태 전환표, 정확한 폼 필드 스키마 승인.
- [ ] 무단 상태 변경, 유실, 접근 범위, 데이터 변형 테스트 자동화.

**이 문서는 실제 환자정보를 취급하지 않으며, 계획된 기능을 구현 완료로 표현하지 않는다.**


## 10. 국내 실증연구 반영 (2026-10-20)

새 근거: [R03 국내 병원 실증](./R03_DOMESTIC_FIELD_EVIDENCE_v0.1.md) 및 [BMC 2024 실무자 인터뷰](https://doi.org/10.1186/s12913-024-10720-x).

### 업무흐름 요구사항 강화

- 최초 환자 선별·복합욕구 분류·환자/보호자 동의·전문평가·퇴원계획·지역기관 의뢰·기관회신·사후관리 **각기 다른 단계**를 기록.
- '검토 필요', '제도상 잠정 대상', '환자가 동의하지 않음', '지원대상 아님', '기관 수락', '실제 제공 완료'를 하나의 승인 상태로 합치지 않는다.
- 의료진 승인 없이 신규 의뢰나 환자 공개 데이터를 생산하지 않는다. **환자가 동의하지 않은 상태**를 소프트웨어 오류나 환자 의사결정 실패로 표시하지 않는다.
- 평가 근거의 업데이트와 의뢰 상태의 업데이트는 서로 다른 버전·이력으로 관리.
- 병원 내 진료/간호/사회사업 담당별 역할 설정과 인수인계 목록, 기관별 연락경로·문서템플릿 후보를 유지.
- 2026 실제 현장에서 공공망의 연동 기능이 어디까지 구현됐는지 모르는 상태이므로 **병원별 중복입력 감소를 확정 효과로 주장하지 않음**.

### MVP 검증 기능 추가

1. **모의 동의 흐름**: 동의/거절/설명요청/확인불가의 구분(실제 법률상 동의 수집이라고 주장 금지).
2. **서식 자동채움 성과**: 대상 필드 수, 근거 있는 자동채움 수, 추가확인 수, 잘못 채워진 필드 수를 테스트.
3. **연계 예외**: 대상부적격·자원부족·예산종료·미회신·대상자 거절의 각각 다른 사유.
4. **사용자 역할별 작업량**: 간호사·사회복지사·검토 담당자가 수작업 대비 실제 몇 초·몇 번 클릭을 줄였는지 측정할 테스트 스크립트.
5. **경제성 보고**: 임의 인건비와 처리건수를 설정하는 시뮬레이션은 가설로 표시하고, 추후 실측값으로 교체 가능하게 모듈 분리.
6. **환자 설명**: 스크리닝에서 후보로 선정되었어도 국가 지원확정이라고 안내하지 않는다.

### 테스트 데이터 건수

초기 4~6개 **정성적 합성 사례**는 다양한 경로와 오류를 테스트하는 것이 목적. 2021~2022 서남병원 집계의 5.2% 복합욕구군 비율을 그대로 2026 퇴원환자 모집단에 적용하지 않는다.
