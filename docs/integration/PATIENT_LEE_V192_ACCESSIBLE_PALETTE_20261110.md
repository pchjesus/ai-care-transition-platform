# CareBridgeLab B — 이정희님 합성 시안 v1.9.2: 가독성·투어·따뜻한 색상

- 작업일: 2026-11-10
- 개발 브랜치: `feat/patient-v19-2-reading-tour-palette`
- 기준: `feat/patient-v19-1-motion-color@deb1ee996c9584f9bd28c4d43e1461a79f1fa7ef`
- **상태:** 사용자 최종 승인 전, 합성 환자 독립 UX 시안. 실제 A3 연동형 B 또는 정식 서비스가 아님.
- 운영 `main`, 의료진 UX v0.7, 원래 환자 `patient/index.html`, `patient/v19-1.html` 및 기본 Pages 진입점은 변경하지 않음.

## 지적된 문제와 정확한 원인

1. **읽어볼 안내 카드·기타 CTA의 초록색 호버 잔존**: 원본 `patient/index.html`에서 가져온 `.task:hover`, `.service-card:hover`, `.secondary-action:hover` 등이 v1.9.1 세부 규칙보다 강하게 남아 있었다. 후보 `v19-2.css`에서 카드·검색·프로필 CTA의 hover/focus/selected를 부드러운 블루 계열로 우선 적용했다.
2. **사용 안내 두 번째 단계의 하이라이트가 불투명한 색 면으로 변함**: `a3/tutorial-tour.js`의 `.spot-ring`에 있는 `button.spot-try-target`은 클릭 가능한 연습 오버레이인데, 이전 v1.9의 범용 `.spotlight-tour button` 배경 규칙이 버튼에 칠해져 뒤의 일정 탭 텍스트를 가렸다. **기존 투어 JS/조작/키보드 접근을 변경하지 않고** 해당 버튼의 배경·테두리·그림자만 투명화하여 실제 메뉴를 보이게 수정.
3. **상단 '읽기 설정'의 위치**: 상단의 단일 `큰 글씨` 버튼을 기존 `사용 안내`와 `가상 환자` 사이에 배치하여 즉시 적용. 활성 시 선택 표시(체크+테두리). `내 정보 → 화면 설정`에 **보통 글씨/큰 글씨 슬라이딩 세그먼트**와 `화면 움직임 줄이기` 스위치 제공.
4. **설정 저장**: 글씨 크기는 원본 `data-action=font` 핸들러와 기존 `demoRepository.saveLarge/loadLarge` 경로를 호출하여 재로그인 후에도 유지한다. 새로운 이중 의료·설정 저장 구조를 만들지 않는다. 모션 설정은 기존 로컬 키 `carebridge-demo-b-v18-less-motion`을 유지.
5. **차분하지만 생기가 떨어지는 오션 블루**: 깊은 마린 블루 CTA는 유지하되, 넓은 면을 따뜻한 아이보리 `#FCFAF6`·오프화이트 `#FFFEFA`로 조정. 작은 영역에 부드러운 살구 `#FFF0E4`와 연한 바다유리 `#E5F1EE`를 적용한다. 호버와 중요 의료상태는 블루/텍스트/테두리로 구분하며 옛 녹색 성공·승인 인상을 만들지 않는다. 세 번째 강한 브랜드색은 추가하지 않는다.

## 디자인 Atlas 적용

- [UI Pattern Field Atlas v0.1](https://github.com/pchjesus/design-kkakgi/blob/main/references/UI_PATTERN_FIELD_ATLAS_v0.1_20261105.md), '단일 선택: Radio / Segmented', '켜기/끄기: Toggle / Switch': **보통/큰 글씨**는 2개 배타적 값의 즉시 전환이므로 슬라이딩 세그먼트. **움직임 줄이기**는 독립 ON/OFF 설정이므로 Switch.
- [Motion Behavior Addendum v0.1](https://github.com/pchjesus/design-kkakgi/blob/main/references/UI_MOTION_BEHAVIOR_ADDENDUM_v0.1_20261108.md): 슬라이딩 표시는 205ms이고 실제 설정/버튼 활성값과 동기화. 스크롤·화면 본문 전체가 따라 움직이지 않는다. 축소 모션에서 이 애니메이션도 끈다.
- **슬라이딩 UI는 드래그 제스처가 아니라 두 개의 이름 있는 버튼**으로 조작 가능; `aria-pressed`, `role=group`, focus-visible, 로컬 저장을 제공한다.

## 근거와 해석의 경계

- 노년층용 모바일 앱의 체계적 문헌고찰은 큰 글씨, 색 대비, 명료한 버튼, 간단한 내비게이션의 중요성을 제시한다. 색 하나만으로 이용성을 결정할 수 없다.
- 중국의 고령층 색 선호 연구에서 밝고 온화한 따뜻한 색상에 대한 선호가 관찰됐지만, **한국 퇴원환자 전체의 정서 향상·건강 결과를 입증한 연구가 아니며** 문화·표본·상황에 따른 검증이 필요하다. 그래서 배경에만 온기를 더하고 안내문·조작의 명도 대비를 유지한다.
- WCAG 2.2 일반 본문 텍스트 **4.5:1 이상**, 큰 텍스트 **3:1 이상**을 기준으로 검토한다. 대표 후보 조합: 흰색 `#FFFFFF` / CTA `#286B8C` = **5.88:1**, 본문 `#203E56` / 아이보리 `#FCFAF6` = **10.69:1**, 보조문구 `#516B7E` / 아이보리 = **5.37:1**. 이는 **선별된 조합의 계산값**이며 화면 전체 WCAG 준수나 200% 확대 검증을 뜻하지 않는다.

## 회귀 범위와 남은 과제

- 후보: `patient/v19-2.html`, `v19-2.css`, `v19-2-controls.js`, `compare-v19-2.html`, `prototypes/integrated-v10/v19-2-home-preview.html`.
- 브라우저 QA: `patient/v19_2_qa.py`, Workflow `.github/workflows/patient-v19-2-reading-tour-qa.yml`.
- 확인할 주요 시나리오: 메뉴 글자를 가리는 투명 오버레이 재현 방지(사용 안내 2/3), 원래 3개 안내 카드와 호버, 상단 글씨 버튼 위치·선택·원래 저장/복원, 내 정보 세그먼트/모션 스위치, 320/390/768/1440px, PDF·퀴즈·지도·택시·알림·전송 미연결.
- **NOT VERIFIED:** 실제 고령 사용자·퇴원환자 심리적 만족/사용성, 실기기 Safari·TalkBack·VoiceOver, 전체 WCAG 평가 및 실제 의료기관 연동.

## 참고 문헌 (APA 7)

Gomez-Hernandez, M., Ferre, X., Moral, C., & Villalba-Mora, E. (2023). Design guidelines of mobile apps for older adults: Systematic review and thematic analysis. *JMIR mHealth and uHealth, 11*, e43186. https://doi.org/10.2196/43186

Liu, B., & Wang, C. (2025). Elderly-centric chromatics: Unraveling the color preferences and visual needs of the elderly in smart APP interfaces. *International Journal of Human–Computer Interaction, 41*(5), 3527–3536. https://doi.org/10.1080/10447318.2024.2338659

World Wide Web Consortium. (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/
