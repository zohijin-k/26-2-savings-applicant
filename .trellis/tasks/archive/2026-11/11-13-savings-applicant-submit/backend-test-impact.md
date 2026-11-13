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
