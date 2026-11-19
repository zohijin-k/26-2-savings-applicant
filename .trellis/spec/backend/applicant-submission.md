# Applicant submission boundary

## Scope
The savings applicant UI submits from step three. `GET /final-check` remains the preparation API and `POST /submit` recomputes blockers from current stored inputs. Internal engine checks, document findings, Review statuses, scoring and officer projections retain their original contracts.

## Public document projection
`api.common.REUPLOAD_CODES` is the single ten-code allowlist: DOCUMENT_ISSUED_TOO_EARLY, DOCUMENT_ISSUED_AFTER_APPLICATION, IDENTITY_MISMATCH, IMAGE_RESOLUTION_TOO_LOW, LOW_IMAGE_QUALITY, PAGES_INCOMPLETE, UNREADABLE_FILE, MISSING_ADDRESS_DATES, MISSING_BILLING_MONTHS, WRONG_DOCUMENT_TYPE. Select only findings with severity FAIL; historical omitted severity keeps its existing FAIL default, but a missing/unknown code is never inferred from a message or stage1_status. NEEDS_REVIEW of the same code is hidden.

Applicant document.status is UPLOADED or REUPLOAD_REQUIRED, independent of the stored stage1_status. Public findings contain only allowlisted failures and public keys; confidence, internal details and other FAIL/NEEDS_REVIEW/INFO findings are absent. Identity masking must inspect the complete original findings before filtering. Never promote a hidden outcome to PASS or mutate stored evidence.

Identity/read/status responses do not include eligibility blockers. Self-check answers are stored and evaluated as before, but public results include only completed and total_items. Applicant warnings and supplement guidance must not reveal hidden judgments. When all supplement targets are hidden, return no applicant supplement object, preserving the original stored deadline and officer response; generic program-wide policy notices remain. Diagnostic CLIs retain raw reason/document/work/income outputs; only applicant_reason and applicant blockers follow this policy.

## Submission checks
Keep authentication/ownership and already-submitted protections. Check required written-form values, a valid required savings email, saving purpose and other required step-two inputs, completed self-check answers, conditional written-form requirements, required consents/signature or selected paper consent upload, all required upload slots, selected work category and allowlisted document failures. Preserve other programs' required subsidy-item checks. Internal income, age, work and self-check eligibility results never block applicant submission. There is no submit-anyway override.

Both preparation and direct submission use the same blocker function. A previously clear preparation response cannot authorize submission after an upload/input change. The frontend flushes pending saves, invalidates stale readiness and disables submission while loading, uploading, saving or submitting.

## Verification
Use synthetic documents and temporary databases only. Cover each allowlist code in FAIL and NEEDS_REVIEW, hidden/unknown/legacy/mixed findings, identity masking, immutable original data, direct-API required-field/consent/document/work checks, readiness-to-submit changes, and real submission of hidden failures with unchanged Review/officer outcomes. Record every changed existing expectation with file, test, before/after and reason; delete no tests.

## Second copy in the officer repository
`26-2-savings-officer` serves this same applicant API from its own backend, so the applicant frontend and the officer frontend can run against one database (that repository's `.trellis/spec/backend/unified-backend.md`, merged 2026-11-17). The applicant boundary code exists in both repositories with the same content: `api/applications.py`, `api/documents.py`, `api/review.py` and the applicant projection in `api/common.py` (`REUPLOAD_CODES`, `applicant_findings`, `document_dict`), together with their tests.

Apply every change to this boundary in both repositories. Otherwise the linked run answers this frontend with a different contract from the standalone run. Upload assessment (`rules/doc_check.py`, `ocr/localocr.py`, `engine_adapter.py`, `upload_assessment.py`, `engine_v2`) is not shared: the officer repository's is newer, and the linked run uses it.

Access control exists only in the officer repository (its `.trellis/spec/backend/access-control.md`, task `11-18-access-control`). There, every route under `/api/applications/{id}` and `GET /api/files/{document_id}` require the owner cookie `applicant_access_{id}` (or, for originals only, a logged-in officer); other requests get 403 `신청자 본인만 접근할 수 있습니다.`. `api/applications.py` `create` therefore issues the cookie with `path="/api"` in both repositories, so this frontend's calls, upload previews and my-page originals carry it. This repository's standalone backend has no such middleware; its only owner check is still the written-forms PDF (`api/forms.py` `_require_applicant_archive_access`). Drafts created before the change keep a cookie scoped to `/forms/files` and cannot be resumed in the linked run; start a new application.
