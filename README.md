# AI 기반 퇴원·지역사회 돌봄 전환관리 플랫폼

> **현재 제품 방향(2026-10-20): 환자·보호자 중심 퇴원안내·돌봄관리 서비스** / 사업·MVP 기획 단계 / 가상 데이터 전용

국내 퇴원환자가 자신의 상태와 퇴원 후 **오늘 해야 할 일, 승인된 복약·자가관리 안내, 다음 외래 일정, 주의 상황과 문의처, 필요시 지역사회 돌봄 정보**를 이해하고 실천하도록 돕는 서비스를 설계하고 있습니다.

의료진이 가상 퇴원정보에서 계획 초안을 작성·검토·승인하면, 환자·보호자에게 이해하기 쉬운 행동 중심 안내를 제공하는 **B2B2C 사업 가설**을 검증합니다. 병원 및 지자체의 공식 진료·지원계획과 제품의 연구용 평가·안내는 명확히 구분합니다.

**현재 한계:** 실제 의료기관 제휴/유료 고객/실환자정보/임상 성능 검증은 없으며, 병원용 A2는 가상 데이터로 작동하는 연구용 **평가 워크벤치 목업**을 포함하지만, Firebase·실제 병원 연계·실환자 인증·임상 예측모델은 구현되지 않았습니다. 환자용 시안은 이 저장소에 통합 배포하지 않았습니다.

## 현재 기준 문서 (ACTIVE DRAFT)

1. [환자 중심 사업계획서 — 교수님 기본정보 5개 + 필수정보 12개](docs/ASSIGNMENT_BM_PATIENT_FIRST_DRAFT_v0.2.md)
2. [R00~R18 환자 중심 검증 로드맵 v0.2](docs/RESEARCH_ROADMAP_PATIENT_FIRST_v0.2.md)
3. [R00 환자·보호자 문제 및 사용성 검증 시작안](docs/R00_PATIENT_AND_CAREGIVER_DISCOVERY_v0.1.md)
4. [R00/R13 퇴원환자 이해도·자가관리·디지털 접근성 논문·공식조사 검증](docs/R00_R13_EVIDENCE_REVIEW_DISCHARGE_PATIENT_CAREGIVER_v0.1.md)
5. [환자 중심 모바일 UX/UI 설계 v0.3 — 정보구조·화면·접근성·상태](docs/PATIENT_FIRST_MOBILE_UX_UI_DESIGN_DRAFT_v0.3.md)
6. [환자 중심 MVP PRD v0.2 — HTML/CSS/JavaScript](docs/PATIENT_FIRST_MVP_PRD_DRAFT_v0.2.md)
7. [환자 중심 피벗 배경·사업모델 비교](docs/PATIENT_FIRST_STRATEGY_PIVOT_DRAFT_v0.1.md)
8. [2026년 4월 통합돌봄 개정 HWPX 검증 결과](docs/R01C_APRIL_2026_AMENDMENT_VERIFIED_v0.2.md)
9. [기술 아키텍처 — Vanilla JS → 향후 Firebase](docs/TECH_ARCHITECTURE_DIRECTION_v0.1.md)

## 보존한 연구·이전 설계 (LEGACY / REFERENCE)

- [기존 병원 업무 중심 BM 5+12 v0.1](docs/ASSIGNMENT_BM_5PLUS12_DRAFT_v0.1.md)
- [기존 병원 업무지원 수익모델 v0.5](docs/BUSINESS_MODEL_DRAFT_v0.5.md) — **가격·3개년 매출 가정은 새 BM에 유효하지 않음**
- [이전 R01~R18 연구 로드맵](docs/RESEARCH_AND_EVIDENCE_PLAN_v0.1.md)
- [R01 퇴원연계 제도](docs/R01_DISCHARGE_WORKFLOW_VERIFICATION_v0.1.md)
- [R02 기존 공공의료연계망·경쟁](docs/R02_EXISTING_SYSTEM_AND_COMPETITOR_REVIEW_v0.1.md)
- [R03 국내 병원 실증](docs/R03_DOMESTIC_FIELD_EVIDENCE_v0.1.md)
- [R04 병원 구매·공공조달](docs/R04_PROCUREMENT_AND_PRICING_EVIDENCE_v0.1.md)
- [R05 합성 환자군 전략](docs/R05_SYNTHETIC_COHORT_STRATEGY_DRAFT_v0.1.md)
- [기존 MVP PRD v0.1](docs/MVP_PRD_DRAFT_v0.1.md)
- [병원 중심 업무·서식·데이터 계약 v0.2](docs/MVP_WORKFLOW_AND_DATA_CONTRACT_DRAFT_v0.2.md)
- [기존 발표 근거 레지스터](docs/EVIDENCE_REGISTER_v0.1.md)

## 환자용 모바일 웹앱 v1.3 — 안정화 검토본

- [v1.3 실행·개발·테스트 안내](prototypes/patient-v13/README.md) · [모듈형 원본](prototypes/patient-v13/index.source.html) · [독립 HTML](prototypes/patient-v13/index.html)
- [v1.2 보존 원본](prototypes/patient-v12/README.md) · [전후 검증·잔여 위험](docs/patient-v1.3/REPORT.md)
- 합성 환자 한 명의 독립 시연 앱입니다. 병원용 A2/A3 정식 통합·실제 인증·기관 전송·배포는 포함하지 않습니다.

## 병원용 A2 평가 워크벤치 (디자인 승인 기준선 v0.5, 2026-10-21)

- [A2 목업 실행 — 독립 HTML](prototypes/hospital-a2/preview.html) · [모듈 소스](prototypes/hospital-a2/index.html)
- [README/실행·테스트 안내](prototypes/hospital-a2/README.md) · [빠른 사용 설명서](prototypes/hospital-a2/QUICK_GUIDE_A2_v0.5.md)
- [디자인·검증 기록](prototypes/hospital-a2/DESIGN_REVIEW_v0.5.md) · [다음 채팅 인수인계](prototypes/hospital-a2/NEXT_CHAT_HANDOFF.md) · [Codex 작업 후보](prototypes/hospital-a2/CODEX_WORK_SCOPE_v0.1.md)
- 포함: 6개 관리 필요도 영역·30개 입력 후보·가상 환자 3명·규칙기반 업무 검토등급. **정식 임상 위험예측/진단/퇴원 허가 기준 아님.**
- A1·A3는 목업 내 미리보기 단계. 의료진 실제 승인/환자 앱 발행/기관 전송은 미구현. 운영·임상 검증과 기능 승인은 별개입니다.

## 운영·안전 원칙

- 확인된 근거/출처, 사용자 인터뷰 실측, 사업·가격 가설, 향후 목표를 구분.
- 환자·보호자에게 공개하는 정보는 **가상 의료진의 검토·승인을 거친 가상 안내**로 제한.
- 기존 규칙기반 자동화나 템플릿만으로 임상적 AI 성능이 검증됐다고 주장하지 않음.
- 실환자 차트/식별정보, 병원 내부 정보, 외부 저작물 원문, Firebase 비밀키를 Public GitHub에 업로드하지 않음.
- 최초 구현은 HTML/CSS/JavaScript(ES modules), 서버는 향후 **별도 Firebase 프로젝트·모의 데이터**에서만 검증.
- 실제 수익모델과 의료기관 구매 가능성은 검증되지 않았음.
