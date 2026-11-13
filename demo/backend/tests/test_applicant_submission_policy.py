"""Synthetic applicant projection and direct-submit guards preserve internal review facts."""
from copy import deepcopy

import pytest
from sqlmodel import select

from demo.backend import models
from demo.backend.api.common import REUPLOAD_CODES, applicant_findings, document_dict
from demo.backend.api.review import _run_review
from demo.backend.tests.test_eligibility_blockers import ready
from demo.backend.tests.test_income_review import make_application
from demo.backend.tests.test_portal_uploads import client


@pytest.mark.parametrize("code", sorted(REUPLOAD_CODES))
@pytest.mark.parametrize("severity,visible", [("FAIL", True), ("NEEDS_REVIEW", False), ("INFO", False), (None, True)])
def test_reupload_code_and_severity_matrix_preserves_original(code, severity, visible):
    source = {"code": code, "message": "가상 공개 사유", "detail": "가상 내부 근거"}
    if severity is not None:
        source["severity"] = severity
    before = deepcopy(source)
    document = models.Document(application_id=1, slot_key="resident_abstract", file_path="FAKE.pdf",
                               file_format="pdf", stage1_status="PASS", findings_json=[source],
                               ocr_json={"confidence": .37})
    projected = document_dict(document)
    assert bool(projected["findings"]) is visible
    assert projected["status"] == ("REUPLOAD_REQUIRED" if visible else "UPLOADED")
    assert "ocr_confidence" not in projected
    assert document.stage1_status == "PASS" and document.findings_json == [before]
    assert all("detail" not in finding for finding in projected["findings"])


def test_unknown_legacy_and_internal_findings_never_become_reupload_reasons():
    source = [{"message": "가상 과거 부적합"}, {"code": "DAILY_RECORDS_PARTIALLY_SELECTED", "severity": "FAIL"},
              {"code": "OVER_LIMIT", "severity": "FAIL"}, {"code": "PAGES_DUPLICATED", "severity": "FAIL"},
              {"code": "UNKNOWN_CODE", "severity": "FAIL"}, {"code": "LOW_OCR_CONFIDENCE", "severity": "NEEDS_REVIEW"}]
    before = deepcopy(source)
    assert applicant_findings(source) == []
    assert source == before


def _mutate_document(app_id, *, code, severity="FAIL", status="FAIL"):
    with models.get_session() as session:
        document = session.exec(select(models.Document).where(models.Document.application_id == app_id,
                                 models.Document.slot_key == "resident_abstract")).one()
        document.stage1_status = status
        document.findings_json = [
            {"code": code, "severity": severity, "message": "가상 공개 사유", "detail": "가상 내부 근거"},
            {"code": "OVER_LIMIT", "severity": "FAIL", "message": "가상 숨김 사유"},
            {"code": "IDENTITY_UNCERTAIN", "severity": "NEEDS_REVIEW", "message": "가상 검토 사유"},
        ]
        session.add(document)
        session.commit()
        return document.id, deepcopy(document.findings_json)


@pytest.mark.parametrize("code", sorted(REUPLOAD_CODES))
def test_direct_submit_rechecks_each_reupload_reason_after_clear_preparation(client, code):
    app = ready(make_application(premium=1))
    assert client.get(f"/api/applications/{app.id}/final-check").json()["can_submit"]
    document_id, original = _mutate_document(app.id, code=code, status="PASS")
    prepared = client.get(f"/api/applications/{app.id}/final-check").json()
    blocker = next(item for item in prepared["blockers"] if item["target"] == "resident_abstract")
    assert not prepared["can_submit"] and blocker["message"] == "가상 공개 사유"
    response = client.post(f"/api/applications/{app.id}/submit")
    assert response.status_code == 400 and "가상 공개 사유" in response.json()["detail"]
    assert "가상 숨김 사유" not in response.json()["detail"]
    assert "가상 검토 사유" not in response.json()["detail"]
    with models.get_session() as session:
        assert session.get(models.Document, document_id).findings_json == original
        assert session.get(models.Application, app.id).status == models.STATUS_DRAFT
        assert session.exec(select(models.Review).where(models.Review.application_id == app.id)).first() is None


@pytest.mark.parametrize("code,severity", [("DAILY_RECORDS_PARTIALLY_SELECTED", "FAIL"),
    ("PAGES_DUPLICATED", "FAIL"), ("UNKNOWN_DOCUMENT_TYPE", "FAIL"),
    ("MISSING_ADDRESS_HISTORY", "FAIL"), ("MISSING_SIGNATURE", "FAIL"),
    *[(code, "NEEDS_REVIEW") for code in sorted(REUPLOAD_CODES)]])
def test_hidden_outcomes_submit_and_preserve_stored_and_officer_decisions(client, code, severity):
    app = ready(make_application(premium=999999999))
    document_id, original = _mutate_document(app.id, code=code, severity=severity,
                                            status="FAIL" if severity == "FAIL" else "NEEDS_REVIEW")
    before = _run_review(app)
    prepared = client.get(f"/api/applications/{app.id}/final-check").json()
    assert prepared["can_submit"] and prepared["blockers"] == []
    assert all("가상 숨김 사유" not in str(value) and "가상 검토 사유" not in str(value)
               for value in prepared.values())
    assert client.post(f"/api/applications/{app.id}/submit").status_code == 200
    with models.get_session() as session:
        document = session.get(models.Document, document_id)
        assert document.findings_json == original
        assert document.stage1_status == ("FAIL" if severity == "FAIL" else "NEEDS_REVIEW")
        saved = session.exec(select(models.Review).where(models.Review.application_id == app.id)).one()
        assert saved.final_status == before.final_status
        assert saved.stage1_status == before.stage1_status
        assert saved.stage2_status == before.stage2_status
        assert saved.score_json == before.score_json
        assert saved.review_payload_json["reasons"] == before.review_payload_json["reasons"]
    detail = client.get(f"/api/officer/applications/{app.id}").json()
    found = next(document for document in detail["documents"] if document["document_id"] == document_id)
    assert found["findings"] == original


@pytest.mark.parametrize("missing", ["name", "birth", "address", "mobile", "email", "savingPurpose",
    "priorJoined", "gender", "householdType", "householdSize", "workType", "workplaceRegion",
    "bankName", "accountNo", "accountHolder", "transferIn", "employedAt", "invalid-email",
    "invalid-mobile", "numeric-email", "structured-email", "list-email", "blank-list-purpose",
    "structured-name", "empty-birth", "partial-birth", "self_check", "consent", "signature", "document", "work_category",
    "unknown-work-category", "partial-emergency", "invalid-emergency", "prior-details", "large-household"])
def test_direct_submit_rechecks_all_input_guards_after_clear_preparation(client, missing):
    app = ready(make_application(premium=1))
    assert client.get(f"/api/applications/{app.id}/final-check").json()["can_submit"]
    with models.get_session() as session:
        row = session.get(models.Application, app.id)
        form1 = dict(row.form1_json)
        if missing == "invalid-email":
            form1["email"] = "FAKE-invalid"
        elif missing == "invalid-mobile":
            form1["mobile"] = "1"
        elif missing == "numeric-email":
            form1["email"] = 123
        elif missing == "structured-email":
            form1["email"] = {"y": "2026", "m": "1", "d": "1"}
        elif missing == "list-email":
            form1["email"] = [""]
        elif missing == "blank-list-purpose":
            form1["savingPurpose"] = [""]
        elif missing == "structured-name":
            form1["name"] = {"y": "2026", "m": "1", "d": "1"}
        elif missing == "empty-birth":
            form1["birth"] = {}
        elif missing == "partial-birth":
            form1["birth"] = {"y": "1999", "m": "1"}
        elif missing == "self_check":
            row.self_check_json = {"1": "아니오"}
        elif missing == "consent":
            consent = session.exec(select(models.Consent).where(models.Consent.application_id == app.id,
                                   models.Consent.consent_type == "privacy")).one()
            consent.agreed = False
            session.add(consent)
        elif missing == "signature":
            row.form5_json = {}
            consent = session.exec(select(models.Consent).where(models.Consent.application_id == app.id,
                                   models.Consent.consent_type == "admin_info")).one()
            consent.signature_path = None
            session.add(consent)
        elif missing == "document":
            document = session.exec(select(models.Document).where(models.Document.application_id == app.id,
                                     models.Document.slot_key == "resident_abstract")).one()
            session.delete(document)
        elif missing in {"work_category", "unknown-work-category"}:
            row.doc_context_json = {**row.doc_context_json, "work_category": None if missing == "work_category" else "FAKE"}
        elif missing == "partial-emergency":
            form1["ecName"] = "가상연락인"
        elif missing == "invalid-emergency":
            form1.update(ecName="가상연락인", ecRelation="가상관계", ecContact="1")
        elif missing == "prior-details":
            form1["priorJoined"] = "참여"
        elif missing == "large-household":
            form1["householdSize"] = "10인 이상"
        else:
            form1.pop(missing)
        row.form1_json = form1
        session.add(row)
        session.commit()
    prepared = client.get(f"/api/applications/{app.id}/final-check").json()
    assert not prepared["can_submit"] and prepared["blockers"]
    assert client.post(f"/api/applications/{app.id}/submit").status_code == 400
    with models.get_session() as session:
        assert session.get(models.Application, app.id).status == models.STATUS_DRAFT
        assert session.exec(select(models.Review).where(models.Review.application_id == app.id)).first() is None


def test_negative_self_check_answers_remain_saved_without_applicant_verdict(client):
    app = ready(make_application(premium=1))
    answers = dict.fromkeys(map(str, range(1, 9)), "아니오")
    response = client.post(f"/api/applications/{app.id}/self-check", json={"answers": answers})
    assert response.status_code == 200 and response.json() == {"completed": True, "total_items": 8}
    assert client.get(f"/api/applications/{app.id}/final-check").json()["can_submit"]
    assert client.post(f"/api/applications/{app.id}/submit").status_code == 200
    with models.get_session() as session:
        assert session.get(models.Application, app.id).self_check_json == answers
