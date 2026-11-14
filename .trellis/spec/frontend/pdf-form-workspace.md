# Applicant PDF Workspace

## Scope and ownership

`demo/frontend/src/forms/PdfFormsWorkspace.tsx` serves the double-savings applicant in an inline document panel. Employment-package frontend forms and the alternative viewer shell were removed from this repository. The shared backend form APIs, templates and coordinate maps remain unchanged.

`ApplyFlow` owns the controlled `form1`, `answers`, `consent`, and `form5` values. A document selection or edit/preview change must not reset those values. Keep applicant data out of navigation URLs, as specified in [state management](./state-management.md).

## Original document contract

- Render the existing form-page image endpoint with the existing layout fields and masks. Scale the PDF background, masks, inputs, check hit areas, and page height using the same `pageWidth / pageSize.width` ratio. A narrow viewport may scroll the document; do not reflow its cells into a replacement form.
- Reuse the existing field renderer and validation helpers for the savings workspace. Updating the surrounding layout is not a reason to edit templates or coordinate maps.
- Public form numbers/order come from the API/layout `public_form`, backed by `demo/form_numbers.py`. Internal `서식1` is public form 2; internal `서식2` is public form 1. Explicitly sort the savings display list by the same public metadata used for labels, then initialize the active document from that ordered list; response order alone is not a guarantee. Do not sort internal identifiers or duplicate the mapping client-side. Use a stable fallback after known public forms if metadata is absent.

## Saving before transitions

The component's existing boundary is:

```typescript
onFlush: () => Promise<void>
```

Flush before switching documents or requesting a written preview. Ordinary field patches do not persist every consent: `ApplyFlow` posts the selected consents and signature metadata in `onFlush`. Removing a modal's close action must not remove this persistence step.

| Condition | Required behavior |
| --- | --- |
| Current form incomplete | Allow document navigation; validate required submission inputs at the upload/submit boundary |
| Flush pending | Prevent conflicting transitions and edits to the outgoing snapshot |
| Flush rejects | Keep the current document and values, display the error, allow retry |
| Application/program changes or component unmounts | Ignore stale asynchronous UI completions |
| Read-only or paper-submission mode | Preserve existing editing restrictions and payload rules |

For example, selecting public form 4 from public form 1 must save the existing values before changing the selected document. Do not clear `active` or navigate in a `finally` block: that would also navigate after a failed save.

## Signature dialog lifecycle

Form 5's signature portal remains a dialog above the inline PDF. It must own its Escape handling, body-scroll lock/cleanup, keyboard focus containment, and focus return to the signature trigger. Those effects previously came partly from the parent viewer modal and cannot be assumed after removing that modal. Preserve drawing, image-upload validation, clearing, confirmation, and signature-mode behavior.

## Compact workspace chrome

Savings step 2 uses the application title/compact step strip above a document heading in the panel; do not restore a second workspace heading/subtitle or an always-reserved save-guidance row. Keep downloads in the document actions, including read-only and paper modes. The selected original PDF remains in the existing independently scrolling viewport, with a viewport-based height and the same coordinate scale. Changing the surrounding spacing must not change the PDF renderer. The shared top-bar application controls are owned by `ApplyFlow` through a portal as specified in [state management](./state-management.md).

The stage strip uses a connected horizontal rail with circular markers and captions/names/statuses below. Keep current/passed/upcoming stages distinct through explicit status text plus a marker shape: a filled check for complete, a ring with a dot for current, a number for waiting. Current styling and `aria-current` take precedence when a stage is also complete. A stage before the restored current stage is visually passed even if child-reported upload counts have not loaded yet; do not change actual upload completion or navigation/gating rules to implement this presentation. Preserve counts when available; they carry a noun (`서식 3 / 5`, `서류 2 / 5`). Stages that cannot be navigated render as text, not as dead buttons. Keep the track continuous and labels readable at narrow widths, wrapping text rather than overlapping it.

The title and the stage strip sit in one full-width head band that is identical on every stage: title on the first row, strip on the second at shell width. Step 2 no longer places the title in a sidebar-width column beside the strip, and the page CSS no longer shares sidebar-width/gap variables with the workspace (`.pdf-forms` defines its own). Sidebar status is icon plus text: draft text remains accent/heavier than neutral empty text, complete uses the success icon; no pill badges. The active item has a tinted background, a left bar and `aria-current`.

Applicant chrome reads the tokens and component classes in [Applicant UI Foundation](./applicant-ui-foundation.md); backend and engine behavior stay unchanged. Do not change the legacy `--brand` family in `index.css`, document fonts, PDF field coordinates or assets to restyle navigation. Keep primary save/continue actions distinguishable from secondary preview/save-file and quiet reset actions. Preserve the save-file menu's positioned header stacking context and right-edge anchoring when changing panel spacing or corners; it closes on Escape, outside click, form switch and dialog open.

Missing required fields on the sheet are the one sheet colour state that changes with interaction: a calm blue outline/fill by default, and the red state only under `.pdf-forms--show-errors`, set per form after the applicant presses save or continue (or leaves a started form) with fields missing. Geometry, sizes and fonts of the fields do not change between the two states. The continue action is never disabled for incompleteness: pressing it while forms are incomplete lists each incomplete form with its remaining count, and each entry switches through the normal flush-first path. The gating rule itself is unchanged.

The application title is an `h1` at 24px bold in the head band on every stage. Do not add per-stage or per-breakpoint title size overrides.

Stage captions are centred under their markers on every stage. Narrow screens may wrap the name and drop the count to its own line; never truncate or overlap.

## Three-step submission and reupload guidance

The applicant flow has identity, forms, and upload/submission steps. Legacy `/apply/final` and `from=final` normalize to upload. Keep the preparation API `/final-check`; remove a separate final-confirmation screen. Internal eligibility results do not gate self-check navigation or display in identity/upload/MyPage; preserve answer completion and required consent/input checks.

`DocumentUpload` requests checklist and readiness together, invalidates readiness before mutations, and ignores stale generations. Document uploads go through a client queue with exactly one request in flight while the rest of the page stays usable; see [Document Upload Queue](./upload-queue.md). Work-type change, leftover delete and submit remain serialized behind the page-wide lock, and conflicting parent navigation is blocked while the queue or a mutation is active. Flush form saves before leaving forms and recheck preparation before submit; only the server's fresh checks authorize submission. Submission passes through a confirmation dialog because it cannot be undone.

Only the ten public reupload codes at FAIL severity appear in the grouped dialog; omitted historical severity retains FAIL semantics. UPLOADED means upload complete, not eligibility approval. Never display raw internal findings or confidence. The fixed guidance uses public checklist labels/periods and agency home-page links; do not interpolate another person's identity or guessed dates/page numbers.

The shared Modal uses a body portal with preserved sibling inert/scroll states, title focus, Tab/Shift+Tab containment, Escape, labelled title/short description and focus restoration. Reason and fix for a rejected document are also shown inline in that document's card, with a line stating it is an automatic check and the programme contact. The grouped dialog opens automatically only when the queue is idle and a rejected document/code pair has not been shown before in this tab; it does not reopen on remount or refresh, and its trigger button always reopens it. Reupload actions focus the actual target upload/date control. Keep all issue documents/reasons in one dialog and update the list without stacking duplicate dialogs.

## Verification

Run frontend lint and build. Check direct nonsequential form navigation, consent persistence, save failures, stale transitions, every original field type, all PDF pages, preview/edit/reset, paper mode, and completion gating. Verify background/overlay alignment after resizing and narrow-screen scrolling, plus signature dialog keyboard/pointer workflows. Continue running preserved backend officer/employment-package regression scenarios; there is no employment-package frontend modal to check. Static checks alone do not establish visual or interaction correctness; record unavailable browser checks explicitly.
