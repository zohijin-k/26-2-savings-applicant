# Applicant mutation and navigation UX contract

## Scope

Applicant-only adapters share equivalent small contracts across the savings and youth repositories. Policy field sets, consent requirements, generic schema/snapshot, upload slots and administrative eligibility stay with existing APIs. Shared helpers must not import applicant CSS into officer bundles. No form values, signature images or Files are persisted in browser storage by these helpers.

## Saving

`SaveStatus` describes `idle | saving | saved | failed`, with dirty consent/signature state taking precedence over a previous success. Incremental PATCH acknowledgements do not prove that consent/signature metadata has been flushed. A full flush serializes behind pending edits and writes the current snapshot plus selected policy consents. One flush Promise is shared until settlement. Failed flushes keep the document and values mounted. Inputs are disabled during the full snapshot flush; ordinary incremental saves retain the existing editing model.

## SPA and browser navigation

`useSaveBeforeLeave` registers current draft handlers in `lib/applicant-navigation.ts`. Shell history listeners MUST call `handleApplicantHistory(event)` before changing their React screen key. A listener installed by a child is insufficient: after a child remount, the older shell listener may run first and destroy the draft before the guard sees popstate. History entries carry a non-sensitive `applicantIndex`; restore the current entry, flush, then replay the intended back/forward direction. Failed saves stay on the current entry with values intact. The shell home action uses `requestApplicantLeave`. Native reload/close remains a separate beforeunload warning: it does not promise to finish saving.

Workspace local saves and bankbook uploads report busy state to the flow. Do not navigate away or start competing operations while these are pending. A File retained after an unsuccessful upload lives only for that mounted screen; tell applicants that leaving requires selection again.

## Uploads

Known transport byte events alone enable a percentage. `onSent` changes to indeterminate server processing; it does not prove OCR completion. XHR response deadline is 120 seconds; a timeout is an unknown write result, not proof of failure. Preserve HTTP status on both transports. Bankbook retains its separate existing 20MB gate; document preflight has a large-file hint rather than a new hard cap.

After an unsuccessful request, an explicit checklist GET precedes retry. A changed document ID proves only that the server slot changed; show the server original and results without attributing the local File or preview to it. An unchanged slot permits an explicit replacement warning/confirmation, not automatic retry. Keep File/slot/date in memory while mounted. A failed state query must not send the POST. Never fabricate idempotency keys or backend processing states. Exact-once writes and cross-worker delayed commits still require a backend operation/idempotency contract.

## Submission

`useApplicantSubmission` owns a ref-based duplicate guard and a generation guard. Read server status, then fresh final-check before POST. Preserve FAIL blockers and NEEDS_REVIEW semantics. A receipt requires non-draft status plus submitted_at from POST or status GET. On any uncertain response, attempt status recovery without another POST. If recovery cannot confirm submission, disable resubmission until an explicit status-only check. The submit response deadline is 15 seconds. Savings request transport must preserve TimeoutError/AbortError instead of flattening them into network status 0. Parent navigation receives submission busy state.

## Errors, validation and accessibility

Applicant mutation copy maps structural numeric HTTP status; do not parse a status from exception text or render internal exception bodies. 503 is transient, 401 authentication, 403 ownership/permission, 409 workflow conflict. Owner credential removal actually returns 403 in these backends; do not label it as an expired login. Actual officer-session failures return 401. Tests must distinguish injected statuses from actual API responses.

Keep required conditions unchanged. Show a focusable missing-field summary; preserve input descriptions while mounted. In youth, save failures/status must be inside the active form dialog because the page behind it is inert. Original PDF coordinates and field sizing stay unchanged. Axe target-size findings on these original PDF overlays exist in the baseline; retain raw findings and compare the exact same viewport/field set instead of claiming zero violations or stretching PDF geometry.

## Verification

Run types/build/lint and the actual Node test list. Browser tests cover duplicate writes, retained drafts, SPA/history/native navigation separately, upload statuses and response loss after a real commit, real submit timeout plus status-only recovery, bankbook native File retry, original PDF, generic dev/preview and both fresh own ONNX applicant-to-officer flows. A Playwright route.fetch replay may produce an empty multipart file for a reused File; verify with native XHR before diagnosing a service defect. Calendar focus return is asynchronous: wait for the previous picker to close and restore focus before opening another picker in a keyboard harness. Preserve failed attempts and explain successful reruns.

Nine viewport checks and actual chrome.tabs.setZoom at 200/400% are separate from real devices, assistive technology and WCAG certification. Document untested areas honestly.

## Policy adapters and moving baselines

Savings public document states are UPLOADED/REUPLOAD_REQUIRED; youth retains PASS/FAIL/NEEDS_REVIEW. UI contracts must map these without changing backend strings. SQLite document IDs can be reused after slot replacement/deletion. An unchanged ID is never proof that a timed-out request did not commit. A changed ID is not proof of the local file identity. Native reupload tests compare the stored PDF hash rather than requiring a new integer ID.

When a status recheck temporarily makes its card inert, a later confirmation dialog cannot rely on the current activeElement for focus return: specify the actual retry trigger explicitly. Test forward and reverse Tab, Escape and focus return after both successful and unsuccessful rechecks.

If a reference service main advances during work, keep the tested base, record the new SHA/change lineage, and rerun relevant safety gates on a separate clean clone. Do not normalize a failing legacy test into PASS or change backend code to fit a frontend phase. Report intentionally added response fields and strict projection equality failures separately from stored administrative decisions.
