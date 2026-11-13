# 2단계 시험 변경 최종 기록

2026-11-13 사용자가 승인한 무인 구현에 따른 실제 변경 목록이다. 기존 시험 삭제·이름 변경 0개. engine/engine_v2 구현·시험의 기대값 변경 0개. 기존 백엔드 시험 파일 18개 및 시나리오 모듈 13개에서 58개/26개의 기존 함수·픽스처를 변경했다. 아래에는 파일·시험 이름·정확한 전후 diff·이유를 빠짐없이 수록했다.

신규 백엔드 회귀는 103개 제출 정책 + 9개 보완 projection = 112개이며, 1,227 → 1,339 통과다. 신규 프런트 Node 회귀 16개가 통과했고 기존 프런트 시험 변경·삭제는 0개다. 전체 시나리오는 1,885 → 1,955(+70), 실패 0이다. 함수 수는 매개변수별 실행 건수와 다르다. P3 집계 186 → 185는 제거된 공개 소득 차단 단언을 정상 제출·저장 Review 검사로 대체한 영향이며 기존 시험 함수나 엔진·점수·담당자 단언을 삭제한 것이 아니다.

## 시험 파일 전체 목록

| 상태 | 파일 |
|---|---|
| M | `demo/backend/tests/run_p12_subsidy_criteria_scenarios.py` |
| M | `demo/backend/tests/run_p13_household_scenarios.py` |
| M | `demo/backend/tests/run_p15_jbai_scenarios.py` |
| M | `demo/backend/tests/run_p16_job_docs_scenarios.py` |
| M | `demo/backend/tests/run_p17_own_scenarios.py` |
| M | `demo/backend/tests/run_p18_applicant_precheck_scenarios.py` |
| M | `demo/backend/tests/run_p19_nhis_history_scenarios.py` |
| M | `demo/backend/tests/run_p3_scenarios.py` |
| M | `demo/backend/tests/run_p4_scenarios.py` |
| M | `demo/backend/tests/run_p5_scenarios.py` |
| M | `demo/backend/tests/run_p6_scenarios.py` |
| M | `demo/backend/tests/run_p7_scenarios.py` |
| M | `demo/backend/tests/run_p9_identity_scenarios.py` |
| M | `demo/backend/tests/test_address_resolution_failures.py` |
| M | `demo/backend/tests/test_applicant_failure_findings.py` |
| A | `demo/backend/tests/test_applicant_submission_policy.py` |
| A | `demo/backend/tests/test_applicant_supplement_projection.py` |
| M | `demo/backend/tests/test_daily_work_uploads.py` |
| M | `demo/backend/tests/test_eligibility_blockers.py` |
| M | `demo/backend/tests/test_failure_cases_work_acceptance.py` |
| M | `demo/backend/tests/test_followup_failure_acceptance.py` |
| M | `demo/backend/tests/test_mixed_attachments.py` |
| M | `demo/backend/tests/test_nhis_recent_history.py` |
| M | `demo/backend/tests/test_p2_business_uploads.py` |
| M | `demo/backend/tests/test_p2_nhis_uploads.py` |
| M | `demo/backend/tests/test_p2_payment_uploads.py` |
| M | `demo/backend/tests/test_p2_resident_uploads.py` |
| M | `demo/backend/tests/test_portal_uploads.py` |
| M | `demo/backend/tests/test_quality_failure_policy.py` |
| M | `demo/backend/tests/test_resident_number_privacy.py` |
| M | `demo/backend/tests/test_review_regressions.py` |
| M | `demo/backend/tests/test_verify_cases.py` |
| M | `demo/backend/tests/test_verify_upload.py` |
| A | `demo/frontend/tests/reupload-guidance.test.ts` |

M은 기존 파일 변경, A는 신규 파일이다. 테스트 파일 D는 없다. 가상 기대 JSON S1~S8·S10의 키별 전후 값과 서술 변경은 시나리오 상세에 함께 수록한다.

# Backend pytest expectation changes

User authorization: unattended step-two implementation explicitly permits existing expectation changes, provided file/test/before/after/reason are recorded. No existing tests were deleted or renamed.

The original stored PASS/FAIL/NEEDS_REVIEW checks remain in `assert_upload_status(data, original_expected)`; that helper queries the actual saved Document, checks original stage1_status, then asserts the neutral applicant projection and absence of ocr_confidence. Hidden finding assertions read `stored_findings` instead, while separately requiring empty public findings. Engine/rule tests and officer expectations remain.

Existing changed functions/fixtures: 58. All names and exact before/after changes are enumerated below.

## demo/backend/tests/test_address_resolution_failures.py :: test_actual_synthetic_image_upload_fails_with_certain_codes

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -9,5 +9,5 @@

     Image.new("RGB",pages[0][0].pixel_size,"white").save(path)
     data,stored=upload(client,new_app(client),path,"resident_abstract",filename="FAKE.png")
-    assert data["status"] == "FAIL"
+    assert_upload_status(data, "FAIL")
     assert expected in {f["code"] for f in data["findings"] if f["severity"]=="FAIL"}
     if kind=="tiny":
```

## demo/backend/tests/test_applicant_failure_findings.py :: test_projection_uses_same_document_findings_not_status_or_code

Reason: Only the ten actionable FAIL codes remain public, with neutral status; all original findings and officer data remain stored, and internal review guidance is hidden.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -11,8 +11,7 @@

     shown = common.document_dict(row(source, status))
     assert [(f["code"], f["severity"]) for f in shown["findings"]] == [
-        ("MISSING_BILLING_MONTHS", "FAIL"), ("FAKE_REFERENCE", "INFO"),
-        ("LOW_IMAGE_QUALITY", "FAIL"), ("FAKE_OTHER_TIER", "WARNING"),
+        ("MISSING_BILLING_MONTHS", "FAIL"), ("LOW_IMAGE_QUALITY", "FAIL"),
     ]
-    assert shown["status"] == status
+    assert shown["status"] == "REUPLOAD_REQUIRED"
     assert all("detail" not in f for f in shown["findings"])
     assert source == before
```

## demo/backend/tests/test_applicant_failure_findings.py :: test_historical_message_only_failure_hides_review_but_preserves_reference

Reason: Only the ten actionable FAIL codes remain public, with neutral status; all original findings and officer data remain stored, and internal review guidance is hidden.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -3,3 +3,3 @@

               finding("LOW_OCR_CONFIDENCE", "NEEDS_REVIEW"), finding("FAKE_REFERENCE", "INFO")]
     shown = common.applicant_findings(source)
-    assert shown == [source[0], {k: v for k, v in source[-1].items() if k != "detail"}]
+    assert shown == []
```

## demo/backend/tests/test_applicant_failure_findings.py :: test_review_without_fail_and_other_documents_retain_existing_guidance

Reason: Only the ten actionable FAIL codes remain public, with neutral status; all original findings and officer data remain stored, and internal review guidance is hidden.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -5,5 +5,6 @@

     failed = row([finding("LOW_IMAGE_QUALITY")])
     assert len(common.document_dict(failed)["findings"]) == 1
-    assert common.document_dict(review)["findings"][0]["how_to_fix"] == source[0]["how_to_fix"]
+    assert common.document_dict(review)["findings"] == []
+    assert common.document_dict(review)["status"] == "UPLOADED"
     requirement = DocRequirement("work_proof", DocType.INSURANCE_4, "가짜 서류")
     assert document_blockers([requirement], [review]) == []
```

## demo/backend/tests/test_applicant_failure_findings.py :: test_upload_list_final_and_officer_keep_reference_but_hide_only_review

Reason: Only the ten actionable FAIL codes remain public, with neutral status; all original findings and officer data remain stored, and internal review guidance is hidden.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -17,12 +17,12 @@

     monkeypatch.setattr(documents, "assess_upload", lambda *a, **kw: (read, result))
     response, _ = upload(client, aid, path, "resident_abstract", filename="FAKE.png")
-    expected = [(f.code, f.severity) for f in source if not (failed and f.severity == "NEEDS_REVIEW")]
+    expected = [(f.code, f.severity) for f in source if f.severity == "FAIL" and f.code in common.REUPLOAD_CODES]
     assert [(f["code"], f["severity"]) for f in response["findings"]] == expected
-    assert response["status"] == result.status
+    assert response["status"] == ("REUPLOAD_REQUIRED" if failed else "UPLOADED")
     listed = client.get(f"/api/applications/{aid}/documents").json()
     assert listed[0]["findings"] == response["findings"]
     final = client.get(f"/api/applications/{aid}/final-check").json()
     assert final["documents"][0]["findings"] == response["findings"]
-    assert final["documents"][0]["status"] == result.status
+    assert final["documents"][0]["status"] == response["status"]
     doc_blockers = [b for b in final["blockers"] if b["kind"] == "document" and b["target"] == "resident_abstract"]
     assert bool(doc_blockers) is failed
@@ -35,8 +35,9 @@

         assert all(f.message in submitted.json()["detail"] for f in source if f.severity == "FAIL")
     else:
-        assert response["findings"][0]["how_to_fix"] == source[0].how_to_fix
-        assert any("담당자 확인 예정 서류가 1건" in warning for warning in final["warnings"])
+        assert response["findings"] == []
+        assert not any("담당자 확인 예정" in warning for warning in final["warnings"])
     with models.get_session() as session:
         stored = session.get(models.Document, response["document_id"])
+        assert stored.stage1_status == result.status
         assert stored.findings_json == [f.as_dict() for f in source]
         officer_document = officer._document_view(stored, {})
```

## demo/backend/tests/test_daily_work_uploads.py :: test_four_page_text_pdf_renaming_and_wrong_expected_preserve_daily_results

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -13,5 +13,5 @@

         response,stored=upload(client,aid,path,"work_proof",filename=filename)
         assert response["detected_doc_type"]==str(DocType.DAILY_WORK_RECORD)
-        assert response["status"]=="PASS"
+        assert_upload_status(response, "PASS")
         assert all(finding["severity"]!="FAIL" for finding in response["findings"])
         assert stored["fields"]==direct.fields
```

## demo/backend/tests/test_daily_work_uploads.py :: test_four_page_image_pdf_uses_mocked_own_words_through_upload

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -9,5 +9,5 @@

     use_own_words(monkeypatch,shaped(two_digit=two_digit,image=True))
     response,stored=upload(client,new_daily_app(client),path,"work_proof")
-    assert response["status"]=="PASS"
+    assert_upload_status(response, "PASS")
     assert stored["fields"]==direct.fields
     assert stored["engine"]=="own"
```

## demo/backend/tests/test_daily_work_uploads.py :: test_incomplete_period_or_disagreeing_copies_remain_upload_review

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -6,5 +6,5 @@

     response,stored=upload(client,new_daily_app(client),path,"work_proof")
     assert response["detected_doc_type"]==str(DocType.DAILY_WORK_RECORD)
-    assert response["status"]=="NEEDS_REVIEW"
+    assert_upload_status(response, "NEEDS_REVIEW")
     assert all(finding["severity"]!="FAIL" for finding in response["findings"])
     assert stored["confidence"]<=.4
```

## demo/backend/tests/test_daily_work_uploads.py :: test_two_digit_birth_not_matching_verified_identity_stays_review

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -2,6 +2,7 @@

     path=text_pdf(tmp_path/"FAKE-two-digit-other.pdf",shaped(two_digit=True))
     response,stored=upload(client,new_daily_app(client,birth=birth),path,"work_proof")
-    assert response["status"]=="NEEDS_REVIEW"
-    assert "IDENTITY_UNCERTAIN" in {finding["code"] for finding in response["findings"]}
+    assert_upload_status(response, "NEEDS_REVIEW")
+    assert response["findings"] == []
+    assert "IDENTITY_UNCERTAIN" in {finding["code"] for finding in stored_findings(response)}
     assert all(finding["severity"]!="FAIL" for finding in response["findings"])
     assert "생년월일" not in stored["fields"]
```

## demo/backend/tests/test_eligibility_blockers.py :: ready

Reason: Enrich synthetic ready fixture with newly enforced stage-two required fields, all self-check answers, valid mobile, actual synthetic PNG signature. Original income/work document evidence remains.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -4,7 +4,10 @@

         stored=session.get(models.Application,app.id)
         stored.form1_json={**dict.fromkeys((key for key,_ in program.required_form_fields),"FAKE"),
-                           **stored.form1_json,"email":"fake@example.invalid"}
+                           **stored.form1_json,"email":"fake@example.invalid", "mobile":"01000000000",
+                           **dict.fromkeys(("savingPurpose","priorJoined","gender","householdType","workType","workplaceRegion","accountHolder"), "FAKE")}
+        stored.self_check_json=dict.fromkeys(map(str,range(1,9)),"예")
+        stored.form5_json={"agree":"동의함","signature":'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAKCAIAAAA7N+mxAAAAD0lEQVR4nGNgGAWjgJYAAAJiAAHFL8rUAAAAAElFTkSuQmCC'}
         for consent in program.consent_types:
-            session.add(models.Consent(application_id=app.id,consent_type=consent,agreed=True))
+            session.add(models.Consent(application_id=app.id,consent_type=consent,agreed=True, signature_path="FAKE-signature.png" if consent=="admin_info" else None))
         session.add(stored)
         session.commit()
```

## demo/backend/tests/test_eligibility_blockers.py :: test_confirmed_regional_excess_includes_numeric_evidence_without_scores

Reason: Internal income/age/work eligibility remains asserted; applicant API suppresses eligibility blockers and accepts completed applications, with original FAIL/NEEDS_REVIEW persisted in Review and officer data.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -2,6 +2,7 @@

     app=ready(make_application(premium=MEDIAN_INCOME_140[1]["지역"]+1))
     data=client.get(f"/api/applications/{app.id}/final-check").json()
-    item=next(item for item in data["blockers"] if item["kind"]=="eligibility" and item["target"]=="income")
-    assert not data["can_submit"]
+    item=next(item for item in blockers(app) if item["target"]=="income")
+    assert data["can_submit"]
+    assert not any(item["kind"]=="eligibility" for item in data["blockers"])
     assert item["code"]=="OVER_LIMIT" and item["goto"]=="upload"
     assert item["evidence"]["limits_140"]=={"지역":46072}
@@ -10,3 +11,7 @@

     assert not any(word in json.dumps(item,ensure_ascii=False) for word in ["총점","배점","tiebreak","income_percent"])
     response=client.post(f"/api/applications/{app.id}/submit")
-    assert response.status_code==400
+    assert response.status_code==200
+    with models.get_session() as session:
+        reviewed=session.exec(select(models.Review).where(models.Review.application_id==app.id)).one()
+        assert reviewed.score_json["income_status"]=="OVER_LIMIT"
+        assert reviewed.final_status=="FAIL"
```

## demo/backend/tests/test_eligibility_blockers.py :: test_submit_rechecks_income_after_a_previously_clear_final_check

Reason: Internal income/age/work eligibility remains asserted; applicant API suppresses eligibility blockers and accepts completed applications, with original FAIL/NEEDS_REVIEW persisted in Review and officer data.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -11,7 +11,8 @@

         session.commit()
     response=client.post(f"/api/applications/{app.id}/submit")
-    assert response.status_code==400
-    assert "소득" in response.json()["detail"]
+    assert response.status_code==200
     with models.get_session() as session:
-        assert session.get(models.Application,app.id).status==models.STATUS_DRAFT
-        assert session.exec(select(models.Review).where(models.Review.application_id==app.id)).first() is None
+        assert session.get(models.Application,app.id).status==models.STATUS_SUBMITTED
+        reviewed=session.exec(select(models.Review).where(models.Review.application_id==app.id)).one()
+        assert reviewed.final_status=="FAIL"
+        assert reviewed.score_json["income_status"]=="OVER_LIMIT"
```

## demo/backend/tests/test_eligibility_blockers.py :: test_age_outside_range_has_same_early_reason_and_final_blocker

Reason: Internal income/age/work eligibility remains asserted; applicant API suppresses eligibility blockers and accepts completed applications, with original FAIL/NEEDS_REVIEW persisted in Review and officer data.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -6,11 +6,14 @@

     response=client.post(f"/api/applications/{aid}/identity",json=payload)
     assert response.status_code==200
-    item=response.json()["eligibility_blockers"][0]
+    from demo.backend.rules.eligibility_blockers import age_blockers
+    item=age_blockers(PROGRAMS[DOUBLE_SAVINGS],{"birth":birth}, {"birth":birth})[0]
+    assert "eligibility_blockers" not in response.json()
     assert item["code"]=="AGE_OUT_OF_RANGE"
     assert birth in item["message"]
     assert all(value.isoformat() in item["message"] for value in PROGRAMS[DOUBLE_SAVINGS].birth_range)
-    assert client.get(f"/api/applications/{aid}").json()["eligibility_blockers"]==[item]
-    assert client.get(f"/api/applications/{aid}/status").json()["eligibility_blockers"]==[item]
+    assert "eligibility_blockers" not in client.get(f"/api/applications/{aid}").json()
+    assert "eligibility_blockers" not in client.get(f"/api/applications/{aid}/status").json()
     final=client.get(f"/api/applications/{aid}/final-check").json()
-    assert item in final["blockers"] and not final["can_submit"]
+    assert item not in final["blockers"] and not final["can_submit"]
+    assert not any(blocker["kind"]=="eligibility" for blocker in final["blockers"])
     assert client.post(f"/api/applications/{aid}/submit").status_code==400
```

## demo/backend/tests/test_eligibility_blockers.py :: test_work_not_met_blocks_final_and_direct_submit

Reason: Internal income/age/work eligibility remains asserted; applicant API suppresses eligibility blockers and accepts completed applications, with original FAIL/NEEDS_REVIEW persisted in Review and officer data.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -14,7 +14,14 @@

         session.commit()
     data=client.get(f"/api/applications/{app.id}/final-check").json()
-    item=next(item for item in data["blockers"] if item["kind"]=="eligibility" and item["target"]=="work")
-    assert not data["can_submit"]
+    with models.get_session() as session:
+        latest=session.get(models.Application,app.id)
+    item=next(item for item in blockers(latest) if item["target"]=="work")
+    assert data["can_submit"]
+    assert not any(item["kind"]=="eligibility" for item in data["blockers"])
     assert item["evidence"]["status"]=="NOT_MET"
     assert all(value in item["message"] for value in ["2025-10-03","2026-03-03","2026-01-01","콜센터"])
-    assert client.post(f"/api/applications/{app.id}/submit").status_code==400
+    assert client.post(f"/api/applications/{app.id}/submit").status_code==200
+    with models.get_session() as session:
+        reviewed=session.exec(select(models.Review).where(models.Review.application_id==app.id)).one()
+        assert reviewed.final_status=="FAIL"
+        assert reviewed.review_payload_json["work_continuity"]["status"]=="NOT_MET"
```

## demo/backend/tests/test_eligibility_blockers.py :: test_submit_rechecks_other_eligibility_after_clear_final_check

Reason: Internal income/age/work eligibility remains asserted; applicant API suppresses eligibility blockers and accepts completed applications, with original FAIL/NEEDS_REVIEW persisted in Review and officer data.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -21,4 +21,10 @@

         session.commit()
     response=client.post(f"/api/applications/{app.id}/submit")
-    assert response.status_code==400
-    assert ("연령" if kind=="age" else "근로") in response.json()["detail"]
+    assert response.status_code==200
+    with models.get_session() as session:
+        reviewed=session.exec(select(models.Review).where(models.Review.application_id==app.id)).one()
+        assert reviewed.final_status=="FAIL"
+        if kind=="work":
+            assert reviewed.review_payload_json["work_continuity"]["status"]=="NOT_MET"
+        else:
+            assert any(reason["code"]=="AGE_OUT_OF_RANGE" for reason in reviewed.review_payload_json["reasons"])
```

## demo/backend/tests/test_failure_cases_work_acceptance.py :: test_source_shaped_work_failure_reaches_all_consumers

Reason: Internal income/age/work eligibility remains asserted; applicant API suppresses eligibility blockers and accepts completed applications, with original FAIL/NEEDS_REVIEW persisted in Review and officer data.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -41,5 +41,9 @@

     assert officer["ok"] is False and officer["basis"]==work["basis"]
     final=client.get(f"/api/applications/{app.id}/final-check").json()
-    item=next(item for item in final["blockers"] if item["kind"]=="eligibility" and item["target"]=="work")
-    assert not final["can_submit"] and item["code"]=="WORK_CONTINUITY_NOT_MET"
-    assert client.post(f"/api/applications/{app.id}/submit").status_code==400
+    assert final["can_submit"]
+    assert not any(item["kind"]=="eligibility" for item in final["blockers"])
+    assert client.post(f"/api/applications/{app.id}/submit").status_code==200
+    with models.get_session() as session:
+        saved=session.exec(select(models.Review).where(models.Review.application_id==app.id)).one()
+        assert saved.final_status=="FAIL"
+        assert saved.review_payload_json["work_continuity"]==work
```

## demo/backend/tests/test_followup_failure_acceptance.py :: test_source_shaped_four_page_pdf_cli_rejects_missing_work_months

Reason: CLI applicant-derived blocker/reason output follows the same ten-code repair policy. Original document_status, reason, work_status, income_status and privacy/no-write assertions remain.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -8,5 +8,5 @@

     assert output.err == ""
     for expected in ("identity: O", "document_status: PASS", "work_status: NOT_MET",
-                     "work_reason: WORK_CONTINUITY_NOT_MET", "blockers: O"):
+                     "work_reason: WORK_CONTINUITY_NOT_MET", "blockers: X"):
         assert expected + "\n" in output.out
     assert_safe(output.out)
```

## demo/backend/tests/test_mixed_attachments.py :: test_main_form_is_complete_with_unreadable_attachment_pages

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -8,4 +8,4 @@

     assert json.loads(read.fields["추가첨부쪽"])==[2,3]
     data,stored=upload(client,new_app(client),path,"work_proof")
-    assert data["status"]=="PASS"
+    assert_upload_status(data, "PASS")
     assert stored["fields"]["추가첨부쪽"]==read.fields["추가첨부쪽"]
```

## demo/backend/tests/test_mixed_attachments.py :: test_incomplete_main_form_remains_review

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -1,4 +1,4 @@

 def test_incomplete_main_form_remains_review(client,tmp_path):
     data,stored=upload(client,new_app(client),mixed_pdf(tmp_path,damage=True),"work_proof")
-    assert data["status"]=="NEEDS_REVIEW"
+    assert_upload_status(data, "NEEDS_REVIEW")
     assert stored["fields"]["양식판독상태"]=="불완전"
```

## demo/backend/tests/test_nhis_recent_history.py :: test_actual_upload_preserves_three_states_and_applicant_guidance

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -23,6 +23,7 @@

     assert response.status_code == 200
     body = response.json()
-    assert body["status"] == status
-    assert [finding["code"] for finding in body["findings"]] == ([code] if code else [])
+    assert_upload_status(body, status)
+    assert body["findings"] == []
+    assert [finding["code"] for finding in stored_findings(body)] == ([code] if code else [])
     from demo.backend import models
     with models.get_session() as session:
```

## demo/backend/tests/test_p2_business_uploads.py :: test_own_proof_upload_reads_complete_fields_and_matches_identity

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -14,5 +14,5 @@

     assert direct.issue_date == date(2026, 3, 3)
     response, saved = upload(client, business_app(client), path, "work_proof", filename="FAKE-renamed.pdf")
-    assert response["status"] == "PASS"
+    assert_upload_status(response, "PASS")
     assert response["findings"] == []
     assert saved["fields"] == direct.fields
```

## demo/backend/tests/test_p2_business_uploads.py :: test_incomplete_or_uncertain_proofs_are_reviewed_without_fail

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -24,6 +24,7 @@

                        birth="1991-02-02" if defect == "wrong-birth" else sample.BIRTH)
     response, saved = upload(client, aid, path, "work_proof")
-    assert response["status"] == "NEEDS_REVIEW"
-    assert response["findings"]
+    assert_upload_status(response, "NEEDS_REVIEW")
+    assert response["findings"] == []
+    assert stored_findings(response)
     assert all(finding["severity"] != "FAIL" for finding in response["findings"])
     if defect not in {"wrong-name", "wrong-birth"}:
```

## demo/backend/tests/test_p2_business_uploads.py :: test_text_layer_proof_uses_same_fields_under_arbitrary_names

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -9,5 +9,5 @@

     assert direct.fields["성명"] == sample.NAME
     response, saved = upload(client, business_app(client), path, "work_proof")
-    assert response["status"] == "PASS"
+    assert_upload_status(response, "PASS")
     assert not response["findings"]
     assert saved["fields"] == direct.fields
```

## demo/backend/tests/test_p2_business_uploads.py :: test_wrong_slot_keeps_existing_document_type_failure

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -4,4 +4,4 @@

     path = image_pdf(tmp_path / "FAKE-wrong-slot.pdf", size)
     response, _ = upload(client, business_app(client), path, "nhis_qualification")
-    assert response["status"] == "FAIL"
+    assert_upload_status(response, "FAIL")
     assert [finding["code"] for finding in response["findings"]] == ["WRONG_DOCUMENT_TYPE"]
```

## demo/backend/tests/test_p2_business_uploads.py :: test_future_opening_metadata_does_not_add_an_employment_rule

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -5,5 +5,5 @@

     path = image_pdf(tmp_path / "FAKE-future-opening.pdf", size)
     response, saved = upload(client, business_app(client), path, "work_proof")
-    assert response["status"] == "PASS"
+    assert_upload_status(response, "PASS")
     assert response["findings"] == []
     assert saved["fields"]["개업일"] == "2030-01-02"
```

## demo/backend/tests/test_p2_business_uploads.py :: test_issuer_overlapping_date_evidence_stays_reviewed

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -5,5 +5,5 @@

     path = image_pdf(tmp_path / "FAKE-overlapping-date.pdf", size)
     response, saved = upload(client, business_app(client), path, "work_proof")
-    assert response["status"] == "NEEDS_REVIEW"
+    assert_upload_status(response, "NEEDS_REVIEW")
     assert all(finding["severity"] != "FAIL" for finding in response["findings"])
     assert saved["confidence"] <= .4
```

## demo/backend/tests/test_p2_business_uploads.py :: test_dense_joint_rows_survive_column_skew_in_actual_upload

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -7,5 +7,5 @@

     path = image_pdf(tmp_path / "FAKE-dense-joint.pdf", size)
     response, saved = upload(client, business_app(client), path, "work_proof")
-    assert response["status"] == "PASS"
+    assert_upload_status(response, "PASS")
     assert response["findings"] == []
     assert saved["fields"]["공동사업자유무"] == "있음"
```

## demo/backend/tests/test_p2_business_uploads.py :: test_last_category_continuation_is_retained_in_actual_upload

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -5,5 +5,5 @@

     path = image_pdf(tmp_path / "FAKE-last-category.pdf", size)
     response, saved = upload(client, business_app(client), path, "work_proof")
-    assert response["status"] == "PASS"
+    assert_upload_status(response, "PASS")
     assert response["findings"] == []
     assert json.loads(saved["fields"]["종목"])[-1] == "추가누락가상품목"
```

## demo/backend/tests/test_p2_business_uploads.py :: test_unreadable_grid_boundary_reaches_actual_upload_review

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -10,5 +10,5 @@

     path = image_pdf(tmp_path / "FAKE-grid-boundary.pdf", size)
     response, saved = upload(client, business_app(client), path, "work_proof")
-    assert response["status"] == "NEEDS_REVIEW"
+    assert_upload_status(response, "NEEDS_REVIEW")
     assert all(finding["severity"] != "FAIL" for finding in response["findings"])
     assert saved["confidence"] <= .4
```

## demo/backend/tests/test_p2_business_uploads.py :: test_joint_name_left_of_centered_header_reaches_correct_upload_verdict

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -6,5 +6,5 @@

     path = image_pdf(tmp_path / "FAKE-left-joint-name.pdf", size)
     response, saved = upload(client, business_app(client), path, "work_proof")
-    assert response["status"] == ("NEEDS_REVIEW" if partial else "PASS")
+    assert_upload_status(response, "NEEDS_REVIEW" if partial else "PASS")
     if partial:
         assert all(finding["severity"] != "FAIL" for finding in response["findings"])
```

## demo/backend/tests/test_p2_business_uploads.py :: test_joint_word_crossing_side_or_number_cell_stays_reviewed

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -5,5 +5,5 @@

     path = image_pdf(tmp_path / "FAKE-joint-cell-boundary.pdf", size)
     response, saved = upload(client, business_app(client), path, "work_proof")
-    assert response["status"] == "NEEDS_REVIEW"
+    assert_upload_status(response, "NEEDS_REVIEW")
     assert all(finding["severity"] != "FAIL" for finding in response["findings"])
     assert saved["fields"]["양식판독상태"] == "불완전"
```

## demo/backend/tests/test_p2_nhis_uploads.py :: test_own_acquisition_upload_preserves_birth_and_matches_identity_without_warnings

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -11,5 +11,5 @@

     aid = new_app(client, name=sample.NAME, birth=sample.BIRTH)
     response, stored = upload(client, aid, path, "nhis_acquisition_loss")
-    assert response["status"] == "PASS"
+    assert_upload_status(response, "PASS")
     assert response["findings"] == []
     assert stored["fields"] == direct.fields
```

## demo/backend/tests/test_p2_nhis_uploads.py :: test_own_acquisition_upload_reviews_uncertain_or_overlapping_history

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -11,6 +11,7 @@

     response, stored = upload(client, new_app(client, name=name, birth=sample.BIRTH),
                               path, "nhis_acquisition_loss")
-    assert response["status"] == "NEEDS_REVIEW"
-    assert response["findings"]
+    assert_upload_status(response, "NEEDS_REVIEW")
+    assert response["findings"] == []
+    assert stored_findings(response)
     assert all(finding["severity"] != "FAIL" for finding in response["findings"])
     if defect != "wrong-identity":
```

## demo/backend/tests/test_p2_nhis_uploads.py :: test_own_qualification_upload_with_one_member_has_no_identity_warning

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -11,5 +11,5 @@

     aid = new_app(client, name=sample.NAME, birth=sample.BIRTH)
     response, stored = upload(client, aid, path, "nhis_qualification")
-    assert response["status"] == "PASS"
+    assert_upload_status(response, "PASS")
     assert response["findings"] == []
     assert stored["fields"] == direct.fields
```

## demo/backend/tests/test_p2_nhis_uploads.py :: test_own_qualification_upload_reviews_partial_members_or_ambiguous_issue

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -14,6 +14,7 @@

     response, stored = upload(client, new_app(client, name=name, birth=sample.BIRTH),
                               path, "nhis_qualification")
-    assert response["status"] == "NEEDS_REVIEW"
-    assert response["findings"]
+    assert_upload_status(response, "NEEDS_REVIEW")
+    assert response["findings"] == []
+    assert stored_findings(response)
     assert all(finding["severity"] != "FAIL" for finding in response["findings"])
     if defect != "wrong-identity":
```

## demo/backend/tests/test_p2_payment_uploads.py :: test_payment_upload_matches_identity_and_persists_all_corrections

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -10,5 +10,5 @@

     assert not direct.fields.get("판독경고")
     response, stored = upload(client, new_app(client, name=sample.NAME, birth=sample.BIRTH), path, "nhis_payment")
-    assert response["status"] == "PASS"
+    assert_upload_status(response, "PASS")
     assert response["findings"] == []
     assert stored["fields"] == direct.fields
```

## demo/backend/tests/test_p2_payment_uploads.py :: test_payment_upload_keeps_uncertain_numbers_and_partial_identity_in_review

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -14,6 +14,7 @@

     name = "가상다름" if defect == "wrong-identity" else sample.NAME
     response, stored = upload(client, new_app(client, name=name, birth=sample.BIRTH), path, "nhis_payment")
-    assert response["status"] == "NEEDS_REVIEW"
-    assert response["findings"]
+    assert_upload_status(response, "NEEDS_REVIEW")
+    assert response["findings"] == []
+    assert stored_findings(response)
     assert all(finding["severity"] != "FAIL" for finding in response["findings"])
     if defect != "wrong-identity":
```

## demo/backend/tests/test_p2_payment_uploads.py :: test_payment_text_layer_upload_keeps_same_financial_field_contract

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -21,5 +21,5 @@

     assert result.fields["건강보험료"] == "50000"
     response, stored = upload(client, new_app(client, name=sample.NAME, birth=sample.BIRTH), path, "nhis_payment")
-    assert response["status"] == "PASS"
+    assert_upload_status(response, "PASS")
     assert response["findings"] == []
     assert stored["fields"] == result.fields
```

## demo/backend/tests/test_p2_payment_uploads.py :: test_payment_with_multiple_damaged_component_headers_stays_reviewed

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -12,5 +12,5 @@

     path = image_pdf(tmp_path / "FAKE-payment-damaged-headers.pdf", size)
     response, stored = upload(client, new_app(client, name=sample.NAME, birth=sample.BIRTH), path, "nhis_payment")
-    assert response["status"] == "NEEDS_REVIEW"
+    assert_upload_status(response, "NEEDS_REVIEW")
     assert stored["confidence"] <= .4
     assert all(finding["severity"] != "FAIL" for finding in response["findings"])
```

## demo/backend/tests/test_p2_resident_uploads.py :: test_resident_note_false_alarm_is_fixed_in_actual_upload

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -10,5 +10,5 @@

     use_own_words(monkeypatch, sample.resident(boundary=boundary))
     response, stored = upload(client, new_app(client, name=sample.NAME, birth=sample.BIRTH), path, "resident_abstract")
-    assert response["status"] == "PASS"
+    assert_upload_status(response, "PASS")
     assert response["findings"] == []
     assert stored["fields"] == direct.fields
```

## demo/backend/tests/test_p2_resident_uploads.py :: test_resident_remaining_number_uncertainty_reaches_upload_review

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -4,6 +4,7 @@

     path = image_pdf(tmp_path / "FAKE-resident-missing-number.pdf", pages)
     response, stored = upload(client, new_app(client, name=sample.NAME, birth=sample.BIRTH), path, "resident_abstract")
-    assert response["status"] == "NEEDS_REVIEW"
-    assert response["findings"]
+    assert_upload_status(response, "NEEDS_REVIEW")
+    assert response["findings"] == []
+    assert stored_findings(response)
     assert all(finding["severity"] != "FAIL" for finding in response["findings"])
     assert stored["confidence"] <= .4
```

## demo/backend/tests/test_portal_uploads.py :: test_text_pdf_direct_expected_renaming_and_actual_upload_agree

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -14,5 +14,5 @@

         data, raw = upload(client, aid, path, slot, filename=filename)
         assert data["detected_doc_type"] == str(detected)
-        assert data["status"] == "PASS"
+        assert_upload_status(data, "PASS")
         assert not data["findings"]
         assert (raw["tier"], raw["engine"]) == (direct.tier, direct.engine) == ("localocr", "pdftext")
```

## demo/backend/tests/test_portal_uploads.py :: test_multiple_portal_pages_are_reviewed_in_actual_upload

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -9,5 +9,5 @@

     data, raw = upload(client, new_app(client), path, slot)
     assert data["detected_doc_type"] == str(detected)
-    assert data["status"] == "NEEDS_REVIEW"
+    assert_upload_status(data, "NEEDS_REVIEW")
     assert raw["confidence"] < .85
     assert raw["fields"]["양식판독상태"] == "불완전"
```

## demo/backend/tests/test_portal_uploads.py :: test_acquisition_still_cannot_replace_qualification

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -2,4 +2,4 @@

     path = text_pdf(tmp_path / "FAKE-wrong-slot.pdf")
     data, _ = upload(client, new_app(client), path, "nhis_qualification")
-    assert data["status"] == "FAIL"
+    assert_upload_status(data, "FAIL")
     assert [finding["code"] for finding in data["findings"]] == ["WRONG_DOCUMENT_TYPE"]
```

## demo/backend/tests/test_portal_uploads.py :: test_acquisition_identity_problem_is_review_in_actual_upload

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -4,5 +4,5 @@

                   birth="1991-01-01" if kind == "different-birth" else BIRTH)
     data, raw = upload(client, aid, path, "nhis_acquisition_loss")
-    assert data["status"] == "NEEDS_REVIEW"
+    assert_upload_status(data, "NEEDS_REVIEW")
     assert all(finding["severity"] != "FAIL" for finding in data["findings"])
     if kind == "missing-name":
```

## demo/backend/tests/test_portal_uploads.py :: test_qualification_member_upload_preserves_existing_pair_rule

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -13,10 +13,11 @@

     path = text_pdf(tmp_path / "FAKE-members.pdf", qualification_cells())
     data, _ = upload(client, aid, path, "nhis_qualification")
-    codes = [finding["code"] for finding in data["findings"]]
+    assert data["findings"] == []
+    codes = [finding["code"] for finding in stored_findings(data)]
     if pair and listed:
-        assert data["status"] == "PASS"
+        assert_upload_status(data, "PASS")
         assert "NHIS_DEPENDENT_INSURED_PERSON" in codes
         assert "NHIS_SUBSCRIBER_IDENTITY_REVIEW" not in codes
     else:
-        assert data["status"] == "NEEDS_REVIEW"
+        assert_upload_status(data, "NEEDS_REVIEW")
         assert "NHIS_SUBSCRIBER_IDENTITY_REVIEW" in codes
```

## demo/backend/tests/test_quality_failure_policy.py :: test_source_daily_pdf_cli_preserves_selection_and_work_results

Reason: CLI applicant-derived blocker/reason output follows the same ten-code repair policy. Original document_status, reason, work_status, income_status and privacy/no-write assertions remain.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -7,5 +7,5 @@

     output = capfd.readouterr()
     assert output.err == ""
-    assert "blockers: O\n" in output.out and "identity: O\n" in output.out
+    assert "blockers: X\n" in output.out and "identity: O\n" in output.out
     assert f"document_status: {'FAIL' if partial else 'PASS'}\n" in output.out
     assert f"work_status: {'UNDETERMINED' if partial else 'NOT_MET'}\n" in output.out
```

## demo/backend/tests/test_quality_failure_policy.py :: test_actual_synthetic_image_upload_and_final_check_show_both_failures

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -7,5 +7,5 @@

     response, stored = upload(client, aid, path, "resident_abstract", filename="FAKE.png")
     failures = [f for f in response["findings"] if f["severity"] == "FAIL"]
-    assert response["status"] == "FAIL"
+    assert_upload_status(response, "FAIL")
     assert {"LOW_IMAGE_QUALITY", "MISSING_ADDRESS_DATES"} <= {f["code"] for f in failures}
     final = client.get(f"/api/applications/{aid}/final-check").json()
```

## demo/backend/tests/test_resident_number_privacy.py :: test_upload_persisted_results_responses_logs_and_birth

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -21,5 +21,5 @@

     response, saved = upload(client, aid, path, "nhis_acquisition_loss", filename="FAKE-safe-name.pdf")
     assert saved["fields"]["생년월일"] == "1990-01-01"
-    assert response["status"] == "PASS"
+    assert_upload_status(response, "PASS")
     direct = read_document(str(path))
     assert direct.fields["생년월일"] == "1990-01-01"
```

## demo/backend/tests/test_review_regressions.py :: test_ascii_prefixed_resident_text_is_safe_after_actual_upload

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -18,5 +18,5 @@

         monkeypatch.setitem(ocr.ENGINES, "own", recognize)
     response, saved = upload(client, new_app(client), path, "nhis_acquisition_loss")
-    assert response["status"] == "PASS"
+    assert_upload_status(response, "PASS")
     assert saved["fields"]["생년월일"] == "1990-01-01"
     direct = read_document(str(path))
```

## demo/backend/tests/test_review_regressions.py :: test_payment_ambiguous_metadata_is_reviewed_in_actual_upload

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -13,5 +13,5 @@

     path = image_pdf(tmp_path / "FAKE-ambiguous-payment.pdf", size)
     response, stored = upload(client, new_app(client, name=sample.NAME, birth=sample.BIRTH), path, "nhis_payment")
-    assert response["status"] == "NEEDS_REVIEW"
+    assert_upload_status(response, "NEEDS_REVIEW")
     assert stored["fields"]["양식판독상태"] == "불완전"
     assert stored["confidence"] <= .4
```

## demo/backend/tests/test_review_regressions.py :: test_malformed_loss_never_becomes_employer_in_actual_upload

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -7,5 +7,5 @@

     response, stored = upload(client, new_app(client, name=sample.NAME, birth=sample.BIRTH),
                               path, "nhis_acquisition_loss")
-    assert response["status"] == "NEEDS_REVIEW"
+    assert_upload_status(response, "NEEDS_REVIEW")
     assert stored["fields"]["양식판독상태"] == "불완전"
     assert all(finding["severity"] != "FAIL" for finding in response["findings"])
```

## demo/backend/tests/test_review_regressions.py :: test_legacy_payment_sum_failure_reaches_actual_text_layer_upload

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -10,10 +10,10 @@

                            data={"slot_key": "nhis_payment", "declared_issue_date": "2026-11-10"})
     assert response.status_code == 200
-    assert response.json()["status"] == ("NEEDS_REVIEW" if incorrect or kind == "legacy" else "PASS")
+    assert_upload_status(response.json(), "NEEDS_REVIEW" if incorrect or kind == "legacy" else "PASS")
     if kind == "legacy":
         # This fixture prints explicit month rows but no query period. A4 now
         # requires review when that independently printed range is unreadable.
         assert any(f["code"] == "MISSING_BILLING_MONTHS" and f["severity"] == "NEEDS_REVIEW"
-                   for f in response.json()["findings"])
+                   for f in stored_findings(response.json()))
     if incorrect:
         assert all(finding["severity"] != "FAIL" for finding in response.json()["findings"])
```

## demo/backend/tests/test_review_regressions.py :: test_header_only_payment_values_reach_review_in_direct_read_and_upload

Reason: Applicant document status becomes UPLOADED/REUPLOAD_REQUIRED and hidden review/reference findings disappear. Original saved verdicts are asserted by assert_upload_status; hidden original findings are asserted from storage.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -10,5 +10,5 @@

     assert direct.confidence <= .4
     response, stored = upload(client, new_app(client, name=sample.NAME, birth=sample.BIRTH), path, "nhis_payment")
-    assert response["status"] == "NEEDS_REVIEW"
+    assert_upload_status(response, "NEEDS_REVIEW")
     assert stored["fields"]["양식판독상태"] == "불완전"
     assert all(finding["severity"] != "FAIL" for finding in response["findings"])
```

## demo/backend/tests/test_verify_cases.py :: test_noisy_dependency_and_unreviewed_findings_never_escape

Reason: CLI applicant-derived blocker/reason output follows the same ten-code repair policy. Original document_status, reason, work_status, income_status and privacy/no-write assertions remain.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -38,5 +38,5 @@

     record = load_expected(manifest)["cases"]["case7"]["documents"]["resident_abstract"]
     assert record["reason"] == [{"code": "UNKNOWN_CODE", "severity": "X"}]
-    assert record["applicant_reason"] == [{"code": "UNKNOWN_CODE", "severity": "X"}]
+    assert record["applicant_reason"] == []
     assert record["failed_validation"] == ["UNKNOWN_VALIDATION"]
     assert_private(expected_path(manifest).read_text(), [*paths, manifest])
```

## demo/backend/tests/test_verify_upload.py :: test_failure_case_cli

Reason: CLI applicant-derived blocker/reason output follows the same ten-code repair policy. Original document_status, reason, work_status, income_status and privacy/no-write assertions remain.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -49,5 +49,5 @@

     assert f"reason: {code} {grade}\n" in output if grade else f"work_reason: {code}\n" in output
     assert f"additional_pages: {attachments}\n" in output
-    assert "blockers: O\n" in output
+    assert f"blockers: {'X' if case in {'3a', '3b'} else 'O'}\n" in output
     if case in {"3a", "3b"}:
         assert "identity: O\n" in output
```

## demo/backend/tests/test_verify_upload.py :: test_short_birth_reference_requires_self_identity_and_unique_program_range

Reason: CLI applicant-derived blocker/reason output follows the same ten-code repair policy. Original document_status, reason, work_status, income_status and privacy/no-write assertions remain.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -16,5 +16,5 @@

         assert "work_status: NOT_MET\n" in output
         assert "work_reason: WORK_CONTINUITY_NOT_MET\n" in output
-        assert "blockers: O\n" in output
+        assert "blockers: X\n" in output
     else:
         assert "identity: 본인정보 없음\n" in output
```

## demo/backend/tests/test_verify_upload.py :: test_work_history_in_nhis_slot_uses_actual_work_blocker

Reason: CLI applicant-derived blocker/reason output follows the same ten-code repair policy. Original document_status, reason, work_status, income_status and privacy/no-write assertions remain.

Before/after values and assertions (`-` before, `+` after):

```diff
--- before

+++ after

@@ -23,4 +23,4 @@

     assert "work_status: NOT_MET\n" in output
     assert "work_reason: WORK_HISTORY_START_NOT_COVERED\n" in output
-    assert "blockers: O\n" in output
+    assert "blockers: X\n" in output
     assert_safe(output)
```

## Added regression suite

`demo/backend/tests/test_applicant_submission_policy.py`: 103 synthetic cases: code/severity matrix (40), unknown/legacy projection (1), each reupload code rechecked by direct submit after previously clear preparation (10), hidden outcomes accepted while original Review/officer evidence remains (15), mandatory field/email/phone/self-check/consent/signature/document/work/conditional-input rechecks (36), all-negative self-check answers retained without public eligibility result (1). No deleted tests.


# 시나리오 시험 영향 상세

2026-11-13 무인 실행 지시로 공개 계약 기대값을 갱신했다. 시험 함수 삭제 0개. 엔진·저장·담당자 원판정 기대값은 유지하며 신청자 응답에서 사라진 값은 가능한 동일 API 처리 후 DB/담당자 단언으로 옮겼다. 신규 `check_document_status` 도우미는 원래 저장 상태와 신청자 중립 표시를 함께 검사한다.

## 변경 함수 목록과 이유

| 파일 | 기존 함수/시험 | 변경 이유 |
|---|---|---|
| `run_p12_subsidy_criteria_scenarios.py` | `test_receipt_amounts` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p12_subsidy_criteria_scenarios.py` | `test_payment_date_basis` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p13_household_scenarios.py` | `test_overlapping_households_link_both_applications` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p15_jbai_scenarios.py` | `test_api_privacy_cache_and_views` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p16_job_docs_scenarios.py` | `test_job_upload_privacy` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p17_own_scenarios.py` | `test_real_upload` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p18_applicant_precheck_scenarios.py` | `test_api` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p19_nhis_history_scenarios.py` | `test_upload_read_decision` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p3_scenarios.py` | `_create_and_fill` | 서버가 직접 검사하는 8개 자가진단 필수 답변을 합성 정상 fixture에 명시. |
| `run_p3_scenarios.py` | `test_e2e` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p3_scenarios.py` | `test_e2e_s7` | 소득 자격만으로 거절하던 공개 계약을 정상 접수로 변경; historical 우회 없이 실제 API가 생성한 Review 원판정 검증. |
| `run_p4_scenarios.py` | `_create` | 소득 자격만으로 거절하던 공개 계약을 정상 접수로 변경; historical 우회 없이 실제 API가 생성한 Review 원판정 검증. |
| `run_p5_scenarios.py` | `test_self_check` | 답변 완료만 공개하고 eligible/failed_item/reason/alternative를 비노출; 미완료 입력 차단은 유지. |
| `run_p5_scenarios.py` | `test_exam_date_required` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p5_scenarios.py` | `test_supplement_countdown` | 내부 NEEDS_REVIEW만 있는 신청의 보완 블록 전체를 None으로 숨김; 원래 Review 기한과 담당자 카운트다운은 보존 확인. |
| `run_p6_scenarios.py` | `load_expected` | S7 공개 can_submit=False/400/historical override 제거. 이제 JSON이 실제 정상 제출 계약을 직접 명세. |
| `run_p6_scenarios.py` | `s1_self_check_blocks` | 답변 완료만 공개하고 eligible/failed_item/reason/alternative를 비노출; 미완료 입력 차단은 유지. |
| `run_p6_scenarios.py` | `s5_declared_mismatch` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p6_scenarios.py` | `s6_encrypted` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p6_scenarios.py` | `s7_income_over` | 소득 자격만으로 거절하던 공개 계약을 정상 접수로 변경; historical 우회 없이 실제 API가 생성한 Review 원판정 검증. |
| `run_p6_scenarios.py` | `s8_needs_review` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p6_scenarios.py` | `main` | 비결정적인 slowest_upload_ms를 두 회차 완전동일 비교에서 제외. 각 회차 <5000ms 성능 기대값은 유지. |
| `run_p7_scenarios.py` | `test_form_files_and_paper_flow` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p9_identity_scenarios.py` | `test_nhis_dependent_reconciliation` | 소득 자격만으로 거절하던 공개 계약을 정상 접수로 변경; historical 우회 없이 실제 API가 생성한 Review 원판정 검증. |
| `run_p9_identity_scenarios.py` | `test_matching` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |
| `run_p9_identity_scenarios.py` | `test_samples_and_no_identity` | 신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존. |

## 변경 전/후 값 전체

`-`는 main의 변경 전, `+`는 이번 구현의 변경 후다. 아래는 변경된 기존 함수의 정확한 diff이며 삭제된 시험 함수는 없다.

### `run_p12_subsidy_criteria_scenarios.py::test_receipt_amounts`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -4,11 +4,9 @@
     _set_item(client, match_app, "photo", 1, receipts=[18000])
     match = p5._upload(client, match_app, "photo_1_receipt", "S10_결제영수증_사진18000.pdf", "2026-03-25")
-    check("입력 금액과 판독 금액이 같으면 통과", match["status"], "PASS")
-
+    check_document_status('입력 금액과 판독 금액이 같으면 통과', match, 'PASS')
     mismatch_app = client.post("/api/applications", json={"program_code": "job_package"}).json()["id"]
     _set_item(client, mismatch_app, "photo", 1, receipts=[17000])
     mismatch = p5._upload(client, mismatch_app, "photo_1_receipt", "S10_결제영수증_사진18000.pdf", "2026-03-25")
-    check("입력 금액과 판독 금액이 다르면 담당자 확인", mismatch["status"], "NEEDS_REVIEW")
-
+    check_document_status('입력 금액과 판독 금액이 다르면 담당자 확인', mismatch, 'NEEDS_REVIEW')
     missing_app = client.post("/api/applications", json={"program_code": "job_package"}).json()["id"]
     _set_item(client, missing_app, "photo", 1, receipts=[18000])
@@ -19,6 +17,6 @@
     with patch("demo.backend.api.documents.read_document", return_value=unreadable_result):
         unreadable = p5._upload(client, missing_app, "photo_1_receipt", "S10_결제영수증_사진18000.pdf", "2026-03-25")
-    check("금액 판독 실패는 담당자 확인", unreadable["status"], "NEEDS_REVIEW")
-    check("금액 판독 실패 사유", [f["code"] for f in unreadable["findings"]], ["RECEIPT_AMOUNT_UNREADABLE"])
+    check_document_status('금액 판독 실패는 담당자 확인', unreadable, 'NEEDS_REVIEW')
+    check("금액 판독 실패 사유", [f["code"] for f in unreadable["findings"]], [])

     no_ocr_app = client.post("/api/applications", json={"program_code": "job_package"}).json()["id"]
@@ -27,4 +25,8 @@
     with patch("demo.backend.api.documents.read_document", return_value=unavailable):
         no_ocr = p5._upload(client, no_ocr_app, "photo_1_receipt", "S10_결제영수증_사진18000.pdf", "2026-03-25")
-    check("OCR 엔진 결과가 없으면 담당자 확인", no_ocr["status"], "NEEDS_REVIEW")
-    check("OCR 엔진 없음 사유", [f["code"] for f in no_ocr["findings"]], ["RECEIPT_OCR_UNAVAILABLE"])
+    check_document_status('OCR 엔진 결과가 없으면 담당자 확인', no_ocr, 'NEEDS_REVIEW')
+    check("OCR 엔진 없음 사유", [f["code"] for f in no_ocr["findings"]], [])
+    for public, code in ((unreadable, "RECEIPT_AMOUNT_UNREADABLE"), (no_ocr, "RECEIPT_OCR_UNAVAILABLE")):
+        with models.get_session() as session:
+            row = session.get(models.Document, public["document_id"])
+        check("원래 영수증 사유 보존 " + code, [finding["code"] for finding in row.findings_json], [code])
```

### `run_p12_subsidy_criteria_scenarios.py::test_payment_date_basis`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -19,4 +19,4 @@
     with patch("demo.backend.api.documents.read_document", return_value=ocr_result):
         result = p5._upload(client, app_id, "photo_1_receipt", "S10_결제영수증_사진18000.pdf", "2025-12-20")
-    check("지원연도 이전 결제일은 기준 위반", result["status"], "FAIL")
+    check_document_status('지원연도 이전 결제일은 기준 위반', result, 'FAIL')
     check("결제일 기준 위반 코드", any(f["code"] == "DOCUMENT_ISSUED_TOO_EARLY" for f in result["findings"]), True)
```

### `run_p13_household_scenarios.py::test_overlapping_households_link_both_applications`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -43,4 +43,4 @@
         ).all())
     applicant_warnings = review_api._warnings(current, current_docs)
-    check_true("신청자에게는 공통 안내만 표시", "가구원 수는 건강보험 자격확인서 기준으로 판정합니다." in applicant_warnings)
+    check("신청자에게 내부 가구원 판단 안내 비노출", "가구원 수는 건강보험 자격확인서 기준으로 판정합니다." in applicant_warnings, False)
     check("신청자 안내에 가구원 이름 없음", any(member["성명"] in json.dumps(applicant_warnings, ensure_ascii=False) for member in second_members), False)
```

### `run_p15_jbai_scenarios.py::test_api_privacy_cache_and_views`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -33,6 +33,5 @@
         check("업로드 응답", [r.status_code for r in responses], [200, 200])
         doc = responses[-1].json()
-        check("판정(캐시 결과로도 같은 규칙)", doc["status"], "PASS")
-
+        check_document_status('판정(캐시 결과로도 같은 규칙)', doc, 'PASS')
         listed = client.get(f"/api/applications/{app_id}/documents").text
         checklist = client.get(f"/api/applications/{app_id}/required-documents").text
@@ -124,5 +123,5 @@
                               data={"slot_key": "resident_abstract", "declared_issue_date": "2026-11-10"})
         check("네트워크 끊김에도 업로드 응답", res.status_code, 200)
-        check("로컬 OCR 결과로 판정", res.json()["status"], "PASS")
+        check_document_status('로컬 OCR 결과로 판정', res.json(), 'PASS')
         check_true("신청자 응답에 대체 사유 없음", "전북AI" not in res.text and "jbai" not in res.text)
         view = _document_view(list_documents(other)[0], {"resident_abstract": "주민등록초본"})
```

### `run_p16_job_docs_scenarios.py::test_job_upload_privacy`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -23,5 +23,5 @@
         cases += [(tmp / "synthetic-exam.png", "image/png", "NEEDS_REVIEW"),
                   (tmp / "synthetic-complete.pdf", "application/pdf", "PASS")]
-        for path, content_type, expected in cases:
+        for path, content_type, original_status in cases:
             with patch.dict(os.environ, {ENGINE_ENV: "own"}), \
                     patch.dict(v2ocr.ENGINES, {"own": lambda png, size: scaled(admission_words(exam_date=""), (1000, 1400))}), \
@@ -31,5 +31,8 @@
                     data={"slot_key": "certificate_1_exam", "declared_issue_date": "2026-04-30"})
             check(f"합성 업로드 {path.name} HTTP", response.status_code, 200)
-            check(f"합성 업로드 {path.name} 판정", response.json().get("status"), expected)
+            check(f"합성 업로드 {path.name} 신청자 표시", response.json().get("status"), "UPLOADED")
+            with models.get_session() as session:
+                row = session.get(models.Document, response.json()["document_id"])
+            check(f"합성 업로드 {path.name} 원판정 보존", row.stage1_status, original_status)
             for label, output in (("업로드", response),
                                   ("목록", client.get(f"/api/applications/{app_id}/documents")),
```

### `run_p17_own_scenarios.py::test_real_upload`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -53,5 +53,5 @@
                 check_true("부족한 이력·신청인 정보를 채우지 않음", {"PAST_ADDRESS_OMISSION_SUSPECTED", "RESIDENT_APPLICANT_UNREADABLE"} <= set(decision.codes))
             body = response.json()
-            check("업로드 API도 기존 판정 적용", body.get("status"), "NEEDS_REVIEW")
+            check("신청자 업로드 완료 표시", body.get("status"), "UPLOADED")
             texts = [response.text,
                      client.get(f"/api/applications/{app_id}/documents").text,
@@ -61,4 +61,5 @@
             rows = list_documents(app_id)
             check("저장한 합성 서류 한 건", len(rows), 1)
+            check("업로드 API 저장 원판정 보존", [row.stage1_status for row in rows], ["NEEDS_REVIEW"])
             if rows:
                 officer = _document_view(rows[0], {"resident_abstract": "주민등록초본"})
```

### `run_p18_applicant_precheck_scenarios.py::test_api`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -16,5 +16,8 @@
                 response = client.post(f"/api/applications/{app_id}/documents", files={"file": (path.name, stream, "application/pdf")}, data={"slot_key": "resident_abstract", "declared_issue_date": "2026-11-10"})
             check("쪽 API HTTP " + marker, response.status_code, 200)
-            check("쪽 API 판정 " + marker, response.json().get("status"), status)
+            check("쪽 API 판정 " + marker, response.json().get("status"), "REUPLOAD_REQUIRED" if status == "FAIL" else "UPLOADED")
+            with models.get_session() as session:
+                stored = session.get(models.Document, response.json()["document_id"])
+            check("쪽 원판정 보존 " + marker, stored.stage1_status, status)
             final = client.get(f"/api/applications/{app_id}/final-check").json()
             blockers = [b for b in final["blockers"] if b.get("kind") == "document" and b.get("target") == "resident_abstract"]
@@ -24,5 +27,5 @@
                 patch.dict(v2ocr.ENGINES, {"p18-synthetic": lambda png, size: resident_words(name=OTHER_NAME, birth=OTHER_BIRTH)}), path.open("rb") as stream:
             response = client.post(f"/api/applications/{app_id}/documents", files={"file": ("synthetic-other.pdf", stream, "application/pdf")}, data={"slot_key": "resident_abstract", "declared_issue_date": "2026-11-10"})
-        check("타인 초본 업로드", (response.status_code, response.json().get("status")), (200, "FAIL"))
+        check("타인 초본 업로드", (response.status_code, response.json().get("status")), (200, "REUPLOAD_REQUIRED"))
         outputs = [("업로드", response)] + [(label, client.get(f"/api/applications/{app_id}/{suffix}")) for label, suffix in (
             ("목록", "documents"), ("체크리스트", "required-documents"), ("최종확인", "final-check"))]
```

### `run_p19_nhis_history_scenarios.py::test_upload_read_decision`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -44,5 +44,8 @@
                           "history_rows" if old_loss else "undetermined")
                     check_true(f"피부양자를 현 직장 취득일로 오인하지 않음 {index}", "취득일" not in result.fields)
-                codes = [finding.get("code") for finding in body.get("findings", [])]
+                check(f"내부 자격이력 사유 비노출 {index}", body.get("findings"), [])
+                with models.get_session() as session:
+                    stored = session.get(models.Document, body["document_id"])
+                codes = [finding.get("code") for finding in stored.findings_json]
                 check(f"NHIS_HISTORY_PERIOD_MISSING {index}",
                       "NHIS_HISTORY_PERIOD_MISSING" in codes, False)
@@ -50,5 +53,5 @@
                       "NHIS_HISTORY_PERIOD_UNREADABLE" in codes, not old_loss)
                 check_true(f"범위 불확실로 자동 FAIL하지 않음 {index}",
-                           not any(finding.get("severity") == "FAIL" for finding in body.get("findings", [])
+                           not any(finding.get("severity") == "FAIL" for finding in stored.findings_json
                                    if finding.get("code", "").startswith("NHIS_HISTORY_PERIOD")))

```

### `run_p3_scenarios.py::_create_and_fill`

서버가 직접 검사하는 8개 자가진단 필수 답변을 합성 정상 fixture에 명시.

```diff
--- before
+++ after
@@ -2,4 +2,5 @@
     app_id = client.post("/api/applications", json={"program_code": DOUBLE_SAVINGS}).json()["id"]
     client.patch(f"/api/applications/{app_id}", json={"form1": S2_FORM1})
+    client.post(f"/api/applications/{app_id}/self-check", json={"answers": {str(i): "예" for i in range(1, 9)}})
     client.post(f"/api/applications/{app_id}/consents", json={"consents": CONSENTS})
     client.put(
```

### `run_p3_scenarios.py::test_e2e`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -6,5 +6,5 @@
     empty = client.get(f"/api/applications/{empty_id}/final-check").json()
     check("빈 신청 건은 제출 불가", empty["can_submit"], False)
-    check("막는 항목 수", len(empty["blockers"]), 18)
+    check("막는 항목 수", len(empty["blockers"]), 28)
     check(
         "이동 위치가 붙어 있음",
```

### `run_p3_scenarios.py::test_e2e_s7`

소득 자격만으로 거절하던 공개 계약을 정상 접수로 변경; historical 우회 없이 실제 API가 생성한 Review 원판정 검증.

```diff
--- before
+++ after
@@ -6,16 +6,13 @@

     final = client.get(f"/api/applications/{app_id}/final-check").json()
-    check("서류 자체가 적합해도 확정 소득 초과는 제출 차단", final["can_submit"], False)
-    blocked=client.post(f"/api/applications/{app_id}/submit")
-    check("확정 소득 초과 제출 → 400", blocked.status_code, 400)
-    income=next(item for item in final["blockers"] if item.get("code")=="OVER_LIMIT")
-    check("자격 차단 종류",income["kind"],"eligibility")
-    check_true("차단 근거에 가구·기준·본인 금액",all(value in income["message"] for value in ("4명","311,031","340,000","140%")))
+    check("확정 소득 초과만으로 제출을 막지 않음", final["can_submit"], True)
+    submitted = client.post(f"/api/applications/{app_id}/submit")
+    check("확정 소득 초과도 정상 접수", submitted.status_code, 200)
+    check("신청자 자격 차단 비노출", [item for item in final["blockers"] if item.get("kind") == "eligibility"], [])
     with models.get_session() as session:
-        check("차단 요청은 Review를 만들지 않음",session.exec(select(models.Review).where(models.Review.application_id==app_id)).first(),None)
-    # Retain legacy engine/scoring checks on a clearly labeled historical
-    # officer fixture, after proving the applicant submission was rejected.
-    review=seed_blocked_historical_review(app_id,blocked)
-    check("과거 심사 fixture 엔진 최종 판정", review.final_status, "FAIL")
+        review = session.exec(select(models.Review).where(models.Review.application_id == app_id)).first()
+    check_true("실제 제출이 Review 생성", review is not None)
+    assert review is not None
+    check("실제 접수 후 엔진 최종 판정 보존", review.final_status, "FAIL")
     check("1단계(서류)는 통과", review.stage1_status, "PASS")
     check("2단계(자격) 부적합", review.stage2_status, "FAIL")
```

### `run_p4_scenarios.py::_create`

소득 자격만으로 거절하던 공개 계약을 정상 접수로 변경; historical 우회 없이 실제 API가 생성한 Review 원판정 검증.

```diff
--- before
+++ after
@@ -23,10 +23,6 @@
     final=client.get(f"/api/applications/{app_id}/final-check").json()
     submitted=client.post(f"/api/applications/{app_id}/submit")
-    if any(item.get("code")=="OVER_LIMIT" for item in final["blockers"]):
-        check("과거 부적합 fixture의 현재 제출은 차단",submitted.status_code,400)
-        check("확정 소득 초과 final-check 차단",final["can_submit"],False)
-        check_true("차단 응답에 기준·본인 금액",all(value in submitted.json()["detail"] for value in ("311,031","340,000")))
-        seed_blocked_historical_review(app_id,submitted)
-    else:
-        check("정상/확인필요 fixture 제출",submitted.status_code,200)
+    check("원판정과 무관하게 신청 요건 완료 fixture 제출", submitted.status_code, 200)
+    check("공개 제출 준비상태", final["can_submit"], True)
+    check("소득 자격 차단 비노출", [item for item in final["blockers"] if item.get("kind") == "eligibility"], [])
     return app_id
```

### `run_p5_scenarios.py::test_self_check`

답변 완료만 공개하고 eligible/failed_item/reason/alternative를 비노출; 미완료 입력 차단은 유지.

```diff
--- before
+++ after
@@ -7,5 +7,5 @@
     ).json()
     check("2문항만 답해도 완료", result["completed"], True)
-    check("자격 있음", result["eligible"], True)
+    check("자가진단 자격 결과 비노출", "eligible" in result, False)
     check("물은 문항 수", result["total_items"], 2)

@@ -13,8 +13,8 @@
         f"/api/applications/{job_id}/self-check", json={"answers": {"1": "예", "2": "아니오"}}
     ).json()
-    check("연령 미달 → 부적격", denied["eligible"], False)
-    check("막힌 문항", denied["failed_item"], 2)
-    check_true("취업패키지 연령 기준으로 안내", "1987. 1. 1." in denied["reason"])
-    check_true("2008년생까지 안내", "2008. 12. 31." in denied["reason"])
+    check("연령 답변에도 작성 완료", denied["completed"], True)
+    check("실패 문항 비노출", "failed_item" in denied, False)
+    check("부적격 사유 비노출", "reason" in denied, False)
+    check("대안 안내 비노출", "alternative" in denied, False)

     print("\n  -- 같은 답변을 두배적금에 넣으면 아직 미완료다 (8문항이므로)")
```

### `run_p5_scenarios.py::test_exam_date_required`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -7,26 +7,27 @@

     missing = _upload(client, app_id, "certificate_1_exam", "S10_응시확인서_응시일없음.pdf")
-    check("응시일 없는 응시확인서 판정", missing["status"], "FAIL")
+    check_document_status('응시일 없는 응시확인서 판정', missing, 'FAIL')
     codes = [f["code"] for f in missing["findings"]]
-    check("사유 코드", codes, ["MISSING_REQUIRED_FIELD"])
-    print(f"         사유: {missing['findings'][0]['message']}")
-    print(f"         해결: {missing['findings'][0]['how_to_fix']}")
-    check_true("해결 방법에 응시일 표기 안내", "응시일" in missing["findings"][0]["how_to_fix"])
+    check("허용 밖 사유 비노출", codes, [])
+    with models.get_session() as session:
+        stored = session.get(models.Document, missing["document_id"])
+    check("응시일 누락 원판정 보존", stored.stage1_status, "FAIL")
+    check_true("해결 방법 원문 보존", any("응시일" in finding.get("how_to_fix", "") for finding in stored.findings_json))

     ok = _upload(client, app_id, "certificate_1_exam", "S10_응시확인서_적합.pdf")
-    check("응시일 있는 응시확인서", ok["status"], "PASS")
+    check_document_status('응시일 있는 응시확인서', ok, 'PASS')
     check("응시일 판독", ok["extracted"].get("응시일"), "2026-03-22")

     transcript = _upload(client, app_id, "certificate_1_exam", "S10_성적표_적합.pdf")
-    check("성적표도 같은 자리에 인정된다 (택1)", transcript["status"], "PASS")
+    check_document_status('성적표도 같은 자리에 인정된다 (택1)', transcript, 'PASS')
     check("판독된 서류", transcript["detected_doc_type"], "성적표")

     wrong = _upload(client, app_id, "certificate_1_exam", "S10_면접확인서_1회차.pdf")
-    check("엉뚱한 서류는 여전히 부적합", wrong["status"], "FAIL")
+    check_document_status('엉뚱한 서류는 여전히 부적합', wrong, 'FAIL')
     check("사유", [f["code"] for f in wrong["findings"]], ["WRONG_DOCUMENT_TYPE"])

     print("\n  -- 결제영수증은 금액을 읽어 실비 계산의 근거로 남긴다")
     receipt = _upload(client, app_id, "certificate_1_receipt", "S10_결제영수증_응시료43000.pdf")
-    check("영수증 판정", receipt["status"], "PASS")
+    check_document_status('영수증 판정', receipt, 'PASS')
     check("판독된 결제금액", receipt["extracted"].get("결제금액"), "43000")

@@ -35,4 +36,7 @@
     ])
     mismatch = _upload(client, mismatch_app, "photo_1_receipt", "S10_결제영수증_사진18000.pdf")
-    check("입력 금액과 판독 금액 불일치는 확인필요", mismatch["status"], "NEEDS_REVIEW")
-    check_true("금액 불일치 코드", any(f["code"] == "RECEIPT_AMOUNT_MISMATCH" for f in mismatch["findings"]))
+    check_document_status('입력 금액과 판독 금액 불일치는 확인필요', mismatch, 'NEEDS_REVIEW')
+    check("금액 불일치 사유 비노출", mismatch["findings"], [])
+    with models.get_session() as session:
+        stored = session.get(models.Document, mismatch["document_id"])
+    check_true("금액 불일치 코드 원본 보존", any(f["code"] == "RECEIPT_AMOUNT_MISMATCH" for f in stored.findings_json))
```

### `run_p5_scenarios.py::test_supplement_countdown`

내부 NEEDS_REVIEW만 있는 신청의 보완 블록 전체를 None으로 숨김; 원래 Review 기한과 담당자 카운트다운은 보존 확인.

```diff
--- before
+++ after
@@ -3,5 +3,5 @@

     uploads = dict(S10_UPLOADS)
-    # 저해상도 초본 → 판독 신뢰도 0.6 → 확인필요. 제출은 되지만 보완 대상이다.
+    # 저해상도 초본의 내부 확인필요 판정·보완기한은 보존하고 신청자에게 숨긴다.
     uploads["resident_abstract"] = "S8_주민등록초본_저해상도.pdf"
     app_id = create_job_application(client, selections=S10_SELECTION, uploads=uploads)
@@ -13,15 +13,20 @@
     check("두 번째 접수 순번", body["first_come"]["position"], 2)

-    supplement = body["supplement"]
-    check_true("보완 기한이 잡혔다", supplement)
-    check("보완 일수", supplement["days"], 7)
-    check("남은 일수", supplement["days_left"], 7)
-    check("기한 만료 아님", supplement["expired"], False)
-    check_true("보완 대상 서류가 지목된다", supplement["targets"])
-    check("보완 대상", supplement["targets"][0]["label"], "주민등록초본")
-    print(f"         기한: {supplement['deadline']} · {supplement['notice']}")
+    check("내부 확인필요만 있는 접수 응답은 보완 블록 비노출", body["supplement"], None)
+    with models.get_session() as session:
+        review = session.exec(select(models.Review).where(models.Review.application_id == app_id)).first()
+    check("내부 확인필요 원판정과 보완기한 보존", (review.final_status, bool(review.supplement_deadline)), ("NEEDS_REVIEW", True))
+    officer = client.get(
+        f"/api/officer/applications/{app_id}", params={"role": ROLE_PROVINCE}
+    ).json()
+    supplement = officer["supplement"]
+    check_true("담당자 보완 기한 보존", supplement)
+    check("담당자 보완 일수", supplement["days"], 7)
+    check("담당자 남은 일수", supplement["days_left"], 7)
+    check("담당자 기한 만료 아님", supplement["expired"], False)
+    check("담당자 보완 기한과 저장 기한 일치", supplement["deadline"], review.supplement_deadline.isoformat(timespec="seconds"))

     status = client.get(f"/api/applications/{app_id}/status").json()
-    check("마이페이지에도 카운트다운", status["supplement"]["days_left"], 7)
+    check("내부 확인필요만 있는 마이페이지는 보완 블록 비노출", status["supplement"], None)

     print("\n  -- 두배적금은 보완도 선착순도 없다")
```

### `run_p6_scenarios.py::load_expected`

S7 공개 can_submit=False/400/historical override 제거. 이제 JSON이 실제 정상 제출 계약을 직접 명세.

```diff
--- before
+++ after
@@ -4,9 +4,3 @@
         raise FileNotFoundError(f"기대 결과 JSON이 없습니다: {path}")
     spec=json.loads(path.read_text(encoding="utf-8"))
-    if scenario=="S7":
-        # The published legacy script submits confirmed excess income. Current
-        # API blocks it; retain its engine/officer assertions via historical seed.
-        spec["expect"]["can_submit"]=False
-        spec["expect"].update({"submit_status_code":400,"eligibility_code":"OVER_LIMIT",
-                              "historical_review":True})
     return spec
```

### `run_p6_scenarios.py::s1_self_check_blocks`

답변 완료만 공개하고 eligible/failed_item/reason/alternative를 비노출; 미완료 입력 차단은 유지.

```diff
--- before
+++ after
@@ -8,4 +8,5 @@
         f"/api/applications/{app_id}/self-check", json={"answers": answers}
     ).json()
+    check("S1 자가진단 응답은 작성완료만", sorted(result), ["completed", "total_items"])
     blocked = client.post(f"/api/applications/{app_id}/submit")
     app = client.get(f"/api/applications/{app_id}").json()
@@ -16,10 +17,10 @@
     return {
         "application_no": app["application_no"],
-        "eligible": result["eligible"],
+        "eligible": result.get("eligible"),
         "completed": result["completed"],
-        "failed_item": result["failed_item"],
+        "failed_item": result.get("failed_item"),
         "total_items": result["total_items"],
-        "reason": result["reason"],
-        "alternative": result["alternative"],
+        "reason": result.get("reason"),
+        "alternative": result.get("alternative"),
         "submit_status_code": blocked.status_code,
         "status": app["status"],
```

### `run_p6_scenarios.py::s5_declared_mismatch`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -4,4 +4,8 @@
         client, app_id, "resident_abstract", "S5_주민등록초본_발급일불일치.pdf", "2026-03-05"
     )
+    with models.get_session() as session:
+        stored = session.get(models.Document, doc["document_id"])
+    check("S5 발급일 불일치 원판정 보존", stored.stage1_status, "FAIL")
+    check("S5 발급일 불일치 원사유 보존", [finding["code"] for finding in stored.findings_json], ["DECLARED_DATE_MISMATCH"])
     return {
         "status": doc["status"],
```

### `run_p6_scenarios.py::s6_encrypted`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -2,9 +2,12 @@
     """암호가 걸린 PDF."""
     doc = _upload(client, app_id, "resident_abstract", "S6_주민등록초본_암호.pdf", "2026-03-05")
+    with models.get_session() as session:
+        stored = session.get(models.Document, doc["document_id"])
+    check("S6 원래 판독 신뢰도 보존", stored.ocr_json.get("confidence"), 0.0)
     return {
         "status": doc["status"],
         "codes": _codes(doc),
         "detected_doc_type": doc["detected_doc_type"],
-        "ocr_confidence": doc["ocr_confidence"],
+        "ocr_confidence": doc.get("ocr_confidence"),
         "message": _finding(doc, "message"),
         "how_to_fix": _finding(doc, "how_to_fix"),
```

### `run_p6_scenarios.py::s7_income_over`

소득 자격만으로 거절하던 공개 계약을 정상 접수로 변경; historical 우회 없이 실제 API가 생성한 Review 원판정 검증.

```diff
--- before
+++ after
@@ -6,17 +6,17 @@
     final = client.get(f"/api/applications/{app_id}/final-check").json()
     submitted=client.post(f"/api/applications/{app_id}/submit")
-    check("S7 확정 소득 초과 현재 제출 차단",submitted.status_code,400)
-    income=next(item for item in final["blockers"] if item.get("code")=="OVER_LIMIT")
-    check_true("S7 차단 숫자 근거",all(value in income["message"] for value in ("4명","311,031","340,000","140%")))
+    check("S7 확정 소득 초과도 정상 제출", submitted.status_code, 200)
+    check("S7 신청자 자격 차단 비노출", [item for item in final["blockers"] if item.get("kind") == "eligibility"], [])
     with models.get_session() as session:
-        check("S7 차단 요청은 Review 미생성",session.exec(select(models.Review).where(models.Review.application_id==app_id)).first(),None)
-    review=seed_blocked_historical_review(app_id,submitted)
+        review = session.exec(select(models.Review).where(models.Review.application_id == app_id)).first()
+    check_true("S7 실제 제출로 Review 생성", review is not None)
+    assert review is not None
     status = client.get(f"/api/applications/{app_id}/status").json()

     return {
-        "documents_all_pass": all(d["status"] == "PASS" for d in final["documents"]),
+        "documents_all_pass": all(d["status"] == "UPLOADED" for d in final["documents"]),
         "submit_status_code":submitted.status_code,
-        "eligibility_code":income["code"],
-        "historical_review":review.review_payload_json.get("synthetic_historical_fixture") is True,
+        "eligibility_code": next((item.get("code") for item in final["blockers"] if item.get("kind") == "eligibility"), None),
+        "historical_review": review.review_payload_json.get("synthetic_historical_fixture") is True,
         "can_submit": final["can_submit"],
         "final_status": review.final_status,
```

### `run_p6_scenarios.py::s8_needs_review`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -5,4 +5,9 @@
     documents = client.get(f"/api/applications/{app_id}/documents").json()
     abstract = next(d for d in documents if d["slot_key"] == "resident_abstract")
+    with models.get_session() as session:
+        stored = session.get(models.Document, abstract["document_id"])
+    check("S8 원래 판독 신뢰도 보존", stored.ocr_json.get("confidence"), 0.6)
+    check("S8 원래 판정 보존", stored.stage1_status, "NEEDS_REVIEW")
+    check_true("S8 원래 판독 사유 보존", any(finding["code"] == "LOW_OCR_CONFIDENCE" for finding in stored.findings_json))

     final = client.get(f"/api/applications/{app_id}/final-check").json()
@@ -31,5 +36,5 @@
         "upload_status": abstract["status"],
         "upload_codes": _codes(abstract),
-        "ocr_confidence": abstract["ocr_confidence"],
+        "ocr_confidence": abstract.get("ocr_confidence"),
         "how_to_fix": _finding(abstract, "how_to_fix"),
         "can_submit": final["can_submit"],
```

### `run_p6_scenarios.py::main`

비결정적인 slowest_upload_ms를 두 회차 완전동일 비교에서 제외. 각 회차 <5000ms 성능 기대값은 유지.

```diff
--- before
+++ after
@@ -58,5 +58,9 @@
         print("\n[멱등성] 1회차와 2회차의 결과가 글자 하나까지 같은가")
         for scenario in SCENARIOS:
-            same = rounds[0][scenario] == rounds[1][scenario]
+            # Wall-clock latency is checked independently against the same upper bound
+            # in each round; it is not a deterministic reset outcome.
+            first = {key: value for key, value in rounds[0][scenario].items() if key != "slowest_upload_ms"}
+            second = {key: value for key, value in rounds[1][scenario].items() if key != "slowest_upload_ms"}
+            same = first == second
             check(f"{scenario} 재현", same, True)
             if not same:
```

### `run_p7_scenarios.py::test_form_files_and_paper_flow`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -301,6 +301,10 @@
         data={"slot_key": "admin_info_consent"},
     )
-    check("서명 없는 스캔은 담당자 확인", unsigned_response.json().get("status"), "NEEDS_REVIEW")
-    check_true("서명 판독 불확실 사유", any(f.get("code") == "ADMIN_CONSENT_SIGNATURE_UNREADABLE" for f in unsigned_response.json().get("findings", [])))
+    check("서명 판독 불확실 스캔 업로드 완료", unsigned_response.json().get("status"), "UPLOADED")
+    check("서명 판독 불확실 사유 비노출", unsigned_response.json().get("findings"), [])
+    with models.get_session() as session:
+        unsigned_stored = session.get(models.Document, unsigned_response.json()["document_id"])
+    check("서명 판독 불확실 원판정 보존", unsigned_stored.stage1_status, "NEEDS_REVIEW")
+    check_true("서명 판독 불확실 원사유 보존", any(f.get("code") == "ADMIN_CONSENT_SIGNATURE_UNREADABLE" for f in unsigned_stored.findings_json))

     flow_id, _ = seed(client, tmp)
```

### `run_p9_identity_scenarios.py::test_nhis_dependent_reconciliation`

소득 자격만으로 거절하던 공개 계약을 정상 접수로 변경; historical 우회 없이 실제 API가 생성한 Review 원판정 검증.

```diff
--- before
+++ after
@@ -8,6 +8,5 @@
         client, own, tmp, "S2_건강보험료납부확인서_적합", "nhis_payment"
     )
-    check("본인 명의 납부확인서 → 통과", own_doc["status"], "PASS")
-
+    check_document_status('본인 명의 납부확인서 → 통과', own_doc, 'PASS')
     dependent = new_app(client)
     identify(client, dependent, "김전북", "1999-01-01")
@@ -15,5 +14,5 @@
         client, dependent, tmp, "P9_건강보험료납부확인서_부모명의", "nhis_payment"
     )
-    check("부모 명의 납부확인서만 → 확인필요", first["status"], "NEEDS_REVIEW")
+    check_document_status('부모 명의 납부확인서만 → 확인필요', first, 'NEEDS_REVIEW')
     second = upload_fixture(
         client, dependent, tmp, "P9_건강보험자격확인서_부모명의_본인포함", "nhis_qualification"
@@ -21,10 +20,8 @@
     docs = client.get(f"/api/applications/{dependent}/documents").json()
     by_slot = {doc["slot_key"]: doc for doc in docs}
-    check("같은 가입자 + 가구원 본인 → 납부확인서 통과",
-          by_slot["nhis_payment"]["status"], "PASS")
-    check("같은 가입자 + 가구원 본인 → 자격확인서 통과",
-          by_slot["nhis_qualification"]["status"], "PASS")
+    check_document_status('같은 가입자 + 가구원 본인 → 납부확인서 통과', by_slot['nhis_payment'], 'PASS')
+    check_document_status('같은 가입자 + 가구원 본인 → 자격확인서 통과', by_slot['nhis_qualification'], 'PASS')
     check_true("피부양자 판정 사유 코드 기록",
-               "NHIS_DEPENDENT_INSURED_PERSON" in codes(by_slot["nhis_payment"]))
+               "NHIS_DEPENDENT_INSURED_PERSON" in [finding["code"] for finding in _stored_document(by_slot["nhis_payment"]).findings_json])
     check_applicant_name_hidden(client, dependent, parent, [first, second])

@@ -45,11 +42,9 @@
     final=client.get(f"/api/applications/{dependent}/final-check").json()
     submitted=client.post(f"/api/applications/{dependent}/submit")
-    check("부모 명의 관계 확인과 별개로 확정 소득 초과 제출 차단",submitted.status_code,400)
-    income=next(item for item in final["blockers"] if item.get("code")=="OVER_LIMIT")
-    check("자격 차단 종류",income["kind"],"eligibility")
-    check_true("부모 명의 소득 차단은 가구·평균 금액 근거 포함",all(value in income["message"] for value in ("2명","200,000","140%")))
-    # Officer cross-reference/privacy assertions below inspect a historical
-    # submitted fixture; the current applicant request remains rejected.
-    seed_blocked_historical_review(dependent,submitted)
+    check("부모 명의 관계 확인 뒤 정상 접수", submitted.status_code, 200)
+    check("신청자 소득 자격 차단 비노출", [item for item in final["blockers"] if item.get("kind") == "eligibility"], [])
+    with models.get_session() as session:
+        review = session.exec(select(models.Review).where(models.Review.application_id == dependent)).first()
+    check_true("실제 접수로 원판정 저장", review is not None and review.final_status == "FAIL")
     officer = client.get(
         f"/api/officer/applications/{dependent}", params={"role": p4.ROLE_CITY}
@@ -72,5 +67,5 @@
         client, missing_qual, tmp, "P9_건강보험료납부확인서_부모명의", "nhis_payment"
     )
-    check("자격확인서 없음 → 확인필요", miss_upload["status"], "NEEDS_REVIEW")
+    check_document_status('자격확인서 없음 → 확인필요', miss_upload, 'NEEDS_REVIEW')
     check_applicant_name_hidden(client, missing_qual, parent, [miss_upload])

@@ -84,6 +79,5 @@
     )
     absent_docs = client.get(f"/api/applications/{absent_member}/documents").json()
-    check("가구원 목록에 본인 없음 → 확인필요",
-          absent_docs[0]["status"], "NEEDS_REVIEW")
+    check_document_status('가구원 목록에 본인 없음 → 확인필요', absent_docs[0], 'NEEDS_REVIEW')
     check_applicant_name_hidden(
         client, absent_member, parent, [absent_payment, absent_qualification]
@@ -95,5 +89,5 @@
         client, reverse, tmp, "P9_건강보험자격확인서_부모명의_본인포함", "nhis_qualification"
     )
-    check("자격확인서 먼저 → 확인필요", reverse_qualification["status"], "NEEDS_REVIEW")
+    check_document_status('자격확인서 먼저 → 확인필요', reverse_qualification, 'NEEDS_REVIEW')
     reverse_payment = upload_fixture(
         client, reverse, tmp, "P9_건강보험료납부확인서_부모명의", "nhis_payment"
@@ -103,5 +97,6 @@
     check("납부확인서 나중 → 두 서류 모두 통과",
           [reverse_by_slot[k]["status"] for k in ("nhis_payment", "nhis_qualification")],
-          ["PASS", "PASS"])
+          ["UPLOADED", "UPLOADED"])
+    check("대조 완료 뒤 원판정 보존", [_stored_document(reverse_by_slot[key]).stage1_status for key in ("nhis_payment", "nhis_qualification")], ["PASS", "PASS"])
     deleted = client.delete(
         f"/api/applications/{reverse}/documents/{reverse_by_slot['nhis_qualification']['document_id']}"
@@ -109,6 +104,5 @@
     check("자격확인서 삭제", deleted.status_code, 200)
     remaining = client.get(f"/api/applications/{reverse}/documents").json()
-    check("자격확인서 삭제 뒤 납부확인서 → 확인필요",
-          remaining[0]["status"], "NEEDS_REVIEW")
+    check_document_status('자격확인서 삭제 뒤 납부확인서 → 확인필요', remaining[0], 'NEEDS_REVIEW')
     check_applicant_name_hidden(
         client, reverse, parent,
@@ -119,3 +113,3 @@
     identify(client, parent_abstract, "이익산", "1998-05-05")
     abstract = upload_abstract(client, parent_abstract, tmp, fake_abstract_words(), "부모명의초본")
-    check("부모 명의 초본 → 기존과 같은 부적합", abstract["status"], "FAIL")
+    check_document_status('부모 명의 초본 → 기존과 같은 부적합', abstract, 'FAIL')
```

### `run_p9_identity_scenarios.py::test_matching`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -4,6 +4,5 @@
     identify(client, own, "김전북", "1999-01-01")
     doc = upload_abstract(client, own, tmp, fake_abstract_words(), "본인초본")
-    check("본인 초본 → 판정", doc["status"], "PASS")
-
+    check_document_status('본인 초본 → 판정', doc, 'PASS')
     print("\n[3-1] 올린 서류 다시 보기")
     check_true("신청자 응답에 파일 주소", doc["file_url"].startswith("/api/files/"))
@@ -18,5 +17,5 @@
     identify(client, other, "이익산", "1998-05-05")
     doc = upload_abstract(client, other, tmp, fake_abstract_words(), "타인초본")
-    check("타인 초본 → 판정", doc["status"], "FAIL")
+    check_document_status('타인 초본 → 판정', doc, 'FAIL')
     check_true("사유: IDENTITY_MISMATCH", "IDENTITY_MISMATCH" in codes(doc))
     msg = " ".join(f["message"] + f["how_to_fix"] for f in doc["findings"])
@@ -28,5 +27,5 @@
     identify(client, namesake, "김전북", "2000-02-02")
     doc = upload_abstract(client, namesake, tmp, fake_abstract_words(), "동명이인")
-    check("동명이인(생년월일 다름) → 판정", doc["status"], "FAIL")
+    check_document_status('동명이인(생년월일 다름) → 판정', doc, 'FAIL')
     check_true("생년월일이 다른 신청인 안내",
                any(f["message"] == "본인이 직접 발급받은 초본이 아닙니다. 본인 명의로 발급받아 다시 올려 주세요."
@@ -42,5 +41,5 @@
                 w.text = "김전복"
     doc = upload_abstract(client, shaky, tmp, words, "오독초본")
-    check("판정", doc["status"], "NEEDS_REVIEW")
-    check_true("사유: IDENTITY_UNCERTAIN", "IDENTITY_UNCERTAIN" in codes(doc))
+    check_document_status('판정', doc, 'NEEDS_REVIEW')
+    check_true("사유: IDENTITY_UNCERTAIN", "IDENTITY_UNCERTAIN" in [finding["code"] for finding in _stored_document(doc).findings_json])
     check_true("본인 서류 아님으로 단정 안 함", "IDENTITY_MISMATCH" not in codes(doc))
```

### `run_p9_identity_scenarios.py::test_samples_and_no_identity`

신청자 공개 상태/사유/신뢰도는 허용 FAIL·중립 상태로 변경; 원래 저장·담당자 판정은 별도 단언으로 보존.

```diff
--- before
+++ after
@@ -14,5 +14,5 @@
                 data={"slot_key": slot, "declared_issue_date": "2026-03-05"},
             ).json()
-        check(f"{slot} (홍길동 샘플) → 판정", doc["status"], "PASS")
+        check_document_status(f"{slot} (홍길동 샘플) → 판정", doc, "PASS")

     print("\n[5-1] 본인인증 이름이 시연 샘플과 다름 — 샘플도 본인 대조 대상")
@@ -27,5 +27,6 @@
     sample_docs = client.get(f"/api/applications/{different}/documents").json()
     check("시연 샘플의 명의가 인증 정보와 다르면 확인필요",
-          [doc["status"] for doc in sample_docs], ["NEEDS_REVIEW", "NEEDS_REVIEW"])
+          [doc["status"] for doc in sample_docs], ["UPLOADED", "UPLOADED"])
+    check("시연 샘플 원래 관계 확인 판정 보존", [_stored_document(doc).stage1_status for doc in sample_docs], ["NEEDS_REVIEW", "NEEDS_REVIEW"])
     check_applicant_name_hidden(client, different, "홍길동", [payment, qualification])

@@ -33,3 +34,3 @@
     bare = new_app(client)
     doc = upload_abstract(client, bare, tmp, fake_abstract_words(), "미인증")
-    check("판정", doc["status"], "PASS")
+    check_document_status('판정', doc, 'PASS')
```

## 합성 fixture 입력

다음 module-level 정상 신청 fixture에 `email: (없음) → synthetic@example.com`을 추가했다. 서버의 이메일 필수값 검사와 기존 성공 시나리오를 양립시키기 위한 합성 입력 보완이다.

- `run_p3_scenarios.py::S2_FORM1`
- `run_p4_scenarios.py::BASE_FORM1`
- `run_p6_scenarios.py::BASE_FORM1`

## 시나리오 JSON 기대값의 정확한 전후 값

| 파일 | 키 | 변경 전 | 변경 후 | 이유 |
|---|---|---|---|---|
| `S1.json` | `expect.alternative` | `{"$contains": "청년내일저축계좌"}` | `null` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S1.json` | `expect.eligible` | `false` | `null` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S1.json` | `expect.failed_item` | `6` | `null` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S1.json` | `expect.reason` | `"제외 대상 확인에 동의해야 신청할 수 있습니다."` | `null` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S10.json` | `expect.exam_without_date_codes` | `["MISSING_REQUIRED_FIELD"]` | `[]` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S10.json` | `expect.exam_without_date_status` | `"FAIL"` | `"UPLOADED"` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S2.json` | `expect.document_statuses` | `["PASS", "PASS", "PASS", "PASS", "PASS"]` | `["UPLOADED", "UPLOADED", "UPLOADED", "UPLOADED", "UPLOADED"]` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S3.json` | `expect.status` | `"FAIL"` | `"REUPLOAD_REQUIRED"` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S4.json` | `expect.status` | `"FAIL"` | `"REUPLOAD_REQUIRED"` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S5.json` | `expect.codes` | `["DECLARED_DATE_MISMATCH"]` | `[]` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S5.json` | `expect.how_to_fix` | `{"$contains": "발급일"}` | `""` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S5.json` | `expect.message` | `{"$contains": "2026-03-10"}` | `""` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S5.json` | `expect.status` | `"FAIL"` | `"UPLOADED"` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S6.json` | `expect.ocr_confidence` | `0.0` | `null` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S6.json` | `expect.status` | `"FAIL"` | `"REUPLOAD_REQUIRED"` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S7.json` | `expect.eligibility_code` | `"(없음)"` | `null` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S7.json` | `expect.historical_review` | `"(없음)"` | `false` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S7.json` | `expect.submit_status_code` | `"(없음)"` | `200` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S8.json` | `expect.how_to_fix` | `{"$contains": "담당자"}` | `""` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S8.json` | `expect.ocr_confidence` | `0.6` | `null` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S8.json` | `expect.upload_codes` | `["LOW_OCR_CONFIDENCE"]` | `[]` | 신청자 공개 계약 정합성; 내부 기대값 유지 |
| `S8.json` | `expect.upload_status` | `"NEEDS_REVIEW"` | `"UPLOADED"` | 신청자 공개 계약 정합성; 내부 기대값 유지 |

S7의 main `load_expected`는 JSON의 can_submit=True를 실행 시 False로 덮고 submit_status_code=400, eligibility_code=OVER_LIMIT, historical_review=True를 추가했다. 이번에는 override 없이 JSON 자체가 can_submit=True, 200, null, False를 명세한다. S2·S7·S8의 final_status/stage1_status/stage2_status/점수/담당자 큐 기대값은 그대로다.

## 시험 수 해석

모듈 수는 18개 그대로이며 집계 출력이 없는 P14도 exit code로 검사한다. 원판정 보존 단언과 실제 제출 경로 단언을 추가하여 통과 assertion 합계가 기준선 1,885보다 증가할 수 있다. JSON 포맷 정리·서술 메타데이터 정정은 기대값 변경과 구분한다. 최종 실측 집계는 루트 보고서와 /tmp/savings-submit-scenarios/summary.json에 기록한다.

## 최종 18개 모듈 실측

18개 모두 exit=0. 집계 17개 합계 1,955 통과 / 실패 0, 기준선 1,885 대비 +70. P14는 건수 미출력/exit=0.

| 모듈 | 기준선 | 이번 통과 | 차이 | exit |
|---|---:|---:|---:|---:|
| `run_p2_scenarios` | 53 | 53 | 0 | 0 |
| `run_p3_scenarios` | 186 | 185 | -1 | 0 |
| `run_p4_scenarios` | 189 | 195 | 6 | 0 |
| `run_p5_scenarios` | 152 | 161 | 9 | 0 |
| `run_p6_scenarios` | 261 | 275 | 14 | 0 |
| `run_p7_scenarios` | 253 | 255 | 2 | 0 |
| `run_p8_localocr_scenarios` | 89 | 89 | 0 | 0 |
| `run_p9_identity_scenarios` | 98 | 118 | 20 | 0 |
| `run_p11_criteria_scenarios` | 38 | 38 | 0 | 0 |
| `run_p12_subsidy_criteria_scenarios` | 29 | 36 | 7 | 0 |
| `run_p13_household_scenarios` | 26 | 26 | 0 | 0 |
| `run_p14_pdf_forms_scenarios` | 미출력 | 미출력 | — | 0 |
| `run_p15_jbai_scenarios` | 129 | 131 | 2 | 0 |
| `run_p16_job_docs_scenarios` | 96 | 101 | 5 | 0 |
| `run_p17_own_scenarios` | 75 | 76 | 1 | 0 |
| `run_p18_applicant_precheck_scenarios` | 180 | 183 | 3 | 0 |
| `run_p19_nhis_history_scenarios` | 24 | 26 | 2 | 0 |
| `run_p20_nhis_continuation_scenarios` | 7 | 7 | 0 | 0 |

P3 합계 -1은 기존 소득 eligibility 종류/공개 숫자 근거/미생성 Review 차단 단언을 정상 제출/공개 자격 비노출/실제 생성 Review 단언으로 교체한 차이다. 해당 시험 함수 및 내부 소득 초과·점수·엔진 판정 검증은 유지했다. 나머지 증가는 공개/저장 판정 분리, 실제 제출 및 숨김 경계 보존을 함께 검사한 추가 단언이다.

중간 실행에서 발견한 문법 편집 오류·옛 공개 계약 기대 실패는 수정 후 전체 18개 모듈을 처음부터 다시 실행했다. 위 수치는 최종 전체 재실행 결과다.

## 최종 검토의 보완기한 비노출 수정

| 파일·시험 | 수정 전 | 수정 후 | 이유 |
|---|---|---|---|
| `run_p5_scenarios.py::test_supplement_countdown` | 신청자 submit/status가 내부 NEEDS_REVIEW에서 파생된 보완 객체(7일·남은 7일·미만료·targets=[])를 반환 | 두 신청자 응답의 `supplement=None`; DB Review의 원래 NEEDS_REVIEW·보완기한을 보존하고 담당자 응답의 days=7/days_left=7/expired=False 및 저장된 deadline과 정확한 일치를 검사 | 숨긴 판정을 빈 대상 목록의 카운트다운으로 추론할 수 있는 누출 차단 |
| `run_p6_scenarios.py::s10_job_package`, `S10.json::expect.supplement_warning` | 프로그램 공통 7일 보완 정책 경고 문자열 포함 | 동일 문자열 포함 유지 | 개별 신청 판정에서 파생되지 않는 사업 공통 안내다. P6에는 개별 보완 객체 기대값이 없어 불필요한 기대값 변경을 하지 않았다. |

위 추가 검토 수정 후 전체 18개를 다시 별도 프로세스로 순차 실행하여 모두 exit=0, 1,955 통과/실패 0을 확인했다. 이전 1,954에서 +1은 P5에서 신청자 비노출과 담당자·저장 기한의 정확한 일치를 함께 검증한 추가 단언이다.


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
