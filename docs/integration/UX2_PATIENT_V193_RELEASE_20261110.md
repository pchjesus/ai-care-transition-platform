# CareBridgeLab 의료진 UX2 v0.7 + 환자 B v1.9.3 통합 릴리즈 기록

- 작업일: 2026-11-10
- 상태: 합성 데이터 기반 **대학생 간호 창업 MVP**, 실제 의료기관 제휴/EMR 연동/임상 검증/정식 사용자 인증 아님.
- 원본 기준: `main@f7964b6`; 통합 개발 `feat/ux2-v193-patient-integration`.
- 디자인 출처: 합성 이정희님 독립 예시 `patient/v19-3.html`의 **따뜻한 아이보리·마린 블루·절제된 살구색**을 공통 환자 UI의 계층에 맞춰 이식.
- **연결 경계:** 독립 이정희님 가상 PDF는 오직 독립 예시에 남기고, 실제 A3가 발행한 환자 B에는 독립 사례의 약/일정/주소/PDF를 섞지 않는다.

## 반영된 사용자 화면

1. **의료진:** `prototypes/hospital-ux2-v07/index.html` 유지. A1→A2→A3와 역할별 검토/최종 승인/발행/개정/철회. 신규 인쇄 버튼은 검토용 초안과 유효 발행 스냅샷을 구분하고 검토용 경고 표시. 진료 목적지 상세 정보는 공식 명칭·주소·좌표·HTTPS 출처를 입력하는 선택형 편집 섹션에 배치; 의사/최종 승인자만 확인 가능하고 데이터 수정은 검토·발행 상태를 무효화.
2. **A3 연동형 환자 B:** `prototypes/integrated-v10/patient/v193-connected.html`. 기존 `patient-v17`의 발행본 허용목록, 환자·입원건·발행 ID·버전 검사, PDF 조회, 철회·저장 실패 차단, 로컬 알림·연락처, 5개 메뉴와 모바일 터치를 보존. v1.9.3의 색채, 큰 글씨 원터치/프로필 슬라이딩 기본값, 화면 이동 모션과 줄이기, 상세 사용설명, 지도·택시 3단계 UI를 추가.
3. **독립 예시:** `patient/v19-3.html`. 이정희님 가상 시나리오를 새 PDF 색채와 CTA/설명문 분리로 마무리. 이 문서는 별도 시연용이며 의료진 A3 발행 정보가 아님.
4. **통합 홈:** 환자 카드는 새 A3 연동형 B로 연결하고 이정희님 독립 시연과 구형 안정 B에 대한 복귀 링크도 제공. 의료진 카드의 기존 UX2 연결은 유지.

## 기능 동등성: 의료진 A3 원본 대비

| 항목 | 처리 |
|---|---|
| A1/A2/A3 검토·역할 승인·발행·개정·철회 | 기존 UX2 안전 계약 유지; 통합 브라우저 회귀로 확인 |
| 초안/발행본 인쇄 | 검토용 초안 경고와 발행본 표시를 분리해 **구현** |
| 진료 목적지 출처·좌표·확인 | 기존 `shared/destinations.js` 계약으로 **구현**; 수정 시 다시 검토 |
| 근거 상세 탐색 | 기존 원천자료 `details` 상세 열람 보존 |
| 미해결 항목 검토·해결 | 기존 역할/출처/최소 기록 검증 보존 |
| 의료진 내부 읽기 전용 발행 미리보기 | 별도 중복 화면 추가는 보류. 실제 유효 발행본 인쇄 및 환자 앱 확인 우선 |
| 연습용 가상 회신, 중복 내부 학습 페이지 | 기존 레거시 자료 보존. 업무 화면으로 이식하지 않음 |

## 환자 앱 안내 및 동작

- **처음 사용:** 먼저 읽을 안내(실제 유효 발행항목) → 다음 외래(확정일정만) → 도움/알림. '이 앱은 언제, 어떻게 사용하나요?'를 펼치면 항목별 사용 목적과 실제 전송·예약 미지원 안내 제공.
- **큰 글씨:** 상단 원터치 버튼 및 내 정보의 보통/큰 글씨 슬라이딩 선택(기존 로컬 설정 사용). '움직임 줄이기' 설정도 유지.
- **지도·이동지원:** 의료진이 확인·발행한 공식 좌표가 있는 경우에만 외부 지도 URL 제공. 주소가 없으면 빈 상태와 확인방법만 안내; 지도 목적지 생성/위치 수집 없음. 택시/이동지원 준비 화면은 3단계이며 실제 호출·예약·결제 또는 의료기관 전송이 없다.
- **임상 안전:** 환자·입원건 식별, 발행/개정/철회 스냅샷, PDF 무결성 및 실패 차단 계약 수정하지 않음. 의료진이 승인하지 않은 초안·실환자 자료는 보여주지 않음.
- **시연 경계:** `CARE2026`은 보안 인증이 아닌 공개 시연 코드이며 `localStorage`는 실제 병원 서버가 아니다.

## 검증 계획 및 배포 기준

- 단위 테스트: A3/공유 발행·복원·동시 수정 도메인 94개
- Chromium 통합: 의료진→발행→환자 B→PDF→개정/재발행→철회, SYN-003 차단, 1440/768/390/320px
- 추가 단위: 공식 위치 검증의 역할 게이트 및 수정 시 무효화, 초안 인쇄와 환자 출력 구분, 사용 안내·큰 글씨 설정과 지도 빈 상태/택시 선택
- 독립 예시 PDF: 검색 가능한 A4, 합성 의료안내 문구 보존 및 스크린샷 실제 렌더링 검사
- 사용자 승인에 따라 병원·환자 화면을 운영 `main`·`gh-pages`에 반영할 때 실제 테스트 결과와 원격 SHA, 롤백 경로를 기록한다.

**검증 범위 밖:** 실제 고령 환자 사용성, iOS/Safari·화면낭독기 전수 테스트, 실제 의료기관 목적지·경로 확인, 실시간 예약/택시 호출, EMR/정식 인증/보안 검증. 이 항목들을 완료로 표시하지 않는다.

## 통합 브랜치 최종 검증 결과

- **PASS:** [Actions #42762372329](https://github.com/pchjesus/ai-care-transition-platform/actions/runs/42762372329): Node 도메인 테스트 **94/94**, 원래 의료진+발행·개정·철회 Chromium **16/16**, 목적지 권한·검토/초안 인쇄 **5/5**, 연결형 환자 B 모바일·PDF·글씨·지도 차단·택시 **20/20**.
- **PASS:** [독립 이정희님 디자인·PDF QA #42736897413](https://github.com/pchjesus/ai-care-transition-platform/actions/runs/42736897413). 검색 가능한 한글 PDF와 미리보기 원본 유지 및 모바일 화면 검사.
- 마지막 실패 원인은 **확인된 목적지가 없어 의도적으로 비활성화된 지도 CTA**를 브라우저 테스트가 클릭한 데 있었다. 기능 규칙은 변경하지 않고, `disabled` 및 설명 텍스트와 지도 미노출을 검증하도록 테스트 수정 후 통과했다.
- 이번 검증은 동일 출처 `localhost` 합성 데이터로 진행됐으며 **실제 고령층, 의료기관 EMR, 외부 지도/택시 예약, 인증/보안 침투, Safari/VoiceOver 실기기**는 미검증이다.

## 릴리즈 기준 및 롤백

- 원격 운영 기준 SHA: `main@f7964b634e3ee2aee720603a08747f302c4aee77`, `gh-pages@7353ee9d351358c7e5ccab79e93f766c22ceee15`.
- 운영으로 반영하는 범위: 의료진 UX2 v0.7에 검토용/발행 인쇄 및 목적지 권한 제어 추가, 병원→A3 발행형 B v1.9.3 이동 링크, 새 환자 UI, 별도 이정희 합성 PDF 예시와 후퇴/비교 링크.
- 기존 `prototypes/integrated-v10/patient/index.html` 안정형 B와 `patient/v19-3.html` 독립 예시를 **별도 경로로 보존**. 운영 릴리즈 후 회귀가 생기면 의료진·통합 홈·환자 진입 링크를 위 기존 SHA 기준으로 복원하고 새 경로는 보존해 분석한다.
- `gh-pages`는 진입 링크·필수 정적 에셋을 통합 브랜치와 같은 SHA 콘텐츠로 반영하되 임상 공유 로직은 기존 검증 SHA와 동일하게 유지한다.
- 메인/Pages 릴리즈 후 실제 배포 성공과 필수 URL 및 에셋을 다시 확인하고 **검증하지 않은 기능은 NOT VERIFIED로 기록**한다.

## 정식 운영 반영 결과 (2026-11-10)

- **main: PASS** — [PR #18](https://github.com/pchjesus/ai-care-transition-platform/pull/18) 정식 병합, 병합 SHA `9311c14ce8f36ee283f52f61f79765f4567c2e5a`.
- **gh-pages: PASS** — 정적 UI 및 PDF 필수 파일 **28개** 반영, HEAD `cfe90d56f7089bffbedaa5ca9416c5641ee393ba`. [Pages 배포 #42763109015](https://github.com/pchjesus/ai-care-transition-platform/actions/runs/42763109015) 성공.
- **SHA 대조: PASS** — 새 통합 홈, 의료진 기존 UI와 변경된 integration.js/CSS, 새 A3연동형 B HTML/JS/CSS, 이정희님 독립 데모와 PDF/PNG, 기존 안정형 B **14개 주요 정적 파일이 운영 `main`과 `gh-pages`에서 동일 Blob SHA**임을 확인.
- **릴리즈 전 통합 QA: PASS** — [#42762372329](https://github.com/pchjesus/ai-care-transition-platform/actions/runs/42762372329), Node **94/94**, A3→B Chromium **16/16**, 의료진 parity **5/5**, 새 연결형 환자 B **20/20**.
- **의료진 화면**: `https://pchjesus.github.io/ai-care-transition-platform/prototypes/hospital-ux2-v07/index.html`.
- **A3연동 환자 앱**: `https://pchjesus.github.io/ai-care-transition-platform/prototypes/integrated-v10/patient/v193-connected.html?patient=SYN-002&encounter=ENC-SYN-002-DEMO`. 유효한 발행 기록이 없으면 환자 내용을 표시하지 않는 것이 정상이다.
- **독립 이정희님 예시**: `https://pchjesus.github.io/ai-care-transition-platform/patient/v19-3.html`, 공개 합성 시연코드 `CARE2026`.
- **기존 안정형 B**: `https://pchjesus.github.io/ai-care-transition-platform/prototypes/integrated-v10/patient/index.html?patient=SYN-002&encounter=ENC-SYN-002-DEMO`.
- **운영 홈**: `https://pchjesus.github.io/ai-care-transition-platform/` (루트 리디렉션 유지).
- **NOT VERIFIED:** Pages 공개 URL에서 실브라우저로 재접속한 후 클릭/스크린샷을 재확인한 것, iOS/Safari/Android 실기기, 화면낭독기, 실제 고령 사용자 평가, 서버·본인인증·EMR·의료기관/외부 예약·실제 진료정보 전달. GitHub Pages 배포 성공과 코드/파일 SHA 일치는 검증됐지만 이 항목을 대신하지 않는다.
- **롤백 기준:** 이전 `main@f7964b634e3ee2aee720603a08747f302c4aee77`, 이전 `gh-pages@7353ee9d351358c7e5ccab79e93f766c22ceee15`. 문제가 생겨도 기존 발행/개정/철회 데이터 계약을 임의로 완화하거나 기존 안정형 파일을 삭제하지 않는다.
