# 통합 설계와 승인 경계

## 단계 분리
1. `refactor/savings-applicant-scope`: 화면 범위와 문서. 판정·제출 정책은 현재 동작을 유지한다.
2. `feat/savings-applicant-submit`: 1단계가 승인·커밋되고 main에 통합된 후 해당 main에서 분기한다. main 통합이 아직 안 된 경우 임의 병합·cherry-pick하지 않고 단계 2의 기준을 승인받는다.

두 브랜치는 이 계획 턴에서 만들거나 checkout하지 않는다. task.json의 branch는 예정 이름만 기록한다. 상위 태스크는 통합 요구사항·검토 문서만 소유한다.

## 판정 경계
저장된 Document/Review -> (a) 엔진/담당자 원래 표현 (변경 없음), (b) 신청자 전용 projection (2단계 변경).
신청자 projection과 제출 검사에 한 재업로드 코드 정책을 공유한다. 엔진 FAIL를 PASS로 저장하거나 review payload를 다시 써서 화면을 맞추지 않는다. 정규화한 신청자 상태는 UPLOADED/REUPLOAD_REQUIRED이며, 이는 자격 적합 판정이 아니다.

## 호환성과 제한
- 기존 본인인증·서식·세션 복원·마이페이지·원본 서식 내려받기는 유지한다.
- 오래된 담당자/사업 선택 URL은 신청 본인인증으로 정규화하고, 오래된 /apply/final은 2단계에서 /apply/upload로 정규화한다. 기존 다른 사업 세션은 두배적금으로 몰래 전환/재사용하지 않는다.
- 담당자 API·취업패키지 백엔드·공유 서식 템플릿·DB는 삭제하지 않는다.
- 개발자 진단 CLI는 이미 신청자 projection/차단 함수를 공유한다. 정책 변경이 파생 출력에 미치는 영향은 2단계 시험 영향표에서 별도 승인한다. 원판정 출력·개인정보 보안 검증은 유지한다.
- 범위를 되돌려야 하면 해당 단계 커밋만 되돌린다. DB migration이 없어 데이터 복구 작업은 필요 없다.

## 산출물
각 하위 태스크의 prd.md/design.md/implement.md, research.md, test-impact.md, 2단계 reason-guidance.md. 최종 검증은 단계별 verification.md에 새로 기록한다.
