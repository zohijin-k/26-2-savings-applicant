# Applicant flow shell, IdentityCheck and MyPage: read-only findings

All paths are under `/Users/zohijin/Desktop/26-2-savings-applicant/demo/frontend/src/`. Nothing was modified.

## 1. Step flow

**State machine** (`pages/applicant/ApplyFlow.tsx:33-38`): `Stage = identity | forms | upload | complete | mypage`.
- The URL is `/apply/<stage>`; `final` is an alias of `upload`, and mypage carries `?from=<previous stage>` (`:40-55`, `:201`).
- The application id lives only in `sessionStorage['applicant.activeApplicationId']`.
- Init (`:134-196`) runs `fetchPrograms`, then restores the saved draft or calls `createSavingsDraft()`, then fetches consents and status. The stage is restored from the URL only when the saved id matched; `complete` on a draft falls back to `upload`.
- `popstate` remounts the whole `ApplyFlow` (`App.tsx:13`), so every browser Back/Forward re-runs init.

**What each stage renders**
- **Loading**: a bare `<p className="flow" role="status">두배적금 본인인증을 준비하고 있습니다...</p>` (`:253`). It shows this text even when restoring forms or upload.
- **Fatal error**: `<p class="flow-error" role="alert">` plus a `다시 시도` button (`:252`).
- **Always**: `<h1>{program.name} 신청</h1>` and the stepper. The header portal shows `신청번호 <strong>{appNo || '발급 중…'}</strong>` and a `마이페이지` button (`:353-358`).
- **identity**: `IdentityCheck`.
- **forms**: `PdfFormsWorkspace`. Errors: `자가진단의 모든 문항에 답해 주세요.` and `필수 동의와 서명을 모두 마쳐 주세요.` (`:229`, `:233`).
- **upload**: `DocumentUpload`. If identity is null, a warning block shows `본인인증 전입니다.` / `지금 올리는 서류는 본인 명의인지 대조하지 않습니다.` / `본인인증 하러 가기` (`:446-455`).
- **complete**: a green `.flow-block--ok` with `submitted.message`, `신청번호 …`, an `<ol>` of next steps, the notice, `ApplicantFormsBulkMenu` and a `마이페이지` button (`:473-486`).
- **mypage**: `신청 화면으로 돌아가기` plus `MyPage`.

**Stepper markup** (`:363-396`): `<ol class="flow__stages" aria-label="신청 단계">` with one `<li class="is-current|is-complete|is-waiting">` per step, each holding a `<button aria-current="step" aria-disabled>`.
- Labels: `본인인증`, `서식 작성`, `서류 업로드 및 제출`.
- Caption: `{n}단계` plus a status from `stepStatus` (`:289-299`): `현재 단계`, `현재 · 3 / 7`, `완료`, `완료 · n / m`, `예정`, `예정 · n / m`, `접수 완료`.
- Step 1 is never navigable; its only explanation is `title="본인인증은 완료되었습니다"`.
- A stage change calls `window.scrollTo({top:0})` and nothing else: no focus move, no `document.title` change, no live announcement.

## 2. IdentityCheck and MyPage

**Fields** (`pages/applicant/IdentityCheck.tsx:209-276`)
- `성명`: plain text input.
- `생년월일`: `DateTriple`, three inputs inside one `<label>`.
- `휴대폰`: auto-formatted to 3-4-4, placeholder `010-0000-0000`.
- `본인 확인 서약`: the `PLEDGE` text (`:53-55`) and a checkbox `위 내용을 확인했으며 동의합니다.`
- `서명`: a radiogroup `그리기` / `서명 파file 업로드`→ actual label `서명 파일 업로드`, then either a canvas (`여기에 서명하세요`) or a file picker (`PNG·JPG·PDF 서명 파일을 올려 주세요. (5MB 이하)`, `파일 선택` / `다른 파일 선택`, `크게 보기`), plus `지우기`.

**Validation**
- There is no inline validation except phone: `010으로 시작하는 휴대폰 번호를 입력해 주세요.` appears only once 11 digits are typed and the prefix is wrong (`:146`, `:270`).
- `ready` (`:147`) silently disables the `본인인증` button (busy label `확인 중…`) with no hint of what is missing.
- Birth is under-validated on the client: `ymdToISO` only needs three non-empty parts, so year `1` or `2-31` passes and the server answers `생년월일을 확인해 주세요.`
- `DateTriple` silently drops keystrokes above the maximum (`forms/FormSheet.tsx:204-208`).
- File errors: `서명 파일은 PNG·JPG·PDF만 올릴 수 있습니다.` and `서명 파일은 5MB 이하로 올려 주세요.`
- Server errors are shown verbatim (`backend/api/applications.py:272-295`): `성명을 입력해 주세요.`, `본인 확인 서약에 동의해 주세요.`, `이미 본인인증을 마친 신청입니다. 다른 사람으로 신청하려면 새로 시작해 주세요.`, with fallback `본인인증 실패 (500)`.

**Demo nature**: `IDENTITY_METHOD = "demo"`; the typed values become the verified identity. The screen says `데모 화면입니다. 실제 서비스에서는 로그인할 때 휴대폰·간편인증으로 대신합니다.` (`:205-207`). Identity can be set once per application (409 afterwards).

**Done view** (`:106-139`): `본인인증을 마쳤습니다.`, a list of 성명 / 생년월일 / 휴대폰 (masked `010-****-1234`), `신청서의 성명·생년월일은 이 정보로 채워지며 고칠 수 없습니다. …`, and a button `자가진단으로`. It is reachable only by browser Back or a direct URL.

**Consents**: step 1 has only the pledge. Step 2 requires `privacy`, `unique_id`, `third_party` and `admin_info` (서식5 plus signature), unless `paperForms['서식5']` is set (`:259-265`).

**MyPage** (`pages/applicant/MyPage.tsx`)
- Reachable from the header button whenever an application exists, including before submission. The button is disabled while forms are saving or an upload is busy. It is also reachable from the complete screen.
- One `fetchStatus` on mount; no refresh.
- Shows: program name, `신청번호`, `· 접수 2026-11-14 10:22:31`, `문의 {call_center}` as plain text, five progress steps, `result_notice`, a supplement box (`D-3` / `기한 종료`, `보완 기한 … (약 n시간 남음)`), a `제출한 서류` table (`파일 / 판독된 서류 / 업로드 상태 / 내용`, `미판별`, raw `key value · key value` OCR output), and `동의 이력` (`아직 동의한 항목이 없습니다.`, `· 전자서명`, `· 자필서명 스캔`).

## 3. Complaint risks, most severe first

1. **Irreversible identity with no correction path.** A typo in name or birth locks form 1 permanently. The only escape is the `전북` logo button (`App.tsx:29`, aria-label `두배적금 본인인증으로 이동`), which silently starts a new application and orphans the old draft, with no confirmation.
2. **Raw technical errors.** `api.ts:242` throws `GET /api/programs 실패 (500)` and discards the server `detail`. That includes submit, so the server's blocker messages are lost. Network failures surface as `Failed to fetch`.
3. **"데모 화면입니다" on a production service.** Self-asserted identity is also a policy gap, not only a wording one.
4. **Silently disabled primary button.** The error `<p>` sits at the bottom, has no `role="alert"` (`:351`), and is not tied to a field with `aria-invalid` or `aria-describedby`.
5. **No orientation anywhere.** These files contain no list of what to prepare, no time estimate, no application deadline (`program.apply_period` is fetched but never shown), and no help contact outside MyPage. `call_center` is not a `tel:` link.
6. **Input loss.** IdentityCheck state is local, so refresh or Back wipes name, birth, phone and signature. There is no "저장됨" indicator. Save failures during identity go to `formError`, which is only visible in step 2.
7. **Completion screen is weak.** No heading, no focus move, no 접수일시. After a refresh the message becomes the hard-coded `신청이 완료되었습니다.` with an empty `<ol>` (`:175-178`); the live submit says `신청이 접수되었습니다.`
8. **Stale or unclear wording.** `자가진단으로` (step 2 is called `서식 작성`), `마이페이지` for an unsubmitted draft, unexplained `3 / 7` counters, `판독된 서류`, `미판별`, and a raw ISO birth date.
9. **Accessibility.**
   - Stepper buttons use `aria-disabled` without `disabled`: three dead tab stops, and step 1 is always dead.
   - No `<main>` or skip link.
   - Not a `<form>`, so Enter does not submit.
   - The canvas signature has no keyboard path other than file upload.
   - The `서명` label is an unassociated span.
   - MyPage progress state is colour-only (no `aria-current`; `#8a9099` on white is about 3.3:1).
   - The MyPage error has no role and no retry.
10. **Small targets and type.** Inputs are 38px high, buttons 42px, small buttons and the header `마이페이지` 32px at 12px text, the checkbox is native size. Stepper caption is 11px (10px at 580px and below); labels are 12.5px.
11. **Zoom and mobile.** `.mypage { width: 940px }` (`my-page.css:5`) has no media query, so it scrolls horizontally at 200% zoom. The four-column table does not reflow. The signature pad remounts on every width change (`:306` key).
12. **Supplement box has no action** to go and re-upload.

## 4. Visual critique

- **Container width jumps per step**: 940px fixed (`apply-flow.css:4`), then `max-width: 1160px` for forms (`:24`), then 972px for upload (`:14`). The stepper also moves from under the h1 to beside it in forms (`:57`).
- **Identity card is lopsided**: a 940px card holding a 380px form (`identity-check.css:25`) and a 460px signature block, with the primary button stranded at the far bottom-right.
- **Two competing palettes**: navy `--brand #1f3864` and blue `--workspace-accent #315dcc`. The identity primary button is blue (`apply-flow.css:215`); the complete-screen `마이페이지` primary is navy. Greys mix `#ddd`/`#bbb` with `#d8e0ea`/`#dfe5ed`. `#c00` and `#177245` are hard-coded beside their tokens.
- **Duplicate title**: the shell `<strong>전북청년 함께 두배적금 신청</strong>` and the h1 say the same thing.
- **Type scale**: 10, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 16, 18 and 22px, on a 14px body. That is below public-sector norms; KRDS body is about 17px, quoted from memory.
- **Radii**: 4, 6, 7, 8, 9, 12 and 999. `.idcheck__done` and `.mypage__supplement` are square boxes inside rounded cards.
- **Completed steps look disabled**: grey `#8e9db0` rather than a success colour. The stepper CSS is one-line-per-rule overrides (`:61-95`).
- **MyPage header** is a navy slab with a 16px h2 against the white shell.
- **Dead code**:
  - `.btn` is defined twice (`apply-flow.css:137-168` and `:171-223`).
  - Unused classes: `.flow__sub`, `.flow__gap`, `.flow__submission-order`, `.flow-block--stop`, `.mypage__queue*`, `.mypage__loading`.
  - `lib/period.ts` has no importers and hard-codes `ANNOUNCEMENT_DATE = '2026-03-03'`.

## 5. Invariants to preserve

- **`verifyIdentity` body**: `{name, birth: 'YYYY-MM-DD', phone, pledge, signature_data_url, signature_kind: 'electronic' | 'uploaded'}`, including the data-URL MIME rewrite (`IdentityCheck.tsx:171`). `onVerified(result, phone)` passes the unmasked phone into `form1.mobile`, then `lockIdentity`, then `save`.
- **Save ordering**: `saveQueue` serialises PATCHes. `flushForms` awaits the queue, PATCHes `{form1, self_check, form5}`, then POSTs the filtered consents. `continueFromForms` runs flush, then `postSelfCheck` (truthy answers only), then the `completed` and `consentReady` gates. `onBeforeSubmit` awaits the queue.
- **Literal data values, not labels**: `'동의함'`, `'동의하지 않음'`, `'화면에 서명'`, `paperForms['서식5']`.
- **Routing and storage**: the sessionStorage key, the `/apply/{stage}` scheme, the `final` alias, `?from=`, first write as `replaceState` then `pushState`, and no ids or PII in the URL.
- **Init behaviour**: the shared `pendingDraft` POST and `createdDraft` ref (StrictMode-safe), discarding a saved draft only on 403/404, and retry via `attempt`. The spec is `.trellis/spec/frontend/state-management.md`.
- **Component contracts**: the header portal into `headerHost`, and the `PdfFormsWorkspace` key `${appId}:${program.code}:${!!submitted}` with `readOnly` after submit.
- **Shared CSS owned by `apply-flow.css`**: `.btn`, `.btn--primary`, `.btn--small`, `.flow__actions`, `.flow-block*`, `--forms-sidebar-width` and `--forms-workspace-gap` are consumed by `PdfFormsWorkspace` and `DocumentUpload`.
- **MyPage must never show scores** (`MyPage.tsx:8-10`, `api.ts:206-207`).
- **Tests**: no frontend test asserts strings from these files. `backend/tests/run_p4_scenarios.py:646-668` fails if any non-allowlisted `.ts`, `.tsx` or `.css` file contains the substring `download` or `attachment`, so avoid those words in class names, attributes and comments.
