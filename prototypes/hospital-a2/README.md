# A2 병원용 평가 워크벤치 v0.5 — 승인된 디자인 기준선

**흰색 캔버스 · 다크 포레스트 그린 접이식 사이드바 · 반전 D. 로고 · 판단 우선 정보위계 · 시연 설명은 별도 문서**

- `preview.html`: CSS/JS 내장형 실행 파일. Chrome/Edge에서 확인.
- `index.html`: 수정 가능한 원본 진입 페이지. HTTP 서버에서 동작하는 모듈형 구조.
- `styles.css`, `app.js`, `data.js`, `engine.js`: 스타일, UI, 합성 사례, 자체 규칙.
- `DESIGN_REVIEW_v0.5.md`: v0.5 변경사항·기능/화면 검증 및 미실시 목록.
- `NEXT_CHAT_HANDOFF.md`: 다음 병원 A3 설계 채팅 인수인계.
- `CODEX_WORK_SCOPE_v0.1.md`: Codex 추천 작업·작업 보존 계약.
- `QUICK_GUIDE_A2_v0.5.md`: A2 목업 1페이지 사용법.
- `PATIENT_GUIDE_DRAFT_v0.1.md`: **실제 배포 전 검토가 필요한 환자·보호자 안내문 초안.**

## 이번 변경 범위

1. 사이드바 `#214B3B` 유지, 흰 바탕·진녹색 `D.` 로고 반전, 242px 펼침 / 78px 접힘.
2. 접기·펼치기, 접근 가능한 이름/상태, 화면 크기 변경, 환자 입력 유지 검증.
3. 최상단 시연 배너·필수입력 설명문·하단 긴 면책 문구 제거. **자료 미평가/상충/우선 확인사항은 유지.**
4. 모든 평가 한계·목업 설명은 `QUICK_GUIDE_A2_v0.5.md`로 이관.
5. A1/A3 모의 화면에서 반복되는 시연 안내 문장은 제거; 버튼·결과 동작 보존.
6. `SYN-001 · ... · 가상 · 퇴원예정 ...` 같은 환자 맥락 표시는 화면 유지.

## 실행

- 즉시 미리보기: `preview.html` 열기.
- HTTP 실행: 해당 폴더에서 `python -m http.server 5500` → `http://localhost:5500/index.html`.
- 소스 변경 후: `python build_standalone.py`로 `preview.html` 재생성.
- 엔진 테스트: `node --test tests/engine.test.js`.
- 브라우저 스모크: `python tests/smoke.py` (Playwright/Chromium 설치 환경 필요).

**검증 한계와 목업 사용 주의:** `QUICK_GUIDE_A2_v0.5.md` 참조. 환자 v1.2는 수정하지 않음. GitHub 업로드 상태는 NEXT_CHAT_HANDOFF.md 참조.
