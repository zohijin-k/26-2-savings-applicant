# Step 2 (서식 작성) — read-only findings

Nothing was run in a browser; behaviour is read from code and contrast ratios are computed. No files were changed.

Abbreviations (all under `/Users/zohijin/Desktop/26-2-savings-applicant/`):
- `W` = `demo/frontend/src/forms/PdfFormsWorkspace.tsx`
- `C` = `demo/frontend/src/forms/pdf-forms-workspace.css`
- `AF` = `demo/frontend/src/pages/applicant/ApplyFlow.tsx`
- Specs: `.trellis/spec/frontend/pdf-form-workspace.md`, `.trellis/spec/frontend/state-management.md`

## 1. How step 2 works

**Layout**
- Grid `var(--forms-sidebar-width) minmax(0,1fr)`: 244px sidebar + 20px gap, 218px/16px at ≤1000px (C:10, `apply-flow.css`:21-22, 97).
- Sidebar is sticky: "서식 목록", `완료 / 전체`, one button per form (public number, status, title).
- Panel order: header (h2 `서식N 제목`, state text, actions) → optional "작성 방식" row → page toolbar `◀ 1 / N쪽 ▶` → inner scroll viewport `height: calc(100dvh - 270px); min-height: 360px; max-height: 1000px` (C:51) → for 서식1 only, a "기간 산정에 쓰는 날짜" strip.
- Below the panel: `.flow__actions` with "서식 목록" (only does `window.scrollTo({top:0})`, W:897) and "서류 업로드로".
- At ≤800px the sidebar becomes horizontally scrolling 204px tabs (C:65-75).
- One page is shown at a time; page change does not reset scroll (W:763-765).

**Overlay**
- Background is an `<img>` from `/forms/{formNo}/pages/{n}.png?preview=…&v={previewKey}` (W:592-594), filling `.pdf-form__page`.
- `pageWidth = clamp(620, viewport.clientWidth − 28, 794)` and `scale = pageWidth / pageSize.width` (W:328, 337-338).
- Edit mode adds `.pdf-form__overlay`: white masks, then controls at `box × scale` (W:598-604).
- Text font is `min(12, max(8, size×scale))`, shrinking to 7px for long values (W:700-701).
- Checks are an invisible `appearance:none` input plus a navy SVG mark; self-check uses `radio_text` labels; the signature is a transparent button.

**Save model (hybrid, undisclosed to the user)**
- `form1`, `answers` and `form5` PATCH on every change through a serial queue (AF:213-218, 318-322, 429-431).
- Consents for 서식3·4 are local state only (`onConsent={setConsent}`, AF:430). They persist only in `flushForms` (AF:324-349).
- Flush runs on 저장, 미리보기, form switch, 서류 업로드로, 마이페이지 and the stepper.
- There is no `beforeunload` or `pagehide` handler anywhere in `src`.

**Preview and read-only**
- 미리보기 flushes, then swaps to a server-rendered PNG (`preview=true`) with no overlay; "수정하기" returns to edit.
- `readOnly` (submitted) forces preview and hides edit actions; download stays.

**Signature (서식5)**
- The sign button opens a body-portal dialog (W:903-936) with its own Escape handling, Tab trap, body scroll lock and focus return (W:222-263).
- "그리기" uses `SignaturePad` at 420×210; every stroke end calls `onForm5`, which PATCHes the full PNG data URL.
- "서명 파일 업로드" accepts JPG/PNG up to 10MB and uploads immediately.
- Closing by ×, overlay click or Escape keeps the signature; there is no cancel.
- Mode switch and reset use `window.confirm`.

**Completion**
- `requiredKeys` (W:98-109) plus layout `requirements`: 서식2 has 8 answers, 서식1 has 15 keys, 서식3 has 2, 서식4 has 1, 서식5 has agree + signature.
- Email is regex-checked; `ecContact` must be an 010 number with 11 digits.
- `allReady` enables "서류 업로드로"; the server then rechecks (AF:220-242).

**Download**
- `<details>` "다운로드 ▾" → "PDF 다운로드" (`/forms/files/written.pdf`) and "HWP 다운로드" when available.
- These are plain links with no flush first, so unflushed consents are probably missing from the file; I did not check the backend.

**Strings**
- Sidebar and state: `미작성`, `작성 중`, `작성 중 · 남은 항목 N개`, `작성 완료`, `스캔본 제출 예정`, `스캔본 제출`, `미리보기`, `불러오는 중`.
- Actions: `수정하기`, `미리보기`, `다시 작성`, `저장`, `이전 쪽`, `다음 쪽`.
- Status: `저장 중…`, `작성 내용을 저장했습니다.`, `초기화한 내용을 저장했습니다.`, `서명을 저장하고 있습니다…`.
- Loading: `서식을 불러오는 중입니다`, `원본 서식을 준비하고 있습니다…`, `서식을 불러오지 못했습니다`, `페이지를 새로고침해 다시 시도해 주세요.`
- Errors: `필수 칸과 자가진단 문항을 모두 작성해 주세요.`, `이메일 형식으로 입력해 주세요.`, `JPG 또는 PNG 이미지 파일을 올려 주세요.`, `서명 이미지는 10MB 이하로 올려 주세요.`, `공고일(…) 이후 날짜입니다. 기간 보기에 해당하는 칸이 없습니다.`, `자가진단의 모든 문항에 답해 주세요.`, `필수 동의와 서명을 모두 마쳐 주세요.`
- Every error gets the suffix ` 저장 또는 서식 선택을 다시 시도해 주세요.` (W:826).
- Confirms: `작성한 내용과 서명이 모두 지워집니다. 다시 작성할까요?`, `서명 방식을 바꾸면 현재 서명이 지워집니다. 바꾸시겠어요?`, `온라인으로 작성한 내용은 제출되지 않습니다. 스캔본 제출로 바꾸시겠어요?`, `올린 스캔본은 제출되지 않습니다. 온라인 작성으로 바꾸시겠어요?`
- Paper mode: `작성 방식`, `온라인 작성`, `스캔본 제출`, `이 화면에서 바로 작성하고 서명합니다.`, `출력해 손으로 쓰고 서명한 뒤 올립니다. 휴대폰 사진도 됩니다.`, `스캔본으로 제출하는 서식입니다`.
- Signature dialog: `서명하기`, `그리기`, `서명 파일 업로드`, `여기에 서명하세요`, `파일 선택`, `다른 파일 선택`, `지우기`, `확인`, `닫기`.

## 2. Binding contracts

**MUST**
- Render the existing page-image endpoint with the existing layout fields and masks, scaling background, masks, inputs, hit areas and page height by the one `pageWidth / pageSize.width` ratio.
- Let a narrow viewport scroll the document.
- Reuse the existing field renderer and validation helpers.
- Take numbering and order from `public_form` (internal 서식1 is public 2, internal 서식2 is public 1), sort explicitly, and initialise `active` from that list (W:194-212).
- Call `onFlush` before a document switch or preview; block conflicting transitions while it is pending; on rejection keep the document and values, show the error and allow retry; ignore stale completions.
- Allow navigation away from an incomplete form.
- Keep the signature dialog's own Escape, scroll lock, focus trap and focus return, plus draw, upload validation, clear, confirm and mode behaviour.
- Keep downloads in the document actions, including read-only and paper modes.
- Keep the independently scrolling viewport with viewport-based height.
- Keep primary (save/continue), secondary (preview/download) and quiet (reset) actions distinguishable.
- Keep the download menu's stacking context and right-edge anchoring (C:33, 45-47).
- Keep the stage strip as a connected line with circular markers, explicit status text, current ring/dot and completed checks, with counts preserved; in step 2 it spans the PDF column using the shared sidebar/gap variables.
- Keep `.flow__head h1` at 22px.
- Keep `ApplyFlow` as owner of form values and of the top-bar portal; keep the application ID in `sessionStorage` under `applicant.activeApplicationId`.

**MUST NOT**
- Reflow cells into a replacement form, or edit templates or coordinate maps.
- Duplicate the number mapping client-side or sort internal IDs.
- Navigate in a `finally` block.
- Reset values on a document or mode change.
- Restore a second workspace heading/subtitle or an always-reserved save-guidance row.
- Use per-stage cards or underline-only stage labels, or restore the 700px cap.
- Add badges to sidebar status (draft text stays accent and heavier than neutral empty text).
- Change global `--brand`, document fonts, PDF field colours/coordinates or assets.
- Put applicant data in URLs or a shell store.
- Change gating or navigation rules for presentation reasons.

A redesign that wants status chips, a reserved save row or recoloured fields needs a spec update first.

## 3. Complaint risks, ranked

1. **Disabled CTA with no reason.** "서류 업로드로" is `disabled={!allReady…}` (W:898), so the explanatory error in `submitWorkspace` (W:585-588) is unreachable.
2. **No path to what is missing.** The remaining count appears only as 11px `#66758b` text in the panel head; the sidebar collapses draft to "작성 중" (W:851); there is no jump to the next missing field or page.
3. **Everything is red from first open.** Required-empty fields get `outline: 2px solid #c33` and choice groups get `border: 1px solid #c33` immediately (W:605, 708, 794; C:133, 149).
4. **Silent dead clicks.** The 거주기간/근무기간/월 납입 checks are `disabled` with no visual cue (W:612, 647). Their real inputs sit below the scroll viewport in `.pdf-form__extra` (W:805-819).
5. **Lost work.** 서식3·4 choices vanish on refresh or tab close before a flush, and there is no unload guard.
6. **Unclear save state.** Autosave is never indicated. The notice is 11px and disappears on the next keystroke (W:181). A failed autosave error persists after a successful 저장, because `runSavedAction` clears only `localError`.
7. **Raw errors.** Text such as `PATCH /api/applications/12 실패 (500)` (`api.ts`:242) is shown with the retry suffix. The suffix also produces nonsense like "JPG 또는 PNG 이미지 파일을 올려 주세요. 저장 또는 서식 선택을 다시 시도해 주세요."
8. **No zoom and tiny text.** The page is capped at 794px and input text at 12px (down to 7px). A zoom control would touch the renderer and needs an explicit decision.
9. **Nested scrolling.** Page scroll plus the inner viewport; page change keeps the old scroll offset; horizontal scroll appears below about 648px of viewport width.
10. **Signature UX.** The trigger is invisible once signed (`color: transparent`, no border, C:150-152). First focus lands on "닫기". There is no cancel or undo. The pad remounts after the first stroke (`key`, W:916). Width is computed once from `window.innerWidth`.
11. **Focus loss.** `<fieldset disabled={saving}>` (W:761) blurs the active input on every flush.
12. **Accessibility.** Single-choice groups are announced as checkboxes. Labels come from `field.anchor || field.label || '입력 항목'`. The signature dialog does not set siblings inert. Tab order is sorted by y0 then x0 (W:799), which can interleave rows that are slightly offset.
13. **Native `window.confirm`** in four places.

## 4. Visual critique

**What looks crude**
- **Four button systems.**
  - Base `.btn` (`1px solid #888`, navy `#1f3864` primary) applies in the signature dialog, because the portal sits outside `.flow`.
  - `.flow .btn` is 42px/14px.
  - Panel actions are 32px/12px with radius 7px and a `#315dcc` primary (C:38-41).
  - Toolbar buttons are 26px/11px with radius 5px and `◀ ▶` glyphs (C:50).
- **Colour and type sprawl.** There are 40 distinct hex colours in C:1-85, mostly near-identical blue-greys. 11px is used seven times. Radii of 5, 6, 7, 8, 9, 10, 12 and 18px all appear.
- **Low contrast.**
  - `#8591a2` on `#f5f7fa` is 2.98:1 (sidebar count).
  - `#77859a` and `#7a889b` hints are about 3.6:1.
  - `#758298` for "다시 작성" is 3.89:1.
  - Disabled `#9aa5b5` on `#f4f6f9` is 2.30:1.
  - The signature placeholder `#a3a8b0` is 2.39:1.
- **Weak states.** Active is a 2px left bar (C:19). "작성 완료" `#596e85` and "미작성" `#606e82` are indistinguishable, with no icon.
- **Hacks.** The download menu uses hard-coded offsets `top: calc(100% + 4px)` and `+ 44px` (C:46-47) and does not close on outside click or Escape. The paper-mode icon is a `↥` glyph.
- **Mixed focus styles.** `.flow .btn:focus-visible` uses only a `#eaf0fb` box-shadow; PDF fields use `--brand`; chrome uses `--workspace-accent`.
- **Dead CSS.** C:2-3, 5, 86-101, 109-113, 116, 158-160 and 163-169 have no references in the workspace or `FormSheet.tsx`. Most of `form-sheet.css` (497 lines) is unused in step 2; only `DateTriple` is imported elsewhere.

**Safe to restyle**
- C:8-85 chrome: sidebar, panel head, actions, toolbar, paper options, loading and paper state.
- `.pdf-forms__error` (C:114) and `.pdf-form__extra` (C:154-157).
- Signature dialog chrome (C:172-198), keeping its lifecycle.
- `.flow__actions`.

**Unsafe to restyle**
- C:117-153: `.pdf-form__page`, `__background`, `__overlay`, `__mask`, `__text`, `__check*`, `__radio*`, `__group-missing`, `__sign`, `__auto-date`, `__email-hint`, and the `@font-face` rules.
- W:335-338 and W:596-803.
- `.pdf-form__scroll` padding of 14px is coupled to the JS constant 28 (C:117, W:328).

## 5. Loading states

**Present today**
- Initial load is all-or-nothing: forms, checklist and all layouts must arrive before anything renders (W:189-191). Meanwhile the sidebar is empty showing "0 / 0" and the body is plain text in a 430px box. There is no skeleton, spinner or retry button.
- Saving shows the "저장 중…" row, conditionally rendered (W:878), which causes a layout shift; `cursor: wait` on nav items; `aria-busy`.
- The only skeleton and `useDelayedFlag` (150ms) live in `PdfPages.tsx`, which step 2 does not use.

**Where perceived performance is poor**
- The page PNG `<img>` has no `onLoad`/`onError`, placeholder or preload. Inputs float on a blank white sheet until it arrives.
- Each form switch waits for the save queue, a PATCH and a consents POST before the selection moves, with no pending mark on the clicked item.
- Preview adds the same flush plus a server render with no indicator after "저장 중…"; I expect the old background to linger until the new image loads, but did not observe it.
- `v=previewKey` also busts the cache for the static edit background after every preview (W:593).
- Per-keystroke PATCHes and per-stroke signature data-URL PATCHes lengthen the queue that every flush awaits.
