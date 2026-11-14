# Current-state capture: what the citizen sees today (applicant app, 2026-11-14)

All four requested stages were captured at 1440x900 and 390x844 from one fake application (홍길동 / 1998-06-15 / 010-0000-0000, DS-2026-000006). Tooling: Playwright 1.x driving installed Chrome 157 headless over CDP, scripts in `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/capture-tools`.

Three caveats on the evidence:
- **Mobile shots** are the same tab resized to 390x844 (no touch or DPR emulation); `index.html:5` has `width=device-width`, so the layout is equivalent.
- **Step 3** was reached with `seed_application --application-id 6 --frontend-url http://localhost:5175` after doing step 1 and part of step 2 by hand.
- **Font**: no UI webfont is bundled (`index.css:32` stack starts `'Malgun Gothic'`, which is not installed on this Mac), so the type you see in these captures is a macOS fallback, not what Windows citizens get.

Cleanup: `--clean --application-id 6` deleted 1 application, 11 rows, 10 files. Dev servers still answer 200 on 5175 and 8001. The capture Chrome is stopped. Nothing in the repo was touched by me; `git status` does show untracked `jb.png` and `.trellis/tasks/11-14-applicant-public-redesign/`, which I did not create.

## 1. Files

Directory: `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/` (113 PNGs). Each state `NN-name` has `__desktop.png` and `__mobile.png`; states marked F also have `__desktop-full.png` and `__mobile-full.png` (full page).

| File (absolute, desktop variant) | Screen / state | Viewports |
|---|---|---|
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/01-identity-empty__desktop.png` | Step 1 empty | D, M, F |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/02-identity-validation__desktop.png` | Step 1, phone `011-1234-5678` error, month `13` silently rejected | D, M, F |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/03-identity-signfile-mode__desktop.png` | Step 1, "서명 파일 업로드" tab | D, M |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/04-identity-filled__desktop.png` | Step 1 filled and signed | D, M, F |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/05-forms-workspace-initial__desktop.png` | Step 2 workspace, 서식1 edit mode | D, M, F |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/06-form1-selfcheck-editing__desktop.png` | 서식1 with two answers | D, M, F |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/07-form2-application-edit__desktop.png` | 서식2 edit; panel close-up in `07b-form2-panel-closeup__desktop.png` (same directory) | D, M, F |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/08-form2-preview__desktop.png` | 서식2 미리보기 | D, M, F |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/09-forms-download-menu__desktop.png` | 다운로드 menu open | D, M |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/10-form3-consent-edit__desktop.png` | 서식3 edit | D, M |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/11-form5-edit__desktop.png` | 서식5 edit; sign target in `11b-form5-sign-target__desktop.png` | D, M, F |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/12-signature-modal-empty__desktop.png` | 서명하기 modal empty; `13-signature-modal-signed`, `14-form5-signed` alongside | D, M |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/15-upload-initial-no-worktype__desktop.png` | Step 3, 근로유형 not chosen | D, M, F |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/16-upload-checklist-worktype-chosen__desktop.png` | Step 3 checklist, 직장가입자 | D, M, F |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/17-upload-slot-info-modal__desktop.png` | ⓘ 요건 modal | D, M |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/18-upload-wrongdoc-3-reupload-modal__desktop.png` | Rejected (등본 in 초본 slot): auto modal; `-1-date-entered`, `-2-in-progress-f0`, `-4-result` alongside | D, M |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/19-upload-locked-0-replace-mode__desktop.png` | "다시 올리기" replace mode, then locked-PDF reject (`-3`, `-4`) | D, M |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/20-upload-realocr-png-2-in-progress-f1__desktop.png` | Re-upload in progress, real OCR, frame at 603 ms; mobile in `20-upload-realocr-png-2-in-progress__mobile.png` | D, M |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/21-upload-first-skeleton-DELAYED-2-in-progress-f1__desktop.png` | First upload in progress (skeleton + "읽는 중…"); response held 3.5 s artificially | D, M |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/22-upload-all-done-ready-to-submit__desktop.png` | 5/5 uploaded | D, M, F |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/23-upload-file-preview-modal__desktop.png` | File 미리보기 modal | D, M |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/24-submit-section__desktop.png` | "신청 제출" section | D, M |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/25-submit-complete__desktop.png` | 접수 완료 | D, M, F |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/26-mypage-after-submit__desktop.png` | MyPage after submit | D, M, F |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/27-identity-verified-done-state__desktop.png` | Step 1 "본인인증을 마쳤습니다" | D, M |
| `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/screens/28-forms-readonly-after-submit__desktop.png` | Step 2 read-only after submit; `29-form5-readonly-signed-preview` alongside | D, M, F |

I viewed every desktop shot above and the mobile shots I cite below; the remaining mobile variants were written but not individually inspected.

## 2. Critique per screen

**Global shell and stepper**
- The page looks like an unbranded prototype: a 30px navy square reading "전북" (`app-shell.css:107`), no 전북특별자치도 identity, no footer, no 문의처, no notice of the application period.
- The title appears twice within 60px: header "전북청년 함께 두배적금 신청" and the h1 "전북청년 함께 두배적금 신청".
- Body text is 14px (`index.css:44`) with much chrome at 11–12.5px. On mobile the stepper captions are 10px (`apply-flow.css:109`) and the 신청번호 is 11px.
- Two competing primary blues: `--workspace-accent: #315dcc` (본인인증, 저장, 신청 제출) and `--brand: #1f3864` (새 파일로 교체, the modal's 확인, 마이페이지 on the completion card).
- The stepper is thin grey 20px dots with tiny labels. After submit it contradicts itself: step 2 is shown as the current ring labelled "완료" while step 3 shows a tick (shot 28).
- A 신청번호 is issued on page load. Simply opening the site created draft DS-2026-000006 before anything was typed; drafts 4 and 5 already existed from earlier page loads.

**Step 1 본인인증 (01–04, 27)**
- "데모 화면입니다. 실제 서비스에서는 로그인할 때 휴대폰·간편인증으로 대신합니다." is still on screen (`IdentityCheck.tsx:205-207`).
- Inputs stop at 380px inside a 940px card, leaving the right 55% empty; the signature box is 460px, left-aligned, with its "지우기" button stranded at the box's right edge.
- There is no required marker, no helper text, and no explanation of why the button is disabled. The primary button "본인인증" stays grey at `opacity: 0.5` until every field is valid.
- Only one inline error exists: "010으로 시작하는 휴대폰 번호를 입력해 주세요." Typing month 13 is silently dropped and the field stays empty (verified).
- The 그리기 / 서명 파일 업로드 toggle reads as two floating white pills on grey, not as tabs.
- The verified state's button says "자가진단으로" (`IdentityCheck.tsx:135`) although the next step is called "서식 작성".
- Mobile works with no overflow, but a drawn signature is stretched when the pad width changes (shot 04 mobile).

**Step 2 서식 작성 (05–14, 28–29)**
- The layout changes between steps: step 1 is a 940px centred column, step 2 is a 1160px two-column workspace with the title moved left of the stepper.
- At 900px height only about 620px of an A4 page is visible inside a nested scroller, so there is a scroll within a scroll.
- Fields are 12px inputs overlaid on a scanned form. Tiny boxes shrink text to illegibility: "사업명" is 37x15px and my 20-character entry rendered at about 7px (shot 07b).
- Missing required fields are thin 2px red outlines (`pdf-forms-workspace.css:133`) shown from the first second, before the citizen has typed anything.
- The header has four controls of equal weight (다운로드, 미리보기, 다시 작성, 저장) plus a bottom bar. The bottom-left button "서식 목록" only scrolls to the top. "서류 업로드로" is disabled with no hint of which forms remain.
- The sidebar count showed "0 / 5" even with three forms "작성 중".
- The 다운로드 menu never closes on Escape or outside click (bare `<details>`, `PdfFormsWorkspace.tsx:139`). It stayed open across form switches and sat over the signature modal's backdrop (shots 10–14).
- The 서식5 signature target is a 120x25px box drawn over the printed "(서명 또는 인)". After signing, the signature is an unreadable smudge on top of that text (shots 14, 29).
- The extra block "기간 산정에 쓰는 날짜" uses native date inputs showing "연도. 월. 일.", inconsistent with the 년/월/일 triple used elsewhere.
- Mobile: the form is cut off at the right edge with only an 11px hint, "서식이 화면보다 넓으면 좌우로 스크롤해 주세요.", so it is effectively unusable for filling. The form list becomes a horizontal strip showing 1.5 items with no scroll affordance.

**Step 3 서류 업로드 (15–24)**
- The page is very long: 2,381px on desktop for five slots, 3,291px on mobile. Every empty slot repeats the same grey box with a date triple, a hint, and a disabled "파일 업로드" at bottom right, far from the date fields.
- The 근로유형 box (navy border, `--brand-tint` fill) is the loudest element, yet its helper text is 12.5px grey.
- The "제출 서류 0 / 5" bar counts a rejected file as progress: it read "1 / 5" with the only upload in "다시 올려 주세요" state.
- Dates are raw ISO: "2026-03-03 공고일 이후 발급일".
- Blocker copy is mechanical: "주민등록초본 '주민등록초본'을(를) 아직 올리지 않았습니다." with a "수정하기" button on each row.
- The rejected slot itself is decent (red left band, pill "다시 올려 주세요", bold red one-liner). The auto-opened modal is wordy, and its link "정부24 바로가기 (새 창)" is unstyled default blue underlined text.
- Mobile breakage, confirmed in shots 16, 18 and 22:
  - The slot title and the issuer link overlap, for example "2025년 건강보험료 납부확인서" under "국민건강보험공단에서 발급받기 ↗" (`.dslot__head` is a non-wrapping flex row, `document-upload.css:258-264`).
  - The result row squeezes the filename to 50px ("S2_건…") and breaks "성명 / 홍길동 / 발급일 / 2026-03-05" one syllable per line.

**Upload waiting state (20, 21)**
- First upload: about 150 ms after the file is picked the action block disappears and the card collapses to title only (shot 18 f0). Then a shimmer thumbnail, the filename, a "읽는 중…" pill and disabled buttons appear.
- There is no stage text, no percentage, no time expectation and no cancel. The only sentence, "서류를 올리고 확인하고 있습니다…", is an unstyled `<p>` below all slots (`DocumentUpload.tsx:645`), off-screen.
- The whole list is `inert` during the request, so the citizen cannot fill in the next slot's date while waiting (`DocumentUpload.tsx:516`).
- Re-upload shows no loading indication in the slot. The old rejected file, the red message and the "다시 올려 주세요" badge stay on screen for the entire OCR (shot 20 f1 at 603 ms). The skeleton requires `!doc` (`DocumentUpload.tsx:322`) and the badge prefers the old status (`:265`).

**Submit and completion (24, 25)**
- There is no confirmation step. Clicking "신청 제출" posts immediately (no dialog was observed), despite the text "제출 후에는 신청 내용을 수정할 수 없습니다."
- The completion screen is a pale green card with 14px bold "신청이 접수되었습니다.", the 신청번호 as body text, and a "다운로드" and a navy "마이페이지" button stacked and touching at the left.
- It gives no receipt time, no result date and no contact, with roughly 420px of empty page below.

**MyPage (26)**
- Desktop is the most finished screen: navy header card, five-step bar, table.
- It still shows raw filenames, "접수 2026-11-14 00:35:07", and a column titled "판독된 서류".
- Mobile is broken: `.mypage { width: 940px }` (`my-page.css:5`) gives a 956px page in a 390px viewport, so everything right of "제출한 서류" is off-screen.

## 3. Measured timings

Local machine, warm dev servers, so these are a floor, not production figures.

| Action | Time |
|---|---|
| Cold first load to step 1 visible | 310 ms (FCP 224 ms) |
| Warm reload to step 1 visible | 96 ms |
| 본인인증 click to workspace visible | 95 ms |
| 본인인증 click to form page image loaded | 286 ms |
| Switch form | 151 ms |
| 미리보기 | 106–282 ms |
| Open `/apply/upload` | not recorded (log line lost) |
| Choose 근로유형 to list refreshed | 73 ms |
| Submit to completion | 462 ms |
| Open MyPage | 99 ms |

Upload request durations (`POST /api/applications/6/documents`):

| Sample | Path taken | POST time |
|---|---|---|
| `S6_주민등록초본_암호.pdf` | fast path | 40 ms |
| `S2_건강보험자격확인서_적합.pdf` | fast path | 40 ms |
| `S2_건강보험자격득실확인서_적합.pdf` | fast path | 20 ms |
| `S2_4대보험가입내역확인서_적합.pdf` | fast path | 18 ms |
| `S2_건강보험료납부확인서_적합.pdf` | fast path, first call | about 590 ms (4,090 ms measured minus the 3,500 ms injected delay) |
| `raster_chobon_gasang.png` | local OCR engine | 1,166 ms; 1,205 ms from file pick to result |

- The bundled `demo/fixtures/samples/*.pdf` never exercise real OCR: they are five-line text PDFs whose filenames match the fixture table (`demo/backend/ocr/fixture.py:383-384`).
- The one real-OCR figure comes from a 1653x2339 PNG I rasterised from `S2_주민등록초본_적합.pdf` (one page, five lines of text). A real multi-page 정부24 or 건보 scan will take longer; I have no measurement for that.
- The follow-up `required-documents` and `final-check` calls took 6–12 ms each.

## 4. Not captured, and why

- **Real multi-second OCR wait**: nothing available locally takes longer than about 1.2 s. The skeleton shots (21) use a labelled 3.5 s artificial hold on the response.
- **Timing and in-progress detail for the first upload (18)**: the log lines were lost to a truncated command; only frame f0 exists.
- **MyPage in draft state** (before submit): only one application was allowed and I submitted it.
- **서식4, 서식2 page 2, and 서식5 "스캔본 제출" mode**: not opened. The "all 5 forms complete, ready to continue" state of step 2 was also skipped, because the README says not to re-save a seeded application.
- **Other 근로유형 branches**, the 기간제 checkbox, the "근로확인서류가 빠집니다" confirm, the date-warning texts, "배정되지 않은 페이지", network and server error states, and the initial "두배적금 본인인증을 준비하고 있습니다..." text (it passes in under 100 ms).
- **Signature upload with an actual file** in step 1 or 서식5: only the empty tab was captured.
- **Mobile signature modal after signing (13 mobile)** shows an empty pad: resizing the viewport cleared the canvas. That is a resize/rotation bug, but the shot is not a faithful "signed on a phone" state.
- **One mobile in-progress frame (21 mobile)** is shifted about 32px sideways. I could not reproduce any horizontal overflow on that page afterwards (scrollWidth 390), so treat that shift as unexplained.
