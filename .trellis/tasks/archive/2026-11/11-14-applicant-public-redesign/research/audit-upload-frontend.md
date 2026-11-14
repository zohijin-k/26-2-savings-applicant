# Step 3 (서류 업로드 및 제출) — read-only findings

All paths are under `/Users/zohijin/Desktop/26-2-savings-applicant/demo/`. `DU` = `frontend/src/pages/applicant/DocumentUpload.tsx`, `CSS` = `frontend/src/pages/applicant/document-upload.css`. Nothing was run; every finding is from reading code.

## 1. What the citizen sees, in order

1. **Initial load** (DU:372-390, 498-508): `GET required-documents` and `GET final-check` in parallel. After 150 ms (`useDelayedFlag`) five shimmer cards appear, with sr-only "불러오는 중". A load failure shows the raw error and a "다시 확인" button (DU:497).
2. **근로유형** (DU:518-571): h3 "근로유형", hint "근로확인서류는 5종 중 1종만 내면 됩니다. 아래에서 고르면 본인에게 필요한 서류만 남습니다.", legend "근로유형 선택".
   - Radios come from `work_categories`. Extra controls: checkbox "행정기관 기간제 근로자입니다 (근로계약서 사본 추가)" and select "근무 사업장 수" (1개/2개/3개).
   - Changing it after proof documents exist triggers a native `window.confirm('올리신 근로확인서류가 빠집니다. 바꾸시겠어요?')` (DU:444). It then deletes those documents one by one, sends `PUT doc-context` (response discarded), and refreshes.
   - The radio is controlled by server state (`checked={context.work_category === category}`), so the click does not visibly register until the refresh returns.
3. **Progress** (DU:573-586): "제출 서류 **n** / m", optional "근로유형을 고르면 서류가 1종 추가됩니다.", and a 6px bar.
4. **Slot card** (DU:245-347):
   - Head: label, "필수" chip, an ⓘ button that opens a requirements modal (headings "인정되는 서류 / 반드시 있어야 하는 표기 / 안내 / 대체 가능 / 자주 틀리는 부분"), and the link "{issuer}에서 발급받기 ↗".
   - Criteria line: `issue_rule_label`.
   - Action panel: optional date triple "서류에 적힌 {발급일}", gate text "{발급일}을 입력하면 파일을 올릴 수 있습니다.", and date warnings "{발급일}이 오늘 이후입니다. 다시 확인해 주세요." / "이 사업은 YYYY.MM.DD 이후 {발급일}만 인정합니다. 서류를 확인해 주세요."
   - Button "파일 업로드" (or "새 파일로 교체"), which clicks a hidden `<input type=file accept=".pdf,.jpg,.jpeg,.png">`. One file per slot, no `multiple`, no drag-and-drop.
5. **Result** (DU:91-147): badge "✓ 업로드 완료" or "↻ 다시 올려 주세요" (`components/StatusBadge.tsx`).
   - A 56×76 thumbnail, re-downloaded from `/api/files/{id}`. The file name. A `<dl>` of extracted fields (발급일, 성명, 응시일, 결제금액, 동의여부, 서명잉크확인).
   - On failure only: "읽은 서류 종류: {detected_doc_type}".
   - Buttons "미리보기" and "다시 올리기".
   - On failure, the card shows only the guidance **title** (DU:142-144). The reason and fix exist only in the modal.
6. **Reupload modal** (DU:667-687) opens automatically after any new failure, and again on every mount or refresh while failures exist (DU:399-408).
   - Title "다시 올려야 할 서류를 확인해 주세요". Description "아래 서류의 안내를 확인하고 파일을 다시 올려 주세요. 모든 재업로드 항목이 해결되면 제출할 수 있습니다."
   - Per document: "발급일 안내: …", then title/reason/fix from `reupload-guidance.ts`, "{issuer} 바로가기 (새 창)", "{label} 다시 올리기", and "닫기".
   - It can be reopened with "다시 올릴 서류와 해결 방법 보기 (N종)" (DU:646).
7. **Merged uploads**: `uploadMerged` (`frontend/src/api.ts:432`) is never called, so the UI cannot start one. Only the leftover section "배정되지 않은 페이지" renders, with "{file} (n쪽) — {type | 서류 종류 미판별}" and "삭제" (DU:622-642).
8. **Delete and replace**: slot documents have no delete. "다시 올리기" sets `editingSlot`, prefills the date, and scrolls to and focuses the upload button (DU:456-466). Replace mode has no cancel.
9. **Other section**: "업로드하지 않아도 되는 서류" lists "{label} — {fulfilled_by}(으)로 대체되었습니다." and, for 서식5, "스캔본을 제출합니다." or "온라인 작성 동의와 서명을 제출합니다."
10. **Submit** (DU:647-666): h3 "신청 제출", "제출 후에는 신청 내용을 수정할 수 없습니다. 작성한 내용과 올린 파일을 확인해 주세요."
    - Blockers: "제출 전에 채워 주세요 (N건)" with "수정하기" per row.
    - Pending text: "제출에 필요한 항목을 확인하고 있습니다. 확인이 끝나면 제출할 수 있습니다."
    - Buttons "서식 수정" and "신청 제출" / "제출 중…" / "이미 제출된 신청입니다". After an error: "제출 준비 다시 확인".
    - **There is no confirmation dialog before the irreversible submit** (DU:475-495).
11. **Post-submit** (`frontend/src/pages/applicant/ApplyFlow.tsx:473-486`): a green `.flow-block--ok` box.
    - "신청이 접수되었습니다.", "신청번호 …", then three steps: "읍·면·동에서 구비서류 완비 여부를 확인합니다." / "자격요건(소득·거주·근로·연령)과 제외대상을 확인합니다." / "시군이 심사표를 취합해 도에 제출하고, 도·청년허브센터가 최종 선정합니다."
    - Notice "평가결과(심사 점수)는 공개하지 않습니다. 최종 선정 여부만 결과발표 시 안내됩니다.", the forms bulk menu, and "마이페이지".
    - `submitted_at` is not shown, there is no 접수증, and focus is not moved to the confirmation.
    - On reload the message becomes "신청이 완료되었습니다." with an empty step list (`ApplyFlow.tsx:177`).

## 2. Single-upload timeline

| t | Code | State |
|---|---|---|
| File chosen | DU:291-298 | `busyFileName` set (local to `SlotCard`), then `onPick` → `upload` → `runMutation(slot_key)` |
| +0 | DU:416-422 | `mutation.current=true` (a second call returns silently), `setReadiness(null)`, `setBusySlot(slot)`, `setError('')` |
| +0 | DU:515-516, 411 | `.dupload[aria-busy]`. The wrapper `<div inert>` covers the context, **every slot**, and the lists. Submit and "서식 수정" are disabled. `onBusyChange(true)` disables the stepper and 마이페이지 (`ApplyFlow.tsx:356, 367`) |
| +0 | DU:284 | The action panel unmounts, so focus drops to `<body>` and the card collapses for 150 ms |
| +0 | DU:645 | An unstyled `<p role="status">서류를 올리고 확인하고 있습니다…</p>` appears below all slots, usually off-screen |
| +150 ms | DU:267-272, 322-342 | Badge with a 12px spinner (800 ms) and "읽는 중…". Skeleton row: shimmer thumbnail, the real file name, "발급일" plus a 7em shimmer, and disabled "미리보기" / "다시 올리기" |
| Server | `api.ts:418-429`, `backend/api/documents.py:311, 325` | One `fetch` POST covers upload, OCR and assessment. `assess_upload` runs synchronously inside an `async def` |
| Response | DU:452 | **The returned `UploadedDocument` is discarded.** `setEditingSlot('')` |
| +2 GETs | DU:425, 374 | `refresh()` re-fetches the checklist and final-check. Only then does the result render |
| End | DU:434-435 | `setBusySlot('')`. A new failure opens the modal on the next tick |

- **Replace path is worse**: the skeleton is gated on `!doc` (DU:322). During a re-upload the card keeps the old red "다시 올려 주세요" badge and the old result. The only feedback is the bottom `<p>`.
- **No optimistic UI, local preview or byte progress.** There is no `AbortController`, timeout, cancel, retry of the same file, or `beforeunload` guard. Worst case is long: the 전북AI adapter defaults to a 60 s timeout (`backend/ocr/jbai.py:47`).
- **The citizen cannot upload a second document while one is being read.** The lock is global and single-flight.
- **Errors** render far from the slot, in the submit section (DU:658), and block submit until "제출 준비 다시 확인" is pressed. The wording is raw:
  - server detail, e.g. "pdf, jpg, png 파일만 올릴 수 있습니다. (올리신 형식: hwp)";
  - "업로드 실패 (500)";
  - "GET /api/applications/3/required-documents 실패 (500)" (`api.ts:242`);
  - the browser's own fetch error string on a network failure.
- **Refresh mid-upload**: the fetch is abandoned. If the server finishes, the document appears after reload; otherwise the slot is empty. Typed dates (`declared`) are lost. The application id (sessionStorage) and the stage (URL) survive.

## 3. Perceived-latency opportunities with the current API

1. **Use the POST response.** Patch `checklist.items[slot].documents` from the returned document at DU:452 and run `refresh()` in the background. This removes two round trips from every result. Blocked only by the discarded return value.
2. **Instant local preview.** Call `URL.createObjectURL(file)` in `onChange` (DU:291) and feed it to `<img>` or `PdfPages` (`url` prop, already used with `maxPages={1}`). Show size and page count. After success keep the blob so `DocumentThumbnail` (DU:52) need not re-download. Blocked: `SlotCard` keeps only `busyFileName`.
3. **Per-slot busy instead of a global lock.** Replace `busySlot: string`, `mutation.current` and the `inert` wrapper (DU:361, 368, 516) with a per-slot map or queue; keep `inert` for the work-context change only. Caveat: the backend handler blocks its event loop during OCR, so parallel POSTs will not finish faster on one worker. A visible queue ("대기 중 → 읽는 중") still lets the citizen keep picking files.
4. **Byte progress and cancel.** `form()` (`api.ts:247`) uses `fetch`. Switching `uploadDocument` to XHR `upload.onprogress` gives a real "올리는 중 n%" and `abort()`.
5. **Staged copy.** "올리는 중" is real with item 4. After `upload.onload`, show "글자 읽는 중 → 내용 확인 중" on an elapsed timer and label it as estimated. At about 10 s add "평소보다 오래 걸리고 있습니다. 창을 닫지 마세요". `elapsed_ms` is already in the response and is unused; it could seed an expected-time hint.
6. **Fix the replace path** (DU:322 `!doc`) and the 150 ms empty gap. Show the skeleton immediately for uploads and keep the delay only for the checklist load.
7. **Client pre-validation** in `onChange`: extension, size, zero-byte, image `naturalWidth` (pre-empts `IMAGE_RESOLUTION_TOO_LOW`), and encrypted PDFs via the `pdfjs.getDocument` password error (pre-empts `UNREADABLE_FILE`). Today only `accept` exists, and there is no size limit on either side (`backend/api/documents.py:311`).
8. **Optimistic radio.** Keep a local pending value at DU:535 so the click registers at once.
9. **Inline results.** Put the reason and fix in the card and stop the automatic modal. The `.dfinding` and `.dfinding__fix` styles already exist and are unused.
10. **Errors in the slot** with "같은 파일로 다시 시도" (keep the `File` in state), and map network or 5xx errors to Korean copy.
11. **Persist** typed dates per application in sessionStorage, and add a `beforeunload` guard while busy.

## 4. Complaint risks, ranked

1. **A false rejection is a dead end.** Any FAIL finding becomes a submit blocker (`backend/api/review.py:138-155`, `can_submit=false`). The screen offers no "담당자 확인 요청", no override and no phone number; `call_center` exists on `Program` but is not shown here. The copy states the machine's judgement as fact and presumes citizen error:
   - "지금 올린 파일은 이 칸에서 요청한 서류와 다른 종류로 확인됐습니다."
   - "서류에서 확인한 신청인 정보가 본인인증 정보와 맞지 않습니다." / "가족이나 다른 사람의 파일을 고르지 않았는지 확인해 주세요."
   - Nothing says "자동 확인 결과". Only one code mentions a 문의처.
2. **No submit confirmation**, although the screen itself says submission cannot be edited.
3. **Whole-page freeze** of up to about 60 s with a 12px spinner, and no feedback at all on re-upload.
4. **Raw technical error strings**, shown far from the slot.
5. **The modal reopens on every visit**, and the card shows only the title. Two wordings exist for one problem: the blocker list uses the server `message` (joined with `\n`, which collapses in a `<span>`), while the card uses the frontend title.
6. **File constraints are not disclosed.** Format, size and scan or photo tips appear only after a failure. `accepted_formats` is unused. The official rule is "pdf 권장".
7. **OCR-unsure is handled well.** `NEEDS_REVIEW` findings are filtered out (`backend/api/common.py:202-211`), so the citizen sees "업로드 완료" and can submit. But "업로드 완료" reads as "passed"; consider "접수됨 · 담당자 확인 예정".
8. **Accessibility.**
   - Live regions are mounted together with their content (DU:268, 645), so they are unreliable, and no result is announced.
   - Focus is lost on upload and not restored on success.
   - The focus ring is `box-shadow: 0 0 0 3px var(--brand-tint)` (#eaf0fb) with `outline: none` (CSS:375-379; `apply-flow.css:196-200`).
   - The ⓘ target is 20×20 and the modal close is 28×28.
   - The progress bar has no `progressbar` role.
   - Status is not colour-only: the badge has an icon and text.
9. **Tone mixes** 해요체 ("보여요", "필요해요", "없어요") with 합쇼체.

## 5. Visual and CSS critique

- **Type is too small and uses fractional sizes.** Body is 14px (`index.css:44`). This screen uses 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 15, 18 and 19px. Criteria, gate and warning text are 12px in `#666`. The card title is only 15px, and the section h3 is 15px against 19px for the submission h3.
- **Two competing accents.** "파일 업로드" is navy `--brand: #1f3864`. "신청 제출" is `--workspace-accent: #315dcc` (`apply-flow.css:215`).
- **Hard-coded colours bypass the tokens**: `#444`, `#555`, `#333`, `#8a8a8a`, `#b45309` (against `--warning: #b8860b`), and `--fail: #c00` (pure alarm red).
- **Boxes inside boxes.** `.dslot` has a 1px border, a 4px left stripe and 12px radius. Inside it sit `.dslot__action` (grey `#fafafa`, 8px radius) and `.dresult__file` (another 1px border). The left-stripe card, the navy-bordered `.dupload__context` (`1px solid var(--brand)` on `#eaf0fb`) and the pill badges add to the clutter.
- **Spacing has no scale**: 16px 18px 16px 16px, 12px 14px, 10px 12px, 14px 16px, 22px; gaps of 6, 8, 10, 12, 16 and 18.
- **Controls are small.** Date inputs are 36px high and 44px wide; the upload button is 38px high while other `.flow .btn` are 42px. The disabled upload is `#8a8a8a` on `#ddd`, about 2.3:1.
- **Unstyled elements**: the busy `<p role="status">` (DU:645), the pending-readiness `<p>` (DU:657), and the reupload trigger button, which floats between the lists and the submit card. `.dfinding__msg` has `margin: 0` and no wrapper, so the red title sits flush under the file box.
- **Dead CSS**, about 150 lines: `.dupload__loading`, `.dupload__mistakes*`, `.dupload__assumptions`, `.dupload__handwritten`, `.dfinding`, `.dfinding__fix`, `.dfinding__link`, `.dresult__meta`, `.dslot__files-menu`, `.dupload__form-preview`, `.dupload__form-page`, and the print block. `dresult__pages--ready` has no rule. The loading styles for this screen live in `frontend/src/components/skeleton.css:71-86`.
- **Layout.** The upload button is pushed right with `margin-left: auto` while the date sits left, which weakens the order "date, then file". There is no drop zone and no always-visible format hint. The glyphs ⓘ ↗ ✓ ↻ ✕ are text characters, not icons. The only breakpoint (560px) changes padding only.
- **Post-submit** is one tinted box with a `<strong>` line: no heading, no receipt layout, no timestamp.
