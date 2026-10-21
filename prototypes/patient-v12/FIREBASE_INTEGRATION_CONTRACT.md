# 퇴원 후, 나의 하루 — 데이터 저장·본인인증·기관 변경요청 계약 (설계 초안)

기준 v1.2 / 2026-10-20 / **미연결·미운영**. 현재 모든 데이터는 허구이며 실제 환자 식별·의료정보·기관 연결은 없다.

## 1. 지금 구현된 기능의 정확한 범위

- 시연 코드 `CARE2026`: 누구든 사용할 수 있는 **가상 환자 입장 시연**. 본인인증·접근통제가 아님.
- `demoRepository` (`app.js`): localStorage를 통한 가상 연락처/주소/저장 리비전/로컬 전송 요청상태 저장 및 읽기. 키 `discharge_navigator_v12_mock_profile`.
- 글자 확대 선호도: 별도 키 `discharge_navigator_v12_font_preference`, 모든 앱 화면에 CSS `--font-scale` 적용.
- `index.html`·`preview.html`은 독립 실행이 가능한 인라인 CSS/JS 빌드 결과. 개발원본 `app.js`·`styles.css` 수정 후 `build_standalone.py` 재실행.
- 저장은 브라우저 단위. 다른 PC/기기와 동기화하지 않는다. 사용자 계정과 실제 병원 기록을 구분하는 보안이 없다.
- 요청 기록은 `{requestId,revision,createdAt,status:'LOCAL_ONLY'}` 형태로만 브라우저에 기록된다. 외부 전송 0건.
- 기존 저장값이 있을 때 새 주소·연락처 저장으로 revision이 증가하면 예전 모의 요청은 무효화되고 다시 요청해야 한다.
- 사용자가 저장을 금지한 환경에서는 화면에 저장 실패를 알리고, 새로고침 시 데이터가 사라질 수 있음을 안내한다.

## 2. Firebase 전환을 위한 책임 경계

| 모듈 | 현재 시연 | 향후 정식 서비스에서 필요한 구조 |
|---|---|---|
| IdentityProvider | 공개 코드로 가상 환자 1명 표시 | OIDC 등 검증된 본인확인, 해당 의료기관의 환자와 **서버에서 매핑**. 주민번호·생년월일·입원기간의 단순 조합 금지 |
| ProfileRepository | `demoRepository.load()/persist()/clear()` | 서버 인증/인가 아래 환자 식별 기준으로 **공식 병원정보와 환자 제안 수정정보 분리**. Firestore client 쓰기 접근 제한 |
| ConsentService | 전송 전 시연용 체크박스 | 목적별 정보 제공 동의·철회·수신기관/항목/버전/동의시각 기록. 관련 법적 근거/동의 범위 검토 |
| ChangeRequestService | `LOCAL_ONLY` 모의 요청 | 신뢰 가능한 서버(예: Cloud Functions)로 제출, 인증·중복·권한·변경 버전 검증. 요청번호·기관별 처리 상태·오류 피드백 |
| OrganizationConnector | 없음 | 공식 연동 협약·기관 API·재전송·수신확인·수락·반려. 연결 불가 시 완료라고 표현 금지 |
| AuditTrail | 앱 로컬 최소 기록 | 불변 감사로그와 접근로그, 데이터 보유/삭제·침해대응 관리 |

## 3. 미래의 상태모델(제안)

```text
DRAFT -> LOCAL_SAVED -> SUBMISSION_PENDING -> SUBMITTED -> RECEIVED
                                              |          |
                                              v          v
                                            FAILED    UNDER_REVIEW -> APPROVED / REJECTED
                                                                      |
                                                                      v
                                                                   APPLIED
```

- **LOCAL_SAVED**: 사용자의 수정이 앱 또는 계정 저장소에 저장됨; 공식 병원 등록정보는 그대로임.
- **SUBMITTED**: 신뢰할 수 있는 서버가 기관별 요청의 접수를 인정할 때만 표시.
- **RECEIVED**: 수신 기관에서 실제 수신확인을 받은 경우에만 표시.
- **APPROVED/APPLIED**: 기관의 공식 검토·반영 이벤트가 기록된 경우에만 표시.
- **LOCAL_ONLY**: 현 v1.2의 전송 요청 시연 상태이며 어떤 기관에서도 처리하지 않음.
- 동일 요청/수정 revision 중복 전송은 idempotency key로 방지. 동일 환자의 최신 revision과 비교해 오래된 수정 요청 차단.

## 4. 예비 데이터 스키마(가상의 단순 예)

```json
{
  "patientAccess": {"mockPatientId":"synthetic-001", "verification":"DEMO_ONLY"},
  "officialProfile": {"source":"HOSPITAL", "readOnly":true},
  "patientProposedContact": {"address":"... (가상)","contact":"... (가상)","revision":2,"updatedAt":null},
  "changeRequest": {
    "requestId":"DEMO-0002", "profileRevision":2,
    "recipients":["SIMULATED_HOSPITAL","SIMULATED_CARE_TEAM"],
    "status":"LOCAL_ONLY", "createdAt":"2026-10-20T00:00:00Z"
  }
}
```

미래 실제 데이터 구조는 기관 협약, FHIR/표준화, 보안·법률 검토 후 별도 설계. 위 JSON은 실제 환자정보나 확정된 Firestore 구조가 아니다.

## 5. Firebase 구현 전 안전 게이트

1. 테스트는 별도 Firebase **에뮬레이터·합성 자료만** 사용한다. 앱에 관리자 비밀키/Service Account credential을 포함하지 않는다.
2. Firebase Authentication 로그인이 성공했다는 사실만으로 환자 차트 접근을 허용하지 않는다. 병원에서 관리하는 환자-사용자 매핑과 부서·보호자 권한을 **서버에서** 확인한다.
3. Firestore Security Rules에서 타 환자의 정보, 변경 요청, 의료진 승인 전 데이터 접근을 거부하는 테스트를 작성한다. 복합 쿼리/읽기 규칙도 검증한다.
4. 변경요청은 Cloud Functions 등 서버 검증을 거쳐 처리하고 의도한 기관·필드만 보내야 한다. 로그에 민감정보를 그대로 남기지 않는다.
5. 가족·보호자 정보공유는 명시적 범위/기간/철회, 환자 동의능력과 법적 권한 확인을 별도 설계한다.
6. 실제 개인정보/의료정보 취급 전에 적법성·계약·보안·보존기간·위탁/제3자 제공 및 관련 의료기기 규제 여부를 전문가와 확인한다.

**현재 v1.2에는 Firebase, 실제 서버, 실환자 본인인증, 의료기관 전송이 구현돼 있지 않다.**
