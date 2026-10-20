# 기술 아키텍처 방향 v0.1 — HTML/CSS/JavaScript → Firebase

- 상태: **DRAFT / 개발 착수 전**
- 날짜: 2026-10-20
- 실제 코드, Firebase 프로젝트, Hosting, 사용자 계정, DB는 아직 만들지 않음.

## 1. 단계별 기술 결정

### Stage F — 공개 가능한 가상 데이터 프런트엔드
- HTML5 + CSS3 + **JavaScript(ES modules)**; Java와 JavaScript는 서로 다른 언어.
- 초기 Vanilla JS를 기준으로 하되 화면 수·상태 복잡성 증가 시 UI 프레임워크 도입 여부 재평가.
- A1 업무 대기열, A2 분석/상담, B 환자·보호자 보기, C 모의 의뢰, D 관리자 성과.
- 프런트엔드 시연은 로그인처럼 보이는 역할 전환을 제공할 수 있지만 **실제 접근통제·인증으로 주장하지 않는다**.
- 가상 환자·가상기관만 사용. 공개 GitHub/Pages에 실환자·실기관 비밀값·교수 제공 자료 업로드 금지.

### Stage M — 백엔드 없이도 교체 가능한 경계 설계
- 데이터 입력: `mockPatientRepository`, 추후 `firebasePatientRepository`처럼 동일한 계약으로 교체.
- 도메인 모듈: `eligibilityScreening`, `careNeedsReview`, `assessmentEvidence`, `reviewWorkflow`, `referralWorkflow`, `patientPublication`, `metrics`.
- UI 렌더링과 업무 규칙/저장 로직 분리.
- 필수 도메인 개념: 환자 ID와 방문/입원 에피소드 ID, 평가 버전, 근거/결측, 승인본, 의뢰 별도 상태, 감사 이벤트.
- 초기 저장은 가상 데이터의 로컬 개발·시연 편의용. 새로고침/저장 실패/스키마 변경/초기화 테스트 명시.

### Stage B — 향후 Firebase 백엔드
- Firebase Authentication: 시연용 계정(실제 개인정보 아님), 인증 상태.
- Cloud Firestore: 역할별 가상 데이터·검토·의뢰 정보 및 변경 이력.
- Firebase Hosting: 가상 데이터 데모 배포 여부 별도 승인.
- Cloud Functions 등 신뢰할 수 있는 서버 측 처리: 다중 문서 승인·의뢰 등의 민감한 상태 전환·감사 로직 필요 시 검토.
- Security Rules: 기관별 격리·환자 본인/위임된 보호자·담당 전문직 최소권한 테스트.
- Local Emulator Suite: 권한 허용/거부, 동시수정, 재접속, 삭제, 의뢰 중복·승인 전 접근 테스트.
- 사용량·과금·장애 복구, DB 리전, 인덱스, 가용성 등은 실제 사용량 요구가 확정되면 결정.

### Stage C — 향후 실기관 제품
- 실환자 데이터 처리 전 의료기관 법무·정보보안·개인정보·IRB/임상검증·규제 및 계약에 대한 별도 검토·승인.
- Firebase를 선택했다는 이유만으로 의료데이터 취급에 적합하다고 판단하지 않는다.
- 원격 기관 연동(FHIR/KR Core 등), EMR 어댑터, 실제 의뢰/결과 회신은 MVP 범위 밖.
- 의료진 승인 데이터와 환자 공개 데이터를 분리; 클라이언트 JavaScript 단독으로 최종 승인 불가.

## 2. 프로젝트 간 안전 분리

- AI Care Transition Platform과 One Piece 프로젝트는 **Firebase 프로젝트, Firestore 데이터베이스, 인증 사용자 풀, Security Rules, Hosting 설정을 분리**한다.
- 일반적인 Firebase 사용 경험·코드 패턴과 비민감 공통 컴포넌트는 재사용 가능하지만, 환자/가상기관 데이터나 권한 정책을 섞어서는 안 된다.
- Firebase 공식 문서도 개발·테스트·운영 환경의 프로젝트 분리를 권장한다.

## 3. 권장 소스 구조(아직 생성하지 않음)

```text
index.html
src/
  styles/
  ui/
  domain/
    screening.js
    assessment.js
    review-workflow.js
    referral-workflow.js
    patient-publication.js
  data/
    mock-data.js
    repository-interface.js
    mock-repository.js
    # firebase-repository.js (추후)
  app.js
tests/
docs/
```

별도 역할 화면은 정보공개 범위가 다르므로 시각적 탭 하나로만 보안 분리를 해결하지 않는다.

## 4. 보안·검증 우선순위

- 직접 URL 접근 시 타인 환자 기록 노출 여부(향후).
- Firestore Rules에서 비인증 읽기/쓰기 차단, 기관 간 접근 거부, 환자-보호자 위임 경계, 승인 전 공개 차단.
- Admin SDK 등 서버 클라이언트는 Firestore Security Rules를 우회하므로 서버 IAM과 권한 검증 별도 필수.
- 보안 규칙은 저장소에 명시적 코드로 두고 에뮬레이터 자동 테스트를 통과한 경우에만 배포.
- Public 저장소에는 실환자정보·실제 API 비밀값·서비스 계정 키를 절대 커밋하지 않음.

## 5. 공식 기술 참고

- Firebase 환경 분리: https://firebase.google.com/docs/projects/dev-workflows/overview-environments
- Firestore 보안 설계: https://firebase.google.com/docs/firestore/security/overview
- Security Rules 기본: https://firebase.google.com/docs/firestore/security/get-started
- 에뮬레이터 기반 테스트: https://firebase.google.com/docs/firestore/security/test-rules-emulator

**이 문서는 기술 후보와 안전 경계의 초기 합의이며, 서비스 인프라·Firebase 계정 또는 의료용 DB 생성 승인이 아니다.**
