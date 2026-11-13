# 독립 검토 시험 영향

기존 시험 삭제·이름 변경: 0. 검토자가 기존 시험의 기대값을 직접 바꾼 항목: 0. `_supplement` 공개 반환 변경으로 영향을 받은 P5/P6의 기존 시험 전후 값은 `scenario-test-impact.md`에 기록한다.

| 파일 | 새 시험 | 기대값·검증 이유 |
|---|---|---|
| `demo/backend/tests/test_applicant_supplement_projection.py` | `test_supplement_projects_only_public_repair_targets` (두 사업 × 4 경우 = 8개) | review-only·허용 밖 FAIL → 공개 보완 `None`; 허용 재업로드·필수 미업로드 → 기존 기한과 해당 공개 대상 유지. 모든 경우 저장 객체의 기한·판정·사유 불변. |
| 동일 파일 | `test_applicant_status_hides_empty_internal_deadline_but_keeps_stored_review` (1개) | 실제 `/status`가 숨긴 내부 판정의 보완 기한을 반환하지 않고 DB의 NEEDS_REVIEW/기한을 보존. |
| `demo/frontend/tests/reupload-guidance.test.ts` | `the public guidance covers exactly the agreed ten reupload codes` (1개) | 프런트 안내 코드가 승인된 정확한 10개와 일치. |
| 동일 파일 | `${code}: only confirmed FAIL appears in reupload guidance` (10개) | 동일 코드의 FAIL만 표시, NEEDS_REVIEW·INFO 숨김, 입력 사유 불변. |
| 동일 파일 | `unknown and other internal failures do not create a public repair reason` (1개) | 미등록 코드·내부 FAIL·객체 상속 키가 공개 사유로 유입되지 않음. |
| 동일 파일 | `a known historical code without severity keeps the server default FAIL policy` (1개) | 알려진 과거 코드에서 생략 severity의 기존 FAIL 기본값을 서버와 일치시킴. |
| 동일 파일 | `mixed repeated findings retain every distinct actionable code in source order` (1개) | 혼합 사유에서 허용 사유 전체·입력 순서·중복 제거를 함께 보존. |
| 동일 파일 | `government and insurance issuer deep links use their official home pages` (1개) | gov.kr/nhis.or.kr 기관·하위 호스트 주소를 기관 첫 화면으로 정규화. |
| 동일 파일 | `other issuers require a valid HTTPS link and do not match lookalike hosts` (1개) | 다른 기관 HTTPS 보존, 유사 호스트를 정부 도메인으로 오인하지 않음, JavaScript·HTTP·잘못된 주소 제거. |

검토자 검증 실측: 위 백엔드 9개 통과; `node --test demo/frontend/tests/reupload-guidance.test.ts` 16개 통과; frontend lint 경고 1개(기존 StatusBadge fast-refresh), build 통과. 초기 신규 Node 시험을 앱 src에 둔 상태에서는 Node 타입 미설정으로 build가 실패했으나, 독립 tests 디렉터리로 옮겨 제품 설정 변경 없이 해결하고 재검증했다.
