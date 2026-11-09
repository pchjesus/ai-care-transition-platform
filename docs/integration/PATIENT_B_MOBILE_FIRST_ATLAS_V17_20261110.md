# 케어브릿지랩 — 환자 앱 B 모바일 중심 UX 대규모 개선 v1.7

- 기준일: 2026-11-10
- **상태: 디자인 후보 / 합성 데이터 시연 / 사용자 시각 평가 및 실기기 검증 전**
- 기준 코드: `feat/patient-b-ux-v16@3fbb4630`; 개발 브랜치: `feat/patient-b-ux-v17`
- `main`/`gh-pages`/실제 공개 환자 앱 `patient/index.html`은 **변경하지 않는다**.
- 의료진 통합 홈 및 A1/A2/A3 UX 2.0 v0.7의 잠정 확정 UI는 그대로 유지한다.

## 1. 목표와 설계 결정

**모바일을 주요 사용 장면**으로 삼고 중장노년층·동행 보호자가 앱을 열어 세 가지 행동을 즉시 찾도록 한다.

1. 오늘의 의료진 발행 안내를 **읽는다**.
2. 다음 진료가 **확정되었는지 확인**한다.
3. PDF·의료진 문의·생활/돌봄 안내를 **찾는다**.

PC는 정보가 넓은 작업창을 활용한 2열 구성으로 적응시키지만, 정보의 의미와 환자 공개 규칙은 동일하다.

### v1.6과 v1.7 비교

| 구분 | v1.6 첫 화면 개선 | v1.7 실험 |
|---|---|---|
| 홈 | 큰 제목+3개 안내+진료/문서/도움 | 인사·발행 상태 → **사용법 3단계 → 3개 안내 → 일정 → 문서/도움**을 행동 순서로 정리 |
| 내비게이션 | 기존 모바일 5탭·접이식 메뉴 | 5탭 유지, 활성 선택 배경과 피드백 강화, 기존 이전/다음/홈 버튼 중복 제거 |
| 상세·전체 안내 | 전체 텍스트 탐색 | **종류별 세그먼트**(전체/오늘·생활/복약/일정/주의/문의), 필터 결과 수·선택 상태 동기화 |
| 진료 일정 | 기존 v1.2 단순 진료 카드 | 날짜·시간·장소의 크기/위계 분리, 알림·이동 준비로 연결 |
| 도움 | 하나의 목록+검색 | **주의/문의/생활·돌봄** 구획, 열면 해당 의료진 발행 안내, 검색은 보조 |
| 읽기 설정 | 상단 단일 '글자 크게' 버튼 | **모달 바텀시트**: 보통/큰 글씨 **2칸 세그먼트**, 움직임 줄이기 **스위치**, 설정 저장 상태 확인 |
| 모션 | v1.5 진입 페이드 중심 | 180~230ms 정도의 짧은 **페이드+약한 위치 이동**, 버튼/선택 반응, 시스템/앱 모션 감소 시 비필수 전환 해제 |
| 빈/미발행 상태 | 개발 업무용 A3 설명을 본문에 노출 | 환자 관점의 미발행 설명 + 선택형 시연 안내(실제 승인 아님) |

## 2. Atlas 출처와 적용 판단

- [디자인 깎기 UI 패턴 아틀라스](https://github.com/pchjesus/design-kkakgi/blob/main/references/UI_PATTERN_FIELD_ATLAS_v0.1_20261105.md): Segmented control, switch, bottom sheet, tab indicator, feedback. 표시뿐 아니라 **실제 선택값·저장·비활성 상태**를 연결.
- [움직임·화면 전환·완료 피드백 증보](https://github.com/pchjesus/design-kkakgi/blob/main/references/UI_MOTION_BEHAVIOR_ADDENDUM_v0.1_20261108.md): Fade through, Tab switch, Sheet expand, Button morph. 환자 앱에서는 **방향 상실 방지와 상태 진실성**에 기여하는 최소 모션만 선택.
- [텍스트 모션 실험 기록](https://github.com/pchjesus/design-kkakgi/blob/main/references/TEXT_MOTION_LAB_NOTE_01_20261108.md): 단회 사용자 실험에서 페이드 업 긍정, 스크램블 부정. 의료지시 본문엔 스크램블·오토로테이트·타이핑 효과 미적용.
- [Universal Visual Design v1.3 승인본](https://github.com/pchjesus/design-kkakgi/blob/main/guidelines/universal/Universal_Visual_Design_UI_UX_Guidelines_v1.3.md): 목표/정보/상태 → 표현·조작 → 접근성·회귀 검증. Atlas는 참고이고 새로운 범용 정답이 아니다.

**의도적으로 제외:** 자동 넘김 캐러셀·스토리 진행 표시, 근거 없는 '진행률 100%', 강제 축하 모션, 의료 문구 스크램블·블러, 제스처만으로 쓰는 숨은 조작, 실제 예약처럼 보이는 시각 효과.

## 3. UI·데이터 안전 계약

- **기존 의료진 A3→B** `readPatientPublication`, `readPublishedDocument` 사용: 환자·입원건·발행 ID·버전 격리, 승인 전 미노출, 개정 중 옛 유효 발행본 유지, 재발행 시 이전 발행본 대체, 철회 즉시 비노출.
- 3개 '먼저 읽을 안내'는 **정보탐색용 분류**, 임상 위험도·간호 처치 우선순위나 실제 수행 완료율이 아니다.
- '확정 일정'은 발행된 `appointment`가 있을 때만; 알림·이동 준비·PDF는 기존 제어 기능 재사용. 실제 예약/호출/기관 전송을 주장하지 않는다.
- 새 `carebridge-patient-v17-reduce-motion` 로컬 키는 **시각 설정에만 사용**. 기존 글씨 크기 `care-transition-connected-b-font-v1`과 원본 저장 경로를 계속 사용. 의료 기록이나 개인정보 저장 형식은 변경하지 않는다.
- 본문의 의학적 지시·복약 횟수·연락처·새 일정은 UI가 생성하지 않는다. 가상 로그인 `CARE2026`은 인증 아님.
- 원본 5개 탭·접근코드·알림·이해확인·PDF 무결성·안내검색·독립 예시와 동일 브라우저 저장 규칙 보존.

## 4. 구현 경로 및 롤백

- 후보 진입: `prototypes/integrated-v10/patient/v17.html`
- 후보 전용: `patient-v17-app.js`, `patient-v17.css`, `patient-v17-controls.js`
- 부모: v1.6 후보. 기존 `patient/index.html`, `patient/app.js`, `patient-v15.js` 등 **변경 없음**.
- 원본 보존: v1.5 운영 앱 및 `feat/patient-b-ux-v16` 후보.
- 모바일/PC CSS는 새 후보의 `.v17-*` 스코프 중심. 라이브러리·원격 폰트·타사 SNS 원본 에셋은 추가하지 않음.

## 5. QA와 미검증

- 기본 브라우저 통합: 320/390/768/1440px, 5개 탭, 홈/일정/도움/전체안내, 글씨 크기, 스위치, 키보드 초점, 축소 모션, 1→2 발행/개정/철회/PDF 등 기존 통합 흐름.
- `tests/patient_v17_candidate_qa.py` 및 GitHub Actions로 재현.
- **PASS 기록:** 2026-11-10 검증된 최신 Actions 완료 커밋에 한함; 수치는 Actions 결과를 별도로 확인해 확정한다.
- **NOT VERIFIED:** 실제 중장노년층/보호자 사용성(완료 시간·오류율·이해도), 모바일 실기기/Safari/VoiceOver/TalkBack, 200% 브라우저 확대, 배터리·성능, 실제 의료기관 통신·인증.
- 기존 의료진 A3 잔여 기능 처리: [이월 목록](HOSPITAL_UX2_V07_PARITY_BACKLOG_20261110.md) 참조. 환자 UX 후보 확정 뒤 Codex 전체 검증 시 수행.

## 6. 근거 문헌 (APA 7th)

World Wide Web Consortium. (n.d.). *Understanding success criterion 2.5.5: Target size (enhanced).* Web Accessibility Initiative. https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced

World Wide Web Consortium. (n.d.). *Understanding success criterion 2.5.8: Target size (minimum).* Web Accessibility Initiative. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum

World Wide Web Consortium. (2025, September 16). *Understanding success criterion 2.3.3: Animation from interactions.* Web Accessibility Initiative. https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions

World Wide Web Consortium. (2025, November 20). *Older users and web accessibility: Meeting the needs of ageing web users.* Web Accessibility Initiative. https://www.w3.org/WAI/older-users/

> WCAG 2.2의 터치 대상 24×24 CSS px는 SC 2.5.8(AA, 예외 있음), 44×44 CSS px는 SC 2.5.5(AAA, 예외 있음). 이 시안은 주요 제어에 더 넓은 목표를 적용하지만, **WCAG 전체 준수 판정이나 고령층 사용성 검증이 완료되었다는 의미는 아니다.**
