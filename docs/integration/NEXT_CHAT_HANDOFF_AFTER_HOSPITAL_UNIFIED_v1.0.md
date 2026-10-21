# 다음 채팅 인수인계 — 병원용 통합 v1.0 완료 → A3·환자용 B 연결

> 2026-10-21 / 창업 과제 / 합성 데이터 전용. **실제 EMR·실환자정보·의료기관 협력·검증된 AI 없음.**
> 이 파일을 다음 채팅 **최초 인수인계 기준**으로 사용한다. 기존 긴 채팅을 재조사하지 않는다.

## 1. 현재 완료 / 검증된 코드 기준

- Repository: `pchjesus/ai-care-transition-platform` (Public).
- **병원 통합 기준 개발 브랜치:** `codex/hospital-unified-v1`
- **병원 통합 실제 기능 검증 SHA:** `de45e29c37da836286a64f7668129f4298f7bb91`
- **A2→A3 이전 Phase 1 SHA:** `chat/integrated-mvp-v10@0bd2692ee73e360c7c5a2f5396468c5d33000cbe`.
- **Pages 배포 브랜치:** `gh-pages`; 통합 앱 배포 커밋 `2cfb5efda25392aa3242ec2dd38dca34902c0ddb`.
- `main`: `65fccd3568260fc69bfa9ca0c3bdaf33888ce051` 기준 미변경.
- Draft PR #1: `codex/hospital-workbench-refactor@b4b936c90078ac72a4a7b30e281c5e3fb187a5b1`. Draft PR #2: `codex/patient-v1.3@80e2455f5ad3fdf88170152f7332f84082684fc6`. 모두 미병합.
- **A2→A3 병원 통합 완료:** A3 레이아웃·포레스트그린 디자인 기준 하나의 A1 환자목록→A2 6영역·30항목 평가→A3 계획 검토·승인·발행·개정·철회 워크벤치. A2 원본 엔진·정의는 원본과 Git blob SHA 동일. A3 중복 점수 계산 제거, `shared/assessment-adapter.js`로 형식만 변환.
- `prototypes/integrated-v10/a3/index.html`이 실제 통합 실행 화면. `a2/index.html`은 통합 A2로 이동; 독립 Phase 1 A2는 `a2/legacy.html`에 보존.
- 기존 계획 승인 상태는 A2 평가 수정 시 무효화, 명시적 인계 후 계획 문서/PDF 재검토; 발행본은 새 개정이 발행될 때까지 유지. 브라우저 저장(localStorage)은 실제 트랜잭션 아님.
- **Codex 독립 실행 검증:** Node 50/50, 통합 브라우저 HTTP 14/14, Phase 1 회귀 브라우저 17/17 PASS. 증거 `docs/integration/HOSPITAL_UNIFIED_V1_REPORT.md`, `docs/integration/unified-v1-verification/`. Safari/Firefox/스크린리더/임상/실제 기기 미검증.

## 2. GitHub Pages 배포 구조 및 검증 수준

- 사이트 예상 주소: `https://pchjesus.github.io/ai-care-transition-platform/`.
- Pages 루트 `index.html` 역할 선택; `compare.html` 좌측 병원 통합, 우측 **독립 환자 v1.3**.
- 공개 앱 경로는 **`/prototypes/integrated-v10/a3/index.html?screen=patients|assessment|plan`**. 기존 `/a2/index.html`, `/a3/index.html`은 호환 리다이렉트. 통합 워크벤치 상단 '통합 홈'은 중간 `/prototypes/integrated-v10/index.html` 리다이렉트를 거쳐 역할 선택 페이지로 복귀.
- 통합 소스는 `gh-pages:prototypes/integrated-v10/`에 SHA 그대로 배치하여 상대 경로를 보존. 비교에 필요한 독립 A2는 `gh-pages:prototypes/hospital-a2/`에 보존.
- 환자용 웹앱은 `gh-pages:patient/index.html` 원본 v1.3 단독 HTML 그대로; Git blob `c57089c7bc2a3ea01a756b8cf0f618a643b176eb` 유지.
- **배포 정적 검사:** `gh-pages` 파일 53개 존재, 참조된 상대경로 58건(19개 HTML/JS/CSS 파일) 검증, 누락 0건, 원본 환자용 blob 동일.
- **중요:** Pages가 활성화되어 있다는 GitHub 저장소 플래그 `has_pages: true`는 확인했으나 **실제 공개 주소의 HTTP 접속은 현 실행 환경에서 DNS 실패로 NOT VERIFIED**. 사용자가 직접 URL 열기, Pages Settings → Build and deployment → `gh-pages`/`(root)` 및 Actions 배포 성공 여부 확인 필요. 실제 운영 화면 PASS를 과장하지 않는다.
- 정적 배포 이후 실제 사용자 조작·실제 PDF·모바일 UI를 GitHub Pages에서 재확인 필요.

## 3. 아직 미구현 / 남은 제한

1. **실제 환자용 B v1.3과 A3의 발행 데이터 연동 없음.** 병원 내부 `patient-preview`는 진짜 B 앱이 아니다.
2. **실제 B v1.3에는 상단 '홈·이전·다음' 공통 내비게이션이 아직 없음.** 병원 통합 내부에는 홈/화면별 이전·다음 구현됨. B 단독 디자인은 수정하지 않았다.
3. 서버 인증, 환자 개인별/보호자 권한, 타 기기 간 동기화, 실제 EMR/Firebase, 원자적 동시성·보안/임상검증 없음.
4. 인쇄/PDF는 임시 파일 기반. 실제 외부 배포 가능 첨부 바이트/저장 URL 계약 미정. 실제 파일 다운로드/공개를 임의로 구현하지 말 것.
5. 기존 `main`, Draft PR #1/#2, 과제 사업계획서 등은 통합 실험과 별도 보존.

## 4. 다음 개발 우선순위

**A3→환자용 B 통합 v1.0, 기존 디자인을 유지하여 구현**. 새 브랜치 생성 후 진행. 원본 B v1.3은 고정된 PR #2 ref에서 필요한 부분만 읽고, 통합용 별도 복사본/어댑터를 만든다.

수용 기준:
- A3가 **의료진 승인 후 발행한 현재 유효한 계획(PUBLISHED)**만 B가 표시. 승인 전(APPROVED), 초안, 잘못된 환자/입원건, 손상 자료, 철회(REVOKED)에는 노출하지 않는다.
- 환자용 데이터는 A3 `publishedPayload()`와 **발행 기록의 신뢰할 수 있는 래퍼**에서 생성한 공개 allowlist만 사용한다. 내부 메모·원자료·검토자·감사 로그·서류 해시 등 유출 금지.
- 개정 중엔 이전 유효 발행본 유지; 새 발행 후 정확한 새 버전 표시; 철회 시 즉시 숨김; 새로고침/여러 탭/다른 환자/저장 실패 처리.
- B의 기존 하드코딩된 환자명·퇴원일·예약·복약문구·교육 PDF가 타 환자의 승인 기록인 것처럼 나타나지 않도록 **통합 모드에서 제거/격리/안전한 빈 상태**. 승인 근거 없는 의료 지시/날짜를 자동 생성하지 않는다.
- 기존 B 시각 디자인·접근성(큰 글자, 모바일, 모달·PDF) 유지; 홈·이전·다음 버튼은 적절한 정적 경로와 이력 동작을 갖고 안정적으로 추가. 실제 환자용 UI를 병원용 디자인으로 바꾸지 않는다.
- 모든 데이터는 **합성·동일 origin 정적 시연만**. 서버 권한 검사인 척하지 않는다.
- 원본/기존 PR 보존, Node 도메인 검사 → 실제 HTTP 버튼 조작·발행·개정·철회 E2E → 390/768/1024/1440 모바일/PC 회귀 → 필요 시 Codex 독립 검증.
- 검증 전 `gh-pages` 자동 반영 금지. `main`/PR 병합·배포는 사용자 확인 후.

## 5. 다음 채팅 최소 탐색 순서 (토큰 절약)

1. **이 문서** + `docs/integration/INTEGRATED_MVP_V1_CONTRACT.md`에서 A3→B 발행 계약만.
2. `docs/integration/HOSPITAL_UNIFIED_V1_REPORT.md`의 구현 한계.
3. **수정할 영역만**: `prototypes/integrated-v10/a3/workflow.js`의 `publishedPayload/currentPublished`, `a3/app.js`의 publish/revoke/revise/save 및 환자 선택.
4. B PR #2의 `prototypes/patient-v13/index.source.html`, `app.js`, `storage.js`, `data.js`를 관련 구간만; 실제 독립 배포는 standalone `index.html`.
5. 전체 저장소·모든 테스트/이미지/예전 사업성 문서를 반복 스캔하지 말고, 실패·불확실한 항목만 선택적으로 확장.

## 6. 새 채팅 첫 실행 지시

`pchjesus/ai-care-transition-platform`에서 이 문서와 통합 계약을 확인하고, 원격 브랜치 SHA를 재확인하라. 먼저 Pages 실제 공개 URL의 열림 여부를 간단히 확인(환경 제한이면 NOT VERIFIED), 이어서 A3→B 통합 데이터 계약·정상/예외 시나리오를 정리하고 **기존 UI를 유지하는 단계별 구현**을 진행하라. 원본 B/기존 PR/main/gh-pages를 자동 변경하지 말 것. 작업 브랜치·테스트 로그·최종 SHA를 보고하라.
