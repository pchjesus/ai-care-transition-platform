# 병원용 통합 워크벤치 v1.0 — 개발·회귀 검증

검증일: 2026-10-21. 개발 브랜치: `codex/hospital-unified-v1`.
기준: 원격 `chat/integrated-mvp-v10` 최신 커밋 `0bd2692ee73e360c7c5a2f5396468c5d33000cbe`.
최종 커밋은 이 보고서를 포함한 개발 브랜치의 Git 커밋/원격 HEAD로 식별한다.

## 구현 범위

- A3 공통 사이드바·상단바·환자 선택을 A1/A2/A3/학습/내부 환자용 미리보기에서 공유한다. A1은 공통 화면 안의 환자 목록이다.
- 기존 A3 자체 점수 계산 및 복제된 30항목 정의를 제거했다. 보존한 A2 v0.5 `a2/engine.js`와 `a2/data.js`만 사용하며, `shared/assessment-adapter.js`가 결과 키·근거 자료를 A3 형식으로 변환한다. 입력 선택지나 평가 규칙은 변경하지 않았다.
- A2 화면에 전체 30항목, 영역별 결과, 필수 확인 수, 미평가·상충·우선 검토 수, 판단 근거·규칙 ID·입력 안내·등급 설명·참고 자료·행동 초안을 유지했다. A3 승인 계획 내용을 평가값에서 자동 생성하지 않는다.
- `shared/evaluation-edit.js`의 순수 상태 전환으로 환자별 평가 입력을 저장한다. **입력 즉시 승인 무효화 → 명시적 A3 반영 → 안내·PDF 재검토** 순서다. 반영 전에도 저장·새로고침·환자 전환으로 입력을 잃지 않는다.
- 발행/철회 상태의 평가 편집을 UI와 전환 함수 양쪽에서 차단한다. 새 버전 개정 후 편집하며 기존 발행 스냅샷을 유지한다. 저장 실패·다른 탭 충돌 시 평가 편집/반영의 메모리 상태를 되돌린다.
- schema 2와 기존 Phase 1 저장키를 유지한다. 기존 승인 기록은 조회 시 다시 계산하지 않아 지문·승인을 보존한다. 새로 반영하는 평가부터 어댑터의 결과를 사용한다.
- 환자 정보 / 평가·검토 현황을 900px 이상에서 좌우 2열로 배치한다. 390/768px은 세로, 1024/1440px은 2열을 실제 검사했다. 중복 A2 제목을 줄이고 Phase 1 외부 인계함은 접어서 제공한다.
- 홈/이전/다음을 병원·내부 환자용 미리보기·비교 화면에서 공유한다. 이전/다음은 **현재 페이지 내 방문 기록**을 이동한다. 직접 진입·새로고침 후 기록이 없으면 비활성화하고, 외부 사이트나 임의 주소로 이동하지 않는다. 실습 시작/종료 시 이동 기록을 분리한다.
- 기존 A2 URL은 통합 A2로 연결한다. Phase 1 독립 A2는 `a2/legacy.html`로 보존하고 기존 명시적 inbox 인계도 유지했다. `?handoff=`는 해당 환자 선택만 수행한다.
- 비교는 보존된 독립 A2 iframe과 현재 통합 평가의 설명·결과를 보여준다. 입력은 독립적이다. 같은 환자를 비교하려면 원본에서도 그 환자를 선택한다. 원본 A2에는 SYN-004가 없으며 통합 학습에서만 제공한다.

## 검증 결과

실행 환경: Node.js 24.19.0, Python 3.12, Playwright 1.62, `/usr/bin/chromium`, PyMuPDF. 합성 데이터·임시 로컬 HTTP 서버만 사용했다.

| 항목 | 변경 전 | 변경 후 | 근거 |
|---|---|---|---|
| 기존 Node 평가·워크플로·저장·인계 검사 | PASS 43/43 (이번 작업 시작 시 실행) | PASS 기존 43건 포함 총 50/50 | [Node 로그](unified-v1-verification/node-after.log) |
| A2 원본 대 통합: 모든 항목의 전체 선택지, 결측, CONFLICT, 잘못된 값, 사회환경 조합 | 기존 동등성 검사 PASS | PASS, 원본 엔진 바이트 동일 및 전체 변환 결과·근거 비교 | `shared/evaluation-edit.test.js`, [해시](unified-v1-verification/preserved-source-hashes.json) |
| 기존 Phase 1 실제 HTTP 흐름 | PASS 17/17 (기준 보고서) | PASS 17/17, legacy 진입점/접힌 인계함만 테스트 준비 동작 조정 | [기존 흐름 로그](unified-v1-verification/http-phase1.log) |
| 통합 A1→A2→A3 검토·승인·발행→개정→철회 | NOT RUN: 이전에는 통합 화면 없음 | PASS | [통합 HTTP 14건](unified-v1-verification/http-unified.log) |
| 승인 후 평가 변경·즉시 승인 무효화, 반영 후 항목/PDF 재검토 | NOT RUN: 새 전환 | PASS | Node + HTTP |
| 발행 평가 강제 편집 차단, 기존 발행 스냅샷 보호 | 기존 워크플로 검사 PASS | PASS, UI disabled를 강제로 해제한 이벤트도 차단 | HTTP |
| SYN-001~003, SYN-003 필수 결측·상충 동시 표시·승인 차단 | 기존 검사 PASS | PASS | Node + HTTP |
| SYN-001~004 별도 실습, SYN-004 v1→v2, 실습 새로고침 및 일반 데이터 분리 | 기존 시나리오 존재 | PASS | HTTP |
| 환자별 미반영 입력 저장·복원, 직접 URL·선택 환자 새로고침 | 기존 독립 A2 재진입 입력은 재설정 | PASS | HTTP |
| 평가 입력/반영 저장 실패 롤백, 다른 탭의 최신 저장 보호 | 일부 기존 인계 검사 PASS | PASS | HTTP |
| 이전 Phase 1 승인 데이터 호환, 승인 지문 보존 | 기존 자료 | PASS | 기준선에서 생성한 `tests/fixtures/phase1-approved-syn002.json` + Node/HTTP |
| 원천자료 모달, Escape 닫기, 모든 30항목 접근·Tab 이동 | 기존 기능 | PASS | HTTP |
| 실제 PDF 첨부·역할별 검토 제한·평가 반영 후 재검토·인쇄 PDF 텍스트 | 이전 조합 검증 NOT RUN | PASS | 실제 파일 첨부, `page.pdf()`의 SYN-002/검토용 문구 확인 |
| HTTP PDF 예시 4개 및 기존 승인/발행/개정/철회 저장 실패 | PASS (Phase 1) | PASS | 기존 HTTP 17건 |
| 홈/이전/다음, 직접 URL, 기존 숫자형 A2 URL, 새로고침 | NOT RUN: 새 경로 | PASS | HTTP |
| 390/768/1024/1440px, 6개 통합 화면 가로 넘침, 2열/세로 배치 | 기준 화면 캡처 | PASS, 24개 화면/폭 조합 | HTTP + [전후 비교 기록](unified-v1-verification/visual-results.json) |
| 통합 브라우저 콘솔·런타임 오류 | — | PASS: 14건에서 error 없음 | HTTP (개발 중 favicon 404를 발견해 통합 진입점에 명시적 아이콘 링크 추가) |
| 실제 OS 인쇄 대화상자·수동 PDF 뷰어 조작, 스크린리더, Safari/Firefox, file:// | NOT RUN | NOT RUN | Chromium PDF 생성·HTTP만 실행 |
| 기존 Phase 1 픽셀 동일성 스크립트 | PASS (Phase 1 당시) | NOT RUN | 이번에는 의도된 통합 레이아웃 변경. 별도 통합 화면 비교 수행 |
| 실환자/EMR/Firebase/A3→B 실시간 연결/배포 | NOT RUN | NOT RUN | 작업 범위에서 제외 |

기존 테스트를 삭제하거나 조건을 완화하지 않았다. Phase 1 HTTP의 URL 기대값은 독립 A2 보존 위치 `legacy.html`로 바꾸고, 접힌 인계함을 테스트 준비 단계에서 펼쳤다. 환자·승인·발행·저장·동시 탭 검증의 단언은 유지했다.

## 디자인 비교

[전후 화면 8쌍/16장](unified-v1-verification/screenshots/)을 동일 환자 SYN-002, 동일 viewport로 캡처했다. A2는 A3 디자인으로 바뀌는 것이 의도된 변경이다. A3는 기존 색·글꼴·컴포넌트 스타일을 유지하고 공통 헤더/이동/2열 요약을 추가했다. 기존 `a3/styles.css`는 SHA-256까지 동일하다. 데스크탑 1024px에서도 2열을 사용하므로 환자 패널 내부 선택기는 별도 행으로 정리했다. 모바일은 세로 패널과 기존 좁은 레일을 유지한다.

| 화면 | 변경 전 | 변경 후 |
|---|---|---|
| A2 390px | [전](unified-v1-verification/screenshots/before-assessment-390.png) | [후](unified-v1-verification/screenshots/after-assessment-390.png) |
| A2 1440px | [전](unified-v1-verification/screenshots/before-assessment-1440.png) | [후](unified-v1-verification/screenshots/after-assessment-1440.png) |
| A3 390px | [전](unified-v1-verification/screenshots/before-plan-390.png) | [후](unified-v1-verification/screenshots/after-plan-390.png) |
| A3 1024px | [전](unified-v1-verification/screenshots/before-plan-1024.png) | [후](unified-v1-verification/screenshots/after-plan-1024.png) |

## 변경 파일

- `prototypes/integrated-v10/a3/{index.html,app.js}`: 공통 화면, A1, 통합 A2 입력, 이동·환자 URL, 평가 저장/반영, 학습 복원, 비교.
- `a3/{data.js,workflow.js}`, `shared/assessment-adapter.js`: A2 정의/계산을 단일 참조로 사용, 명시적 변환.
- `shared/evaluation-edit.js`: 평가 편집·반영 전환, 승인·PDF·발행 보호.
- `a2/{index.html,legacy.html}`, 루트 `index.html`, `unified.css`: 호환 진입점, 독립 시연 보존, 홈, 통합 추가 스타일.
- `shared/evaluation-edit.test.js`, `tests/{unified_http.py,unified_visual.py,phase1_http.py,fixtures/phase1-approved-syn002.json}`: 회귀·원본 동등성·이전 저장자료 호환 검사.
- `README.md`, 본 보고서, `unified-v1-verification/`: 실행 방법·실제 결과·해시·화면 증거.

## 보존과 미해결 사항

`main`, 기준 브랜치, PR #1/#2, 원본 프로토타입은 수정하지 않았다. `prototypes/hospital-a2/` 트리 및 통합 평가 엔진/데이터의 원본 해시를 기록했다. 독립 A3 v0.4는 기존 `codex/hospital-workbench-refactor`의 `b4b936c90078ac72a4a7b30e281c5e3fb187a5b1:prototypes/hospital-a3-v04`에 보존되어 있으며 이 브랜치로 원본을 다시 복사하거나 수정하지 않았다. 원격 main은 확인 당시 `65fccd3568260fc69bfa9ca0c3bdaf33888ce051`이다.

- **실제 B 환자 앱에는 연결하지 않았다.** 환자용 이동 버튼 적용 대상은 기존 A3 내부 미리보기다. 독립 B·A2·A3 원본 파일에는 새 버튼을 삽입하지 않았다.
- localStorage 비교/쓰기에는 서버 수준의 원자성이 없다. 순차 충돌은 감지하지만 정확히 동시 쓰기를 완전히 방지하거나 병합하지 못한다. 다른 탭 변경을 감지하면 새로고침 후 다시 작업해야 한다.
- 이번에 추가한 평가 편집·반영과 기존 주요 승인 전환은 저장 실패 시 롤백한다. 기존 A3의 일반 계획 문구/원천자료/PDF 메타 편집 전체를 트랜잭션으로 바꾸지는 않았다. 해당 일반 편집의 저장 실패 처리 확장은 후속 과제다.
- PDF 바이트는 영구 저장되지 않는다. 실제 OS 인쇄 대화상자·다운로드/뷰어의 모든 동작을 자동 검증한 것은 아니다.
- 앱 내부 이동 기록은 새로고침 시 초기화된다. 선택 환자·화면·실습 여부와 데이터는 URL/저장소에서 복원된다.
- A3 본체의 큰 렌더링 파일과 역사적 legacy 경로는 남아 있다. 추가 분리는 UI 회귀 증거를 유지하며 작은 단위로 진행할 수 있다.
- 후속 제안: 공통 저장 전환의 적용 범위 확대 → 실제 접근성/브라우저 검증 → 명시적인 승인 발행본 전달 계약을 확정한 뒤 별도 승인 하에 A3→B 연결 검토. 배포는 별도 승인 후 수행한다.

## 브라우저 실행

저장소 루트에서 `python3 -m http.server 5500`, `http://localhost:5500/prototypes/integrated-v10/` 접속. 자동 검증 명령과 경로는 [README](../../prototypes/integrated-v10/README.md)를 참조한다. 병합·배포는 수행하지 않았다.
