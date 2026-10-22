# A3 의료진 검토·발행 교육용 프로토타입 v0.3

A2 v0.5 디자인을 참조하여 독립 구현한 A3 학습·검토 워크벤치입니다. **실제 의료기관·환자 데이터, 처방/EMR/Firebase 연동, 의료인 인증 및 서버 발행은 없습니다.**

## 사용법

1. `preview.html`을 Chrome/Edge에서 열거나, `python -m http.server 5500`을 실행하여 `http://localhost:5500/index.html`로 접속합니다. 후자는 운영 환경 정책에 따라 다를 수 있습니다.
2. 왼쪽 `사용법·학습`에서 다섯 단원을 선택합니다. 시작하기·화면 읽기·원천자료·케이스 실습·용어 설명을 제공합니다.
3. `케이스 실습`에서 SYN-001~004를 선택하세요. 실습은 별도 가상 사본에 저장되어 일반 작업 기록을 덮어쓰지 않습니다.
4. A3의 상단 `발행 전 해결할 사항` → 목록 항목 → 수정 위치 이동. 해당 계획에서 `기록 선택`을 눌러 환자별 가상 원천자료를 연결하세요. 연결 후 직종별 확인을 별도로 해야 합니다.
5. SYN-001: 7건 → 약료 이슈 확인(MED-02) → 기본 계획 6개 항목 검토 → 승인·발행. SYN-002: 빠른 발행. SYN-003: 상충 자료 비교·회신·A2 재인계. SYN-004: 기발행 v1.0 → 개정 v2.0.
6. 예시 PDF는 `원천자료` 모달에서 열 수 있습니다. **ZIP을 압축 해제한 상태**로 실행하면 하위 `examples/` 경로가 정상 연결됩니다. 단일 HTML만 별도로 옮기면 상대경로 PDF 링크가 동작하지 않을 수 있습니다.

## 구조

- `index.html` / `styles.css` / `app.js`: 원본 모듈 UI
- `data.js`: 기존 A2를 참고한 6영역·30입력·3환자 + A3 전용 SYN-004
- `source-library.js`: 제목 중심 합성 원천자료 및 연결 검증 규칙
- `workflow.js`: 평가·이슈·승인·발행·버전/스냅샷 동작
- `preview.html`: 오프라인용 JS/CSS 내장 빌드 (`python build_standalone.py`로 다시 생성)
- `examples/`: 창작한 한국어 학습 PDF 및 캡처 이미지
- `docs/`: 설계 명세, 테스트 결과, Codex C0 진단 범위
- `tests/`: Node 및 Chromium 자동 테스트

## 보호 및 저장 정책

- 기존 GitHub A2 v0.5, 독립 환자용 v1.2, GitHub main은 이 작업으로 변경되지 않았습니다.
- v0.3 브라우저 저장 키는 `a3-prototype-v03-synthetic-only`, 실습은 `a3-study-v03-synthetic-only`로 서로 구분됩니다. 브라우저에서 저장을 차단한 경우 상태 표시가 나타납니다.
- 자료 조회만으로 환자 선택·작업 기록을 변경하지 않습니다. PDF 첨부의 실제 바이트는 현재 세션에만 보관하므로 새로고침 후 다시 첨부해야 할 수 있습니다.
- 가상 기록 ID를 선택하는 행위만으로 근거가 확정되거나 의료진 검토가 완료되지 않습니다. SYN-003 A2 상충은 가상 회신을 받아도 A2 평가값을 수정·인계하지 않으면 차단됩니다.
- 계획 PDF 출력은 브라우저 인쇄 기능입니다. **PDF를 서버에 영구 저장하여 데이터와 원자적으로 발행하는 기능은 구현되지 않았습니다.**
- 보안 권한·임상적 성능·실제 병원 사용성 검증은 수행하지 않았습니다.

## 테스트

```bash
node --test tests/workflow.test.js tests/source_contract.test.js
python tests/browser_smoke.py
python tests/v03_features.py
python tests/v03_full_case.py
python tests/pdf_export_smoke.py
```

브라우저 테스트는 Chromium에 독립 `preview.html`을 주입하는 방식입니다. 직접 HTTP origin 접속은 실행환경 정책으로 차단되어 NOT RUN입니다. 자세한 결과는 `docs/V03_TEST_REPORT.md` 참조.
