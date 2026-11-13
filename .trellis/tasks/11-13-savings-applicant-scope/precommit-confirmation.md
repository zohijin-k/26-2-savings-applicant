# 커밋 전 추가 확인

사용자가 1단계 커밋을 승인하면서 지원항목 및 서식 보존 확인을 조건으로 요청했다. 확인 중 용어 차이를 발견하여 커밋을 보류했고, 사용자가 지원항목은 `savingPurpose`(저축목적)를 뜻한다고 명시했다.

## 1. 지원항목/저축목적
- main의 DOUBLE_SAVINGS는 has_subsidy_items=False, JOB_PACKAGE만 True다. 기존 ApplyFlow도 이 값으로 SubsidyItems 단계에 진입했으므로 삭제한 화면·라우트는 취업지원패키지 전용이다.
- 저축목적은 form1.savingPurpose와 기존 여섯 보기로 유지했다. 서식1 필수 목록에 그대로 포함되어 미입력 시 2단계의 서류 업로드로 버튼이 비활성화된다.
- 선택/저장/미리보기/편집 복귀/다음 단계 전환을 main과 현재 코드에 동일 합성 입력으로 실행하여 동등함을 확인했다.
- 정확한 기존 계약: 서버 최종 submit의 required_form_fields에는 savingPurpose가 main에도 없었다. 저축목적 차단은 기존 2단계 UI의 필수 완료 검증이다. 이번에 백엔드에 새 조건을 추가하거나 기존 조건을 제거하지 않았다.

## 2. 서식 세 파일
- form-field-bindings: 서식1~5의 모든 key와 배열 순서가 main과 동일하다. job_application/job_consent만 제거됐다.
- form2-model: 취업 전용 JOB_PACKAGE_SELF_CHECK_ITEMS/FOOTER만 제거됐고, 두배적금 export 데이터는 main과 동일하다.
- PdfFormsWorkspace: 취업 전용 지원항목·연결 회차·서명·별도 modal을 제거했다. 공용 분기는 double_savings에서 항상 참/거짓이던 경로를 그대로 단순화했다. '줄어든 모든 줄이 취업 코드'라는 문자 그대로의 주장은 하지 않으며, 두배적금 실행 동등성으로 보존을 검증했다.
- 실제 이전/현재 Workspace를 같은 React test-renderer에서 실행하고 기존 다섯 서식 좌표 맵과 합성 입력을 사용했다. 초기 렌더 트리, 선택/입력값, 저장 payload, 미리보기 URL 및 상태, 다음 단계 진행과 progress 알림이 일치했다. 브라우저 시각 검증을 수행한 것은 아니다.

검증 스크립트: /tmp/savings_scope_forms_comparison.cjs
결과/로그: /tmp/savings-scope-forms-comparison.json, /tmp/savings-scope-forms-comparison.log
이 확인 과정에서도 기존 시험·기대값·제품 코드는 수정하지 않았다. 두 조건에 따른 기능 영향은 발견하지 못했으므로 승인된 1단계 커밋을 진행한다.
