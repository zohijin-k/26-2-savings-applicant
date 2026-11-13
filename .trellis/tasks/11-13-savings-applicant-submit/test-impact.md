# 2단계 기존 시험 영향 — 사전 검토 목록

현재 기존 시험은 수정·삭제하지 않았다. 아래는 계획상 기대값 변경이 명확한 이름과 검토 후보다. 구현 시작 전 후보별로 변경 전/후 단언을 확정하여 승인받는다. 이 목록이 엔진·저장·담당자 단언 약화에 대한 포괄 승인은 아니다. 새 영향이 나오면 수정 전에 추가 승인받는다.

## A. 담당자·취업지원패키지 화면 제거에 따른 시험 삭제
**0개.** 백엔드 담당자/취업 회귀 시험은 그대로 보존한다. FinalCheck 프런트 파일 삭제에도 기존 전용 UI 시험 파일은 없으며 서버 final-check 시험은 유지한다.

## B. 명확한 신청자 기대값 변경 제안
| 파일 | 시험 이름 | 변경 이유/의도 |
|---|---|---|
| test_applicant_failure_findings.py | test_projection_uses_same_document_findings_not_status_or_code | 모든 내부 상태 대신 신청자 중립 상태, 허용 FAIL만 표시; 원본 불변 단언 보존 |
| test_applicant_failure_findings.py | test_historical_message_only_failure_hides_review_but_preserves_reference | 코드 없는 과거 FAIL은 재업로드 목록에 해당하지 않아 숨김; 참고 INFO 처리 별도 확인 |
| test_applicant_failure_findings.py | test_review_without_fail_and_other_documents_retain_existing_guidance | review-only 안내 숨김, 제출 허용은 유지 |
| test_applicant_failure_findings.py | test_upload_list_final_and_officer_keep_reference_but_hide_only_review | 모든 applicant endpoint에 허용 목록 적용, officer/DB 전체 원사유 유지 |
| test_eligibility_blockers.py | test_confirmed_regional_excess_includes_numeric_evidence_without_scores | 신청자 소득 blocker/숫자 근거 숨김; 내부 소득 원판정은 검증 유지 |
| test_eligibility_blockers.py | test_submit_rechecks_income_after_a_previously_clear_final_check | 새 소득 초과로 400/draft 유지 -> 접수·Review 원판정 저장 |
| test_eligibility_blockers.py | test_age_outside_range_has_same_early_reason_and_final_blocker | 인증/조회/status 연령 blocker 비노출, 필수값 부족 차단은 유지 |
| test_eligibility_blockers.py | test_work_not_met_blocks_final_and_direct_submit | 근로 NOT_MET도 접수 허용, 원래 FAIL/사유는 Review·담당자에서 유지 |
| test_eligibility_blockers.py | test_submit_rechecks_other_eligibility_after_clear_final_check | age/work 자격 변화 자체는 제출 거절 사유가 아님 |
| test_failure_cases_work_acceptance.py | test_source_shaped_work_failure_reaches_all_consumers | API 자격 차단 단언만 접수 허용으로 변경; 추출·근로·담당자 판정 단언은 유지 |
| run_p3_scenarios.py | test_e2e_s7 | 확정 소득 초과 접수 차단 기대 -> 정상 접수 후 원판정 검증 |
| run_p4_scenarios.py | _create | 소득 초과 합성 historical 우회 대신 실제 제출로 같은 담당자 검증 데이터 준비 |
| run_p6_scenarios.py | s1_self_check_blocks | 자가진단 자격 부적격의 신청자 표시·단계차단 제거, 답변 필수 검증은 유지 |
| run_p6_scenarios.py | s7_income_over | 400/미생성 Review/historical fixture -> 실제 200/원판정 Review, S7 합성 expected JSON의 해당 공개 계약만 갱신 |
| run_p6_scenarios.py | s8_needs_review | 신청자 review 표시 -> 업로드 완료; 담당자 NEEDS_REVIEW 큐·판정은 유지 |
| run_p18_applicant_precheck_scenarios.py | test_api | REVIEW/PASS 원래 상태 직접 반환 -> 중립 신청자 상태, 누락쪽·본인 불일치 차단 및 마스킹 유지 |

모든 경로는 `demo/backend/tests/` 기준이다. 시험 이름 변경이 필요하면 같은 항목에 새 이름도 함께 기록한다. `demo/fixtures/expected/S*.json`은 가상 시나리오 기대 파일이며 실제 변경 키는 구현 직전 명세에 포함한다.

## C. 공유 진단 CLI의 파생 기대값 변경 검토
| 파일 | 시험 이름 | 검토할 기대값 |
|---|---|---|
| test_verify_upload.py | test_failure_case_cli, test_short_birth_reference_requires_self_identity_and_unique_program_range, test_income_uses_three_real_synthetic_files, test_work_history_in_nhis_slot_uses_actual_work_blocker, test_image_portal_title_interleaving_retains_existing_uncertainty | 허용 밖 근로/소득 차단 O->X, review applicant_reason 비출력. document_status/reason/work_status/income_status는 유지 |
| test_followup_failure_acceptance.py | test_source_shaped_four_page_pdf_cli_rejects_missing_work_months, test_short_year_copy_disagreement_still_prevents_work_rejection | 근로 NOT_MET를 이유로 한 신청자 blockers 변경 여부; 근로 원판정 그대로 |
| test_followup_daily_reproduction.py | test_short_birth_cli_reference_without_program_stays_unresolved, test_short_birth_cli_unique_program_range_proves_work_failure_without_changing_fields | 신청자 blocker/projection 파생 출력만 점검 |
| test_quality_failure_policy.py | test_source_daily_pdf_cli_preserves_selection_and_work_results | 부분 선택 FAIL은 계속 저장/진단하되 신청자 재업로드/차단에서는 제외 |
| test_verify_cases.py | test_case_level_deltas, test_noisy_dependency_and_unreviewed_findings_never_escape | 합성 snapshot applicant_reason/blocker 차이만; 보안·값 유출 검증 유지 |

기존 verify-cases spec의 CLI 기대값 고정 지침은 사용자 요구에 따라 신청자 파생 출력에만 예외가 필요하다. 원래 판정 출력을 바꾸지 않는다. 별도 진단 기준을 보존하는 설계가 필요하다면 이 변경 전에 범위를 다시 검토한다.

## D. 중립 status 도입에 따른 추가 검토 후보
조사에서 신청자 API·projection 호출이 확인된 함수는 아래 자동 인벤토리에 전부 기록한다. 이것은 **변경 승인 목록이 아니라** 누락 방지 조사 목록이다. 실제로 status/findings/자가진단/경고 기대가 달라지는 시험은 구현 직전에 변경 전/후 기대값을 나열해 사용자 승인 후 수정한다. 내부 규칙/엔진 전용 시험은 변경하지 않는다.
- `run_p18_applicant_precheck_scenarios.py`: `test_api` (line 185)
- `run_p3_scenarios.py`: `test_e2e` (line 390), `test_e2e_s7` (line 482)
- `run_p4_scenarios.py`: `_create` (line 104)
- `run_p5_scenarios.py`: `test_checklist_assembly` (line 292), `test_s10_end_to_end` (line 433), `test_supplement_countdown` (line 513)
- `run_p6_scenarios.py`: `s1_self_check_blocks` (line 342), `s2_perfect` (line 371), `s7_income_over` (line 473), `s8_needs_review` (line 505), `s10_job_package` (line 611)
- `run_p7_scenarios.py`: `_submit` (line 1318)
- `run_p8_localocr_scenarios.py`: `test_applicant_payload` (line 487)
- `run_p9_identity_scenarios.py`: `check_applicant_name_hidden` (line 94), `test_nhis_dependent_reconciliation` (line 108), `test_officer_view` (line 350)
- `test_applicant_failure_findings.py`: `test_projection_uses_same_document_findings_not_status_or_code` (line 41), `test_empty_and_nonfinding_entries_retain_existing_ignored_behavior` (line 64), `test_historical_message_only_failure_hides_review_but_preserves_reference` (line 68), `test_review_without_fail_and_other_documents_retain_existing_guidance` (line 75), `test_hidden_identity_review_cannot_expose_original_name_or_birth` (line 86), `test_upload_list_final_and_officer_keep_reference_but_hide_only_review` (line 94), `test_daily_unknown_checkbox_reference_metadata_survives_existing_boundary` (line 149), `test_source_shaped_case_cli_shows_only_applicant_failures` (line 167)
- `test_eligibility_blockers.py`: `blockers` (line 31), `test_confirmed_regional_excess_includes_numeric_evidence_without_scores` (line 39), `test_submit_rechecks_income_after_a_previously_clear_final_check` (line 53), `test_age_outside_range_has_same_early_reason_and_final_blocker` (line 72), `test_work_not_met_blocks_final_and_direct_submit` (line 90), `test_undetermined_income_remains_submittable_for_officer_review` (line 113), `test_unknown_work_remains_submittable_and_final_review_is_consistent` (line 125), `test_submit_rechecks_other_eligibility_after_clear_final_check` (line 146), `test_program_without_configured_call_center_uses_public_contact_page` (line 172)
- `test_failure_cases_work_acceptance.py`: `test_source_shaped_work_failure_reaches_all_consumers` (line 20)
- `test_followup3_daily_reproduction.py`: `test_source_notice_and_selection_note_now_prove_complete_daily_work` (line 18)
- `test_followup_daily_reproduction.py`: `test_short_birth_cli_reference_without_program_stays_unresolved` (line 55), `test_short_birth_cli_unique_program_range_proves_work_failure_without_changing_fields` (line 68)
- `test_followup_failure_acceptance.py`: `test_source_shaped_four_page_pdf_cli_rejects_missing_work_months` (line 28), `test_short_year_copy_disagreement_still_prevents_work_rejection` (line 59), `test_sparse_address_document_and_actual_blocker_agree` (line 79), `test_sparse_address_actual_image_cli_blocks_without_value_output` (line 96)
- `test_quality_failure_policy.py`: `test_specific_date_page_and_quality_failures_all_reach_one_blocker` (line 69), `test_source_daily_pdf_cli_preserves_selection_and_work_results` (line 109), `test_actual_synthetic_image_upload_and_final_check_show_both_failures` (line 127)
- `test_resident_number_privacy.py`: `test_upload_persisted_results_responses_logs_and_birth` (line 37), `test_legacy_stored_ocr_values_are_masked_in_read_projections` (line 90)
- `test_verify_upload.py`: `test_failure_case_cli` (line 92), `test_short_birth_reference_requires_self_identity_and_unique_program_range` (line 154), `test_income_uses_three_real_synthetic_files` (line 337), `test_work_history_in_nhis_slot_uses_actual_work_blocker` (line 373), `test_image_portal_title_interleaving_retains_existing_uncertainty` (line 401)
