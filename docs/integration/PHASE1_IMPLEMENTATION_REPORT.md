# 통합 MVP v1.0 Phase 1 — 구현 및 독립 검증 보고서

기준일: 2026-10-21. 개발 브랜치 `chat/integrated-mvp-v10`, 검증 기준 커밋 `760083692ff971800eb0f37725114b03bdb1ba97`.

## 범위

A2→A3 평가 인계만 검증·수정했다. 기존 A2/A3/B 원본 폴더, Draft PR #1·#2, main·배포는 변경하지 않았다. Firebase·실환자정보·A3→B 구현은 포함하지 않는다. 이전 구현자의 V8 격리 실행 17/17은 참고 기록이며 아래 실제 Node/HTTP 결과에 합산하지 않는다.

## 독립 검증 결과

| 검사 | 기준 커밋 결과 | 수정 후 실제 실행 |
|---|---|---|
| `npm test` | FAIL: 38 PASS / 1 모듈 로드 FAIL | **PASS 43/43**, 실패·스킵 0 |
| SYN-002 평가 수정→A3 인계→재검토→승인·새로고침 | PASS | PASS, 실제 버튼·선택 필드 조작 |
| SYN-003 결측 + 명시적 CONFLICT | 기존 단위 검사 PASS | PASS, 실제 A2 입력·A3 미평가/상충·승인 차단 |
| 선택 환자와 다른 환자 자료 반영 | FAIL: 선택 환자를 바꾸며 반영 | PASS: 차단. 인계 URL은 해당 환자만 선택하며 자동 반영하지 않음 |
| 확인창 도중 다른 탭이 대기 자료 교체 | FAIL | PASS: 자료 재검증·중단, 최신 대기 자료 유지 |
| 이미 열린 A3에서 다른 탭의 새 인계 확인 | FAIL: 버튼·표시 갱신 없음 | PASS: inbox storage 이벤트 반영 |
| 같은 평가 ID에 다른 값 / 이전 평가 재인계 | 추가 Node 회귀 각각 FAIL | PASS: 내용 충돌·시간 역행 거부 |
| A2 inbox 저장 실패 | 새 검사 | PASS: 입력 유지, A2에 머묾, 인계 보류 표시 |
| A3 인계 저장 실패·재시도·손상 저장소 | 기존 저장 실패/복구 PASS | PASS: 원본 복구·대기 자료 보존, 손상 원문 덮어쓰기 없음 |
| 다른 A3 탭의 변경 후 오래된 탭 저장 | FAIL: UI 상태만 바뀜 | PASS: 저장 충돌 표시, 이전 화면 상태 복원·다른 탭 자료 보존 |
| 검토 요청/반려/승인/발행/개정/철회의 저장 실패 | FAIL: 저장 전 성공 상태·문구 노출 | PASS: 기록/발행본·상태 복구, 성공 문구 없음 |
| 재인계 후 승인·항목/PDF 검토 무효화 | 기본 Node 검사 PASS | PASS, 기존 발행 스냅샷 유지·개정 후만 새 인계 허용 |
| 인계함 정리 실패 후 동일 자료 재시도 | 새 검사 | PASS: 새 승인 무효화·중복 감사 이벤트 없이 정리만 수행 |
| A2 모달/영역 입력·초기화·사이드바 | 새 HTTP 검사 | PASS, 7개 폭 및 키보드 Enter/Escape |
| A3 계획/출처 모달·PDF 탭·학습 5단원/4사례·SYN-003 실습 | 새 HTTP 검사 | PASS, 내부 실습은 실제 A2로 잘못 이동하지 않음 |
| 합성 예시 PDF 링크 | FAIL: 4개 모두 HTTP 404 | PASS: 4개 모두 HTTP 200, `%PDF-` 바이트 확인 |
| 320/390/768/800/801/1024/1440px | 브라우저 NOT RUN이던 항목 | PASS: 가로 넘침 없음, 모달/초점·주요 화면 조작 |
| 기준 커밋 대비 A2/A2 모달/A3/A3 학습 화면 | 새 검사 | **PASS 28쌍 픽셀 동일** |
| 전체 HTTP 자동 검사 | 최초 초안 검사에 실행기 오류 2건 포함 | **PASS 17/17**, 모든 검사 실행·완료, pageerror 없음 |
| A3→실제 B / 서버 인증·원자적 다중 사용자 발행 | NOT IMPLEMENTED | NOT IMPLEMENTED / 범위 밖 |
| 실제 첨부 업로드·PDF 출력의 전체 조합 재검사 | NOT RUN | NOT RUN. 이번에는 첨부 탭·예시 PDF·인계 후 PDF 검토 무효화를 검증 |
| file:// / 독립 HTML | HTTP만 제공 | NOT RUN. Phase 1은 동일-origin HTTP 전용 |

검증 환경: Node 24.19.0 / Python 3.12.14 / Playwright 1.62.0 / Chromium / Pillow 12.3.0. 실제 실행 로그는 [phase1-verification/](phase1-verification/)에 보존했다. HTTP 17개 메서드에는 7개 viewport와 4개 추가 저장 실패 동작의 subtest가 포함된다. 단위 테스트 작성이나 UI 열람만으로 PASS를 표시하지 않았다.

초기 신규 브라우저 harness의 `remove_all_listeners` 호출과 native 함수 반환 오류는 수정 후 원본에 다시 실행했다(`http-corrected-before.log`). 인계 저장 실패·재시도는 원래부터 통과했고, 확인 중 자료 교체는 원본에서도 실패했다. 반응형 검사는 앞선 폭에서 저장한 사이드바 접힘 설정을 고려하도록 harness를 고쳤다. 제품 기능이나 assertion을 제거해 통과시키지 않았다.

## 실제 수정

1. **`a3/tests/a2_contract.test.js`**: 통합 폴더에 없는 `hospital-a2` 대신 실제 복제된 `a2`를 참조한다. 30항목·모든 선택지·결측·상충 동등성 검사를 복구했다.
2. **`shared/apply-handoff.js`**: 동일 ID를 무조건 중복 처리하지 않고 값/규칙/시각을 대조한다. 이미 반영한 A2 평가보다 오래된 자료를 거부한다. 동일 자료의 정상 재시도는 계속 허용한다.
3. **`a3/app.js` 인계 경계**: 현재 환자 일치·저장소 최신 여부 검사, 확인창 후 작업 대상/자료 재검증, 처리 중 중복 클릭 차단, inbox 갱신. Chromium은 차단형 confirm 종료 직후 다른 탭의 localStorage 변경이 아직 전달되지 않을 수 있어 이벤트 처리 후 재검사한다. URL은 환자 선택만 수행한다.
4. **`a3/app.js` 워크플로 저장 경계**: 기존 save 결과를 반환하고 6개 상태 전이에서 저장 실패 시 직전 기록으로 복구한다. 성공 문구와 미리보기 상태 전환도 저장 성공 뒤에만 수행한다. 일반 편집 전체를 재작성하지 않았다.
5. **`a3/examples/`**: 원래 source-library가 참조하지만 누락된 합성 PDF 4개를 원본 커밋 `b4b936c90078ac72a4a7b30e281c5e3fb187a5b1`에서 읽어 그대로 복사했다. 원본 폴더는 수정하지 않았다. [파일별 SHA-256](phase1-verification/restored-pdf-sha256.json) 참조.
6. **테스트**: 두 개의 ID/재인계 회귀와 환자 공개 PDF 재검토 검사를 추가했다. 실제 HTTP 회귀 및 시각 비교 스크립트는 `tests/phase1_http.py`, `tests/phase1_visual.py`다.

A2 평가 엔진·데이터, A3 평가 규칙·출처 라이브러리·저장 포맷, HTML/CSS는 변경하지 않았다. 기본 디자인은 [390px 이전](phase1-verification/screenshots/before-a3-390.png) / [이후](phase1-verification/screenshots/after-a3-390.png), [1440px 이전](phase1-verification/screenshots/before-a3-1440.png) / [이후](phase1-verification/screenshots/after-a3-1440.png) 및 전체 비교 JSON으로 확인했다. 오류 메시지·환자 불일치 차단·처리 중 비활성화는 결함 수정에 따른 동작 차이다.

## 재실행

`prototypes/integrated-v10/`에서:

```sh
npm test
python3 tests/phase1_http.py
```

시각 비교는 기준 커밋의 읽기 전용 export 경로를 지정한다. 별도 worktree나 원본 수정은 필요 없다.

```sh
python3 tests/phase1_visual.py --baseline /path/to/export/prototypes/integrated-v10
```

## 남은 한계

- 인계·역할·저장은 합성 데이터용 localStorage 시연이다. 브라우저 탭 비교/재검증은 서버 트랜잭션·실제 의료인 인증이 아니다. 이 검사로 임상 성능·보안을 검증했다고 주장하지 않는다.
- A2로 돌아오면 미인계 입력이 초기화되고 A3 저장 평가가 역전파되지 않는 기존 Phase 1 한계는 유지했다. 새 기능을 추가하지 않았다.
- 일반 편집의 모든 저장 동작을 트랜잭션으로 바꾸지는 않았다. 인계 및 검토/반려/승인/발행/개정/철회 상태 경계를 이번에 검증·보강했다.
- A3→B 연결·실제 파일 영구 보관·실제 기관 연계는 구현하지 않았다. 기존 A3의 환자용 미리보기는 B 앱이 아니다.
- Safari/Firefox·실제 기기·실제 의료진 사용성 검증은 NOT RUN이다.
