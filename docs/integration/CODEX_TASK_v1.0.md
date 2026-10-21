# Codex 실행 지시 — A2·A3·B 통합 MVP v1.0

> 기준: `design/integrated-mvp-v10` 브랜치 / `docs/integration/INTEGRATED_MVP_V1_CONTRACT.md`가 **유일한 기능 계약**.
> 현재는 설계만 저장됐고 **통합 구현은 아직 없음**.

## 시작

1. `pchjesus/ai-care-transition-platform`의 현재 원격 HEAD 및 열린 PR #1/#2를 확인한다. 이 문서와 통합 계약을 먼저 읽고, 이외 코드는 작업에 필요한 범위만 조회한다.
2. **새 구현 브랜치 `codex/integrated-mvp-v10`를 `design/integrated-mvp-v10`의 최신 SHA에서 생성한다.** 지정 브랜치가 이미 있으면 현 상태·커밋을 먼저 확인하고 재개.
3. 원천 스냅샷: A2 `main:prototypes/hospital-a2/`, A3 PR #1 `b4b936c90078ac72a4a7b30e281c5e3fb187a5b1:prototypes/hospital-a3-v04/`, B PR #2 `80e2455f5ad3fdf88170152f7332f84082684fc6:prototypes/patient-v13/`. **고정된 ref에서 필요한 파일만** 가져온다. 세 원본 폴더 및 기존 저장키·UI·테스트 변경 금지.
4. `prototypes/integrated-v10/`에서 독립 합성 데이터 통합 시연을 개발한다. **실제 A2 원본 UI** 평가·인계, **A3 기존 승인 검증 규칙** 적용, **B v1.3 UI의 현재 발행본 동적 렌더링**을 연결한다. 단순 화면 링크나 환자용 기본 `published:true`는 통합 성공이 아니다.
5. 안전 계약은 원문을 따름: 승인 전 숨김, 누락·상충 차단, 발행 스냅샷 allowlist, 환자/입원건 격리, 개정 시 기존 유효본 유지, 새 발행 시 교체, 철회 시 즉시 숨김, 저장·탭 충돌 fail-closed, 실제 PDF 바이트 미전달·하드코딩 예약 미노출.
6. 테스트는 `I-01~I-12`를 수용 기준으로. 먼저 Node 최소 단위 검사 → HTTP 브라우저 E2E → 레거시 회귀 → 320/390/768/1024/1440 UI. **검증 못한 항목은 NOT RUN**, 실패는 FAIL, 통과만 PASS. 접근할 수 없는 브라우저를 억지로 반복 시도하지 않는다.
7. 결과를 `docs/integration/IMPLEMENTATION_REPORT_v1.0.md`에 **실제 수정 파일·검사 방법·PASS/FAIL/NOT RUN·남은 리스크**로 기록. 실행법은 `prototypes/integrated-v10/README.md`에 작성한다.
8. 새 구현 브랜치에만 커밋·푸시한다. 필요 시 Draft PR **하나**를 `main` 대상에 생성해도 되나 **merge, main 수정, 배포는 금지**. 원격 상태·SHA·링크 보고.

## 중단 조건

환자 공개 차단·동적 데이터 검증·기존 디자인/원본 보존을 동시에 만족하지 못하면 실패를 감추거나 데이터 흐름을 모의로 꾸미지 말고, 문제·최소 대안을 보고한 뒤 무리한 구현을 중지한다.

## 범위 밖

Firebase·EMR·실환자 데이터·실로그인·임상 예측 AI, 서비스 공급기관 실제 신청·매칭, A3에 없는 승인 PDF 원본의 B 배포, 새 디자인 전면 개편, 사업계획서 수정, 기존 PR 병합.
