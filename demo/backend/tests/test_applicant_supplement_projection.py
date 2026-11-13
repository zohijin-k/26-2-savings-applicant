"""Synthetic public supplement projection never reveals a hidden internal judgment."""
from copy import deepcopy
from datetime import datetime, timedelta

import pytest
from sqlmodel import select

from demo.backend import models
from demo.backend.api import review as review_api
from demo.backend.rules.doc_types import DocType
from demo.backend.rules.programs import DOUBLE_SAVINGS, JOB_PACKAGE, get_program
from demo.backend.rules.required_docs import DocRequirement
from demo.backend.tests.test_income_review import make_application
from demo.backend.tests.test_portal_uploads import client


@pytest.mark.parametrize("program_code", [DOUBLE_SAVINGS, JOB_PACKAGE])
@pytest.mark.parametrize("case", ["review-only", "hidden-fail", "reupload", "missing"])
def test_supplement_projects_only_public_repair_targets(monkeypatch, program_code, case):
    app = models.Application(id=1, application_no="FAKE", program_code=program_code)
    deadline = datetime.now() + timedelta(days=7)
    review = models.Review(application_id=1, final_status="NEEDS_REVIEW", supplement_deadline=deadline)
    requirement = DocRequirement("resident_abstract", DocType.RESIDENT_ABSTRACT, "가상 서류")
    severity = "NEEDS_REVIEW" if case == "review-only" else "FAIL"
    code = "LOW_OCR_CONFIDENCE" if case == "review-only" else "DAILY_RECORDS_PARTIALLY_SELECTED"
    if case == "reupload":
        code = "PAGES_INCOMPLETE"
    finding = {"code": code, "severity": severity, "message": "가상 공개 사유" if case == "reupload" else "가상 내부 사유"}
    document = models.Document(application_id=1, slot_key=requirement.slot_key, file_path="FAKE.pdf",
                               file_format="pdf", stage1_status=severity, findings_json=[finding])
    before = deepcopy(document.findings_json)
    monkeypatch.setattr(review_api, "supplement_for_application", lambda _: {"allowed": True, "days": 7})
    monkeypatch.setattr(review_api, "checklist_for", lambda _: [requirement])
    monkeypatch.setattr(review_api, "list_documents", lambda _: [] if case == "missing" else [document])

    result = review_api._supplement(app, get_program(program_code), review)

    if case in {"review-only", "hidden-fail"}:
        assert result is None
    else:
        assert result["deadline"] == deadline.isoformat(timespec="seconds")
        assert result["targets"] == [{"label": "가상 서류", "reason": "아직 올리지 않았습니다." if case == "missing" else "가상 공개 사유"}]
    assert review.supplement_deadline == deadline
    assert review.final_status == "NEEDS_REVIEW"
    assert document.findings_json == before
    assert document.stage1_status == severity


def test_applicant_status_hides_empty_internal_deadline_but_keeps_stored_review(client, monkeypatch):
    app = make_application(premium=1)
    deadline = datetime.now() + timedelta(days=7)
    with models.get_session() as session:
        row = session.get(models.Application, app.id)
        row.status = models.STATUS_SUBMITTED
        session.add(row)
        session.add(models.Review(application_id=app.id, final_status="NEEDS_REVIEW", supplement_deadline=deadline))
        document = session.exec(select(models.Document).where(models.Document.application_id == app.id,
                                models.Document.slot_key == "resident_abstract")).one()
        document.stage1_status = "NEEDS_REVIEW"
        document.findings_json = [{"code": "LOW_OCR_CONFIDENCE", "severity": "NEEDS_REVIEW", "message": "가상 내부 사유"}]
        session.add(document)
        session.commit()
    monkeypatch.setattr(review_api, "supplement_for_application", lambda _: {"allowed": True, "days": 7})

    response = client.get(f"/api/applications/{app.id}/status")
    assert response.status_code == 200
    assert response.json()["supplement"] is None
    assert "가상 내부 사유" not in response.text
    with models.get_session() as session:
        stored = session.exec(select(models.Review).where(models.Review.application_id == app.id)).one()
        assert stored.supplement_deadline == deadline
        assert stored.final_status == "NEEDS_REVIEW"
