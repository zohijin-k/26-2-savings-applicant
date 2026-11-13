# State Management

> How state is managed in this project.

---

## Overview

<!--
Document your project's state management conventions here.

Questions to answer:
- What state management solution do you use?
- How is local vs global state decided?
- How do you handle server state?
- What are the patterns for derived state?
-->

(To be filled by the team)

---

## State Categories

This repository serves only the double-savings applicant. `App` mounts one `ApplyFlow`; there are no role tabs, officer screens, program picker, or employment-package stage. Entry and legacy role/program URLs normalize to `/apply/identity`. Preserve unrelated query options such as `debug` while removing obsolete navigation parameters.

Applicant paths contain only the stage. Keep the active application ID in tab-scoped `sessionStorage` under `applicant.activeApplicationId`; never restore from numeric path segments or an `application` query parameter. Restore only a saved application whose `program_code` is `double_savings`. Missing/invalid/inaccessible state or another program starts a new savings draft; a transient fetch failure displays retry and must not discard an accessible saved draft. Refresh and stage history restore the same application. An explicit Home action starts a fresh savings draft; it must not delete the previous application or prevent a submitted applicant from starting again.

Initialization uses the existing `/api/programs`, application creation/read, consents and status APIs. Share an in-flight creation POST across StrictMode effect replay and history remounts. Keep a successfully created row in memory before follow-up reads so retry does not create another draft, including when session storage is disabled. A stale POST must not overwrite a newer tab selection. Apply state only while its effect is active. Preserve existing self-check eligibility, consent and document gates, including the four-step final confirmation; changing those policies belongs to a separate approved task.

The top bar displays applicant controls through a React portal from `ApplyFlow`. `App` owns only the DOM host; `ApplyFlow` owns the application number, stage and My Page handler. Remounting removes the old portal. Do not duplicate these values in a shell store or put applicant identity/form data in URLs. Hiding IDs does not replace backend access checks.

The backend remains shared and unchanged. Remove frontend clients only when no savings path uses them. Generic supplement deadlines/targets remain supported because the preserved criteria API can enable supplement policy for a savings application even though its default is disabled.

### Verification cases

- Root under StrictMode: one savings creation, identity rendered, four stages retained.
- Same-tab identity/forms/upload/final/My Page and history: same savings ID, no creation.
- Legacy role/program paths: identity, obsolete navigation parameters removed.
- Saved foreign/missing application: fresh savings ID; foreign row unchanged.
- Transient saved GET or post-create status failure: retry without a duplicate POST.
- Storage disabled and stale pending requests: preserve current application selection.
- Explicit Home after an existing/submitted application: new identity draft; previous row retained.
- Self-check rejection and missing consent still prevent progression; completed consent still leads through upload and final confirmation.
- Real browser rendering remains a separate check; a renderer harness with stubbed child views establishes parent lifecycle behavior only.

---

## When to Use Global State

<!-- Criteria for promoting state to global -->

(To be filled by the team)

---

## Server State

<!-- How server data is cached and synchronized -->

(To be filled by the team)

---

## Common Mistakes

<!-- State management mistakes your team has made -->

(To be filled by the team)
