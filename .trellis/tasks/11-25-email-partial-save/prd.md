# Keep unfinished emails out of incremental form saves

## Goal

Typing an email address in the applicant forms must not produce failed saves. Incremental (per-edit) saves send only an email the backend can accept, while full flushes keep sending the typed value so the backend still validates it.

## Background

- On 2026-11-25 a tester filling the savings forms on the temporary demo caused 26 HTTP 400 responses in ten minutes; the address they finally saved accounts for 15 of them when typed once.
- `demo/frontend/src/forms/PdfFormsWorkspace.tsx` `setText` calls `onForm1` on every keystroke, and `demo/frontend/src/pages/applicant/ApplyFlow.tsx` `onForm1` immediately PATCHes the whole `form1`.
- The backend (`demo/backend/api/applications.py` `_normalize_form_values`, owned by 26-2-savings-officer) rejects any nonempty malformed email with 400, so every keystroke before the address is complete fails, `reportSaveError` shows a save error, and the save state stays `failed` until a full flush.
- The sheet already shows the inline hint "이메일 형식으로 입력해 주세요." while the address is malformed.
- The same pattern exists in 26-2-youth (`ApplyFlow`, `GenericProgramFlow`); that repository has its own task with the same slug.

## Requirements

- R1: An incremental `form1` save never carries a nonempty email that fails the shared email format. While the typed address is unfinished, it carries the last email that could be saved (empty or a previously valid address), so other fields keep saving and a stored address is not wiped.
- R2: Full flushes (`persistForms` before document changes, previews, leaving and continuing) keep sending the typed `form1`, so a malformed email is still rejected by the backend and reported as before.
- R3: The restored draft's email seeds the "last savable" value, so editing a saved address does not clear it on the server mid-edit.
- R4: Keep the on-sheet hint, required-field rules, error copy, other fields' save behavior and the backend API unchanged.

## Acceptance Criteria

- [x] AC1 (R1): Simulating keystrokes of a valid address yields no incremental payload whose email the shared validator rejects, and the final payload carries the full address.
- [x] AC2 (R1, R3): Shortening a saved valid address into an invalid one keeps sending the last valid value; clearing the field sends an empty email.
- [x] AC3 (R2): `persistForms` still PATCHes the typed `form1` value.
- [x] AC4 (R4): `npx tsc -b`, `npx oxlint`, `npx vite build`, `node --test tests/*.test.ts` and `node src/forms/phone.test.ts` pass.

## Verification (2026-11-25)

- API replay on a temporary database with 26-2-savings-officer `b0148ff` (the deployed backend): typing a 26-character synthetic address one character at a time returned 400 22 times as before, and 0 times with the savable-email rule. A full save with an unfinished address still returned 400.
- `tests/email-save.test.ts` covers AC1 and AC2. AC3 holds because `persistForms` is unchanged and still sends `form1`.
- `npx tsc -b` passed; `npx oxlint` reported 0 errors and the existing `StatusBadge.tsx` warning; `npx vite build` passed; `node --test tests/*.test.ts` passed 101 of 101; `node src/forms/phone.test.ts` passed.
- Not run: a real-browser check (no browser on this VM) and backend suites (backend unchanged).

## Verification on the new main (2026-11-26)

- main advanced to `ad60ce2`. PR #24 changed lines next to this fix in `ApplyFlow.tsx`, so `git apply` without context fallback fails, but a 3-way merge of this change has no conflicts.
- In the merged result, both incremental `form1` saves still go through `withSavableEmail`. The other screens PR #24 changed do not save `form1`.
- These checks passed on the merged result:
  - `npx tsc -b`
  - `npx oxlint` (only the existing `StatusBadge.tsx` warning)
  - `npx vite build`
  - `node --test tests/*.test.ts` (101 of 101)
  - `node src/forms/phone.test.ts`

## Out of Scope

- Backend validation or API changes, and debouncing or batching incremental saves.
- Other 400 sources observed on 2026-11-25 (identity, period dates, consents); no per-request log exists to attribute the remaining 11 responses.

## Notes

- Lightweight task: PRD-only. The user asked on 2026-11-25 to implement this fix in both savings applicant and youth, with Trellis tasks under developer `hcw889`.
