# 신청자 표시·차단 설계

## 단일 정책
백엔드 신청자 경계에 불변 재업로드 코드 집합과 순수 selector를 둔다. 원래 finding의 severity가 정확히 FAIL인 경우만 선택한다(기존 severity 누락은 원래 계약대로 FAIL로 해석하되 알려진 code가 있어야 함). code 미상·메시지만 있는 FAIL은 노출/차단하지 않는다. 문서 전체 stage1_status만으로 고르지 않는다. 원판정과 독립인 신청자 status=UPLOADED/REUPLOAD_REQUIRED를 직렬화한다. UI 문구는 업로드 완료/다시 올려 주세요이고 적격·승인이라는 의미를 부여하지 않는다.

`document_dict`는 공통 projection을 사용하되 원래 findings 전체에서 타인 성명/생년월일 마스킹을 먼저 결정한다. officer._document_view와 document_fact는 원값을 계속 사용한다. 신청자 원시 응답에 내부 상태·신뢰도를 남기고 CSS로만 숨기지 않는다. API 타입과 해당 프런트 소비자를 함께 수정한다.

## 제출 준비
기존 /final-check API는 3단계 준비 상태 조회로 유지하고 화면 FinalCheck.tsx/final-check.css와 final stage/step은 제거한다. /apply/final 옛 주소는 업로드로 정규화한다. `_blockers`는 입력/동의/필수서류/근로유형/기존 사업별 지원항목 검사는 유지하고 eligibility_blockers 기여를 제거한다. 문서 blocker는 허용 목록만 따른다. `_run_review`/저장/담당자 API는 수정하지 않는다.

자가진단 evaluate와 저장 answers는 유지한다. 신청자 응답은 작성 완료 상태만 전달하며 부적격 사유·대안·failed_item을 빼고, 프런트는 답변 누락/필수 동의만 검사한다. 본인인증·신청 조회·status의 age eligibility_blockers와 경고/보완·결과 표현도 점검해 내부 FAIL/REVIEW 누출을 없앤다. 미인증·권한 오류·이미 제출된 신청 거부·저장/통신 오류 처리는 기존 보호 규칙으로 유지한다.

업로드/교체/삭제/근로유형·서식5 제출방식 변경/서식·동의 저장 후 준비 상태를 재조회한다. 오래된 응답이 최신 상태를 덮지 않도록 요청 세대 또는 취소 처리를 한다. 제출 전 저장 큐를 비우고 서버 submit이 최신 조건을 다시 검사한다. 통신 오류나 판독 중에는 제출을 잠그고 현재 작업 상태를 설명한다.

## 모달
서류별 label, slot_key, 승인된 public 사유만 사용한다. 동일 사유를 dedup하고 모든 현재 재업로드 서류를 묶는다. 열린 동안 결과가 추가되면 한 목록을 갱신하며 팝업을 겹치지 않는다. 자동 열기는 현재 결함 묶음 fingerprint가 바뀌었을 때로 한정하고 언제든 다시 열기 버튼을 제공한다. 제거·재업로드 후 목록과 차단이 함께 갱신된다.

기존 Modal은 Escape/스크롤 잠금/role만 있고 포커스 트랩·진입/복원·배경 inert가 없다 (`components/Modal.tsx:24`). 공용 기능을 보완하거나 전용 dialog를 만들어 다른 PDF/서명 모달과 포커스·중첩 해제를 충돌 없이 처리한다. 큰 dialog의 제목에 tabIndex=-1 및 aria-labelledby, 간단한 요약에 aria-describedby, 항목은 제목/목록 구조를 사용한다. 긴 전체 목록을 aria-describedby에 넣어 중복 낭독하지 않는다. 배경 inert 상태와 overflow는 정확히 복원한다.

## 진단 도구/시험 영향
공유 applicant_findings/document_blockers를 사용하는 verify_upload/verify_cases의 신청자 파생 출력은 정책과 일치해야 한다. 원래 document_status/reason/work_status/income_status 및 저장 값은 유지한다. 신청자용 applicant_reason/blockers만 변경 후보이며 test-impact.md에 따라 별도 승인받는다. 기존 spec의 CLI 기대값 고정 지침과 충돌하므로 사용자 요구에 따른 예외를 승인·기록한다. 전체 진단 구현 재편은 하지 않는다.

## 담당자 경계
새로 허용된 신청을 정상 submit하여 Review를 원판정대로 저장하고 기존 담당자 API에서 조회 가능한지 검증한다. 원값 FAIL를 NEEDS_REVIEW로 치환하지 않는다. 실제 담당자 확인필요 필터/라벨은 후속 담당자 저장소 범위다.
