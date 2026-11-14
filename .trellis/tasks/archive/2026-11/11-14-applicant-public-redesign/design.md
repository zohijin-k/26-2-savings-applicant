# Design — 신청자 화면 공공서비스 리디자인

All paths are relative to `demo/frontend/` unless they start with `.trellis/` or `docs/`.
Frontend only. No file under `demo/backend`, `engine`, `engine_v2` changes.

## 0. Hard rules for every implementer

1. **P4 token scan.** Outside `src/forms/PdfFormsWorkspace.tsx`, `src/forms/pdf-forms-workspace.css`
   and `src/pages/applicant/DocumentUpload.tsx`, no `.ts/.tsx/.css` file under `demo/` may contain the
   substrings `download` or `attachment` (case-insensitive) — not in class names, attributes, icon names,
   comments, or CSS properties (`background-attachment`). Directories named `tests` are skipped by the scan.
   Use words like `save`, `fileDown`, `내려받기` instead.
2. **Do not rename** `PdfFormsWorkspace.tsx`, `pdf-forms-workspace.css`, `DocumentUpload.tsx`, the Noto font
   files, or the DOM ids listed in PRD R8.8.
3. **PDF sheet is geometry-frozen.** In `PdfFormsWorkspace.tsx` do not touch the scale/box math
   (`pageWidth`, `scale`, `box × scale`, the `28` padding constant) or field rendering order. In
   `pdf-forms-workspace.css` the `.pdf-form__page/__background/__overlay/__mask/__text/__check*/__radio*/__sign/__auto-date/__email-hint`
   rules keep their geometry and fonts; `.pdf-form__scroll` keeps `padding: 14px`. `form-sheet.css` sheet tokens stay.
   The only permitted change inside the sheet is the missing-required *colour state* in §6.4.
4. **Copy rules.** 합쇼체 throughout ("~합니다 / ~해 주세요"), no 해요체. No invented facts: no time
   estimates other than the computed upload estimate, no office hours, no addresses, no policy claims.
   Reupload guidance text comes only from `reupload-guidance.ts` (unchanged). Status labels stay
   `업로드 완료` / `다시 올려 주세요`. Never show scores, raw findings, confidence, engine names.
5. **Tokens only.** New/rewritten CSS uses `var(--…)` tokens from `src/styles/tokens.css`. No new colour
   literals, no px font sizes outside the scale, no radii outside the scale.
6. No new npm dependencies. No external network requests at runtime (no CDN fonts/icons).
7. File ownership in §9 is exclusive during the parallel stage. Need a change in a file you do not own?
   Do not edit it — describe the exact change in your final report.

## 1. Tokens — `src/styles/tokens.css` (new)

Colour source: `jb.png` (brand) + KRDS neutral/status scales (accessibility-proven).

```css
:root {
  /* brand — sampled from jb.png */
  --jb-blue-5:#f0f5fb; --jb-blue-10:#dce8f6; --jb-blue-20:#b8d0ec; --jb-blue-30:#8ab0de;
  --jb-blue-40:#4f86c9; --jb-blue-50:#1d5fb5; --jb-blue-60:#084090; --jb-blue-70:#06326f; --jb-blue-80:#05264f;
  --jb-navy:#182880; --jb-cyan:#00a8d0; --jb-cyan-text:#00728f; --jb-magenta:#e00078;
  --jb-mint:#f3f8ec; --jb-cream:#fcf5e5;

  /* neutral (KRDS gray) */
  --gray-0:#fff; --gray-5:#f4f5f6; --gray-10:#e6e8ea; --gray-20:#cdd1d5; --gray-30:#b1b8be; --gray-40:#8a949e;
  --gray-50:#6d7882; --gray-60:#58616a; --gray-70:#464c53; --gray-80:#33363d; --gray-90:#1e2124;

  /* status (KRDS) : -5 surface, -10/-20 border, -50 icon, -60 text */
  --danger-5:#fdefec; --danger-10:#fcdfd9; --danger-50:#de3412; --danger-60:#bd2c0f;
  --warning-5:#fff3db; --warning-10:#ffe0a3; --warning-50:#9e6a00; --warning-60:#8a5c00;
  --success-5:#eaf6ec; --success-10:#d8eedd; --success-50:#228738; --success-60:#267337;
  --info-5:#e7f4fe; --info-10:#d3ebfd; --info-50:#0b78cb; --info-60:#096ab3;

  /* semantic */
  --color-bg:#f7f8f5;            /* page: warm neutral that sits with the banner's cream/mint */
  --color-surface:#fff; --color-surface-subtle:var(--gray-5); --color-surface-brand:var(--jb-blue-5);
  --color-text:var(--gray-90); --color-text-subtle:var(--gray-70); --color-text-muted:var(--gray-60);
  --color-text-disabled:var(--gray-50); --color-text-brand:var(--jb-blue-60); --color-text-on-primary:#fff;
  --color-border:var(--gray-20); --color-border-strong:var(--gray-60); --color-divider:var(--gray-10);
  --color-primary:var(--jb-blue-60); --color-primary-hover:var(--jb-blue-70); --color-primary-pressed:var(--jb-blue-80);
  --color-focus:var(--jb-blue-50);
  --color-dim:rgb(0 0 0 / 60%);

  /* type — Pretendard GOV, self-hosted */
  --font-ui:'Pretendard GOV','Pretendard','Apple SD Gothic Neo','Malgun Gothic','맑은 고딕','Noto Sans KR',system-ui,sans-serif;
  --fs-13:13px; --fs-15:15px; --fs-16:16px; --fs-17:17px; --fs-19:19px; --fs-22:22px; --fs-24:24px; --fs-28:28px;
  --lh-tight:1.35; --lh-base:1.55;
  --fw-regular:400; --fw-medium:500; --fw-bold:700;

  /* space (4px grid) */
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:20px; --sp-6:24px; --sp-8:32px; --sp-10:40px; --sp-12:48px; --sp-16:64px;

  /* shape */
  --radius-4:4px; --radius-6:6px; --radius-8:8px; --radius-12:12px; --radius-pill:999px;
  --shadow-1:0 0 2px rgb(0 0 0 / 5%),0 4px 8px rgb(0 0 0 / 8%);
  --shadow-2:0 0 2px rgb(0 0 0 / 8%),0 8px 16px rgb(0 0 0 / 12%);
  --shadow-3:0 0 2px rgb(0 0 0 / 8%),0 16px 24px rgb(0 0 0 / 12%);

  /* control sizes */
  --control-lg:56px; --control-md:48px; --control-sm:40px;
  --ease:160ms ease;

  /* layout */
  --shell-max:1200px; --content-max:880px; --gutter:24px;
  --bp-sm:600px; /* documentation only: media queries use 600px and 900px */
}
```

Verified contrast: blue-60 on white 9.78; white on blue-60 9.78; gray-90 16.2; gray-70 8.68; gray-60 6.30
(5.9 on `--color-bg`); status-60 on its -5 surface ≥ 5.0; blue-60 on blue-5 8.9; cyan-text 5.5.
`--gray-50` is for disabled text only. `--jb-cyan` (2.8) and `--jb-magenta` are **decorative only** — never text, never
a state colour (magenta reads as an error).

Breakpoints: exactly two — `max-width: 900px` (stack columns) and `max-width: 600px` (phone). Remove the other six.

Legacy tokens: `src/index.css` keeps the legacy variables the PDF sheet reads (`--brand`, `--brand-tint`, `--text`,
`--muted`, `--form-border`, `--form-label-bg`, `--fail`, `--success`, `--warning` and tints, `--border*`, `--surface*`,
old `--radius-*`, `--shadow-md`, `--ease`) **with unchanged values** so `form-sheet.css` / `.pdf-form__*` render the
same. Everything else (root font, body size, `.status-badge`) moves to the new files. New chrome CSS must not read the legacy variables.

## 2. Base — `src/styles/base.css` (new)

- `html { font-family: var(--font-ui); color: var(--color-text); background: var(--color-bg); }`
  `body { margin:0; font-size:var(--fs-16); line-height:var(--lh-base); word-break:keep-all; overflow-wrap:anywhere; }`
- Headings: h1 24/700, h2 22/700 (page-section title), h3 19/700, h4 17/700; margins reset, set by layout.
- One focus rule: `:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 2px; border-radius: inherit; }`
  plus `:focus:not(:focus-visible){outline:none}`. Delete every ad-hoc focus rule in chrome CSS. (PDF overlay inputs keep theirs.)
- `.sr-only`, `.skip-link` (visible on focus, top-left, primary fill).
- `@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; scroll-behavior:auto!important; } }`
- `@font-face` for Pretendard GOV 400/500/700, `font-display: swap`, files in `src/assets/fonts/PretendardGOV/`
  (`PretendardGOV-Regular.subset.woff2`, `-Medium`, `-Bold`) + `LICENSE.txt` (OFL 1.1). Source: npm `pretendard-gov`
  (`npm pack pretendard-gov` in a scratch dir, copy from `dist/web/static/woff2-subset/`). If the fetch fails, skip the
  `@font-face` block, keep the stack, and report it.

`src/main.tsx` import order: `styles/tokens.css`, `index.css` (legacy), `styles/base.css`, `styles/components.css`, then App.

## 3. Components — `src/styles/components.css` + small TSX

CSS-class components (plain CSS, BEM-ish, existing class names kept where children already use them):

| Class | Spec |
|---|---|
| `.btn` | inline-flex, gap 8, radius 8, font 17/500, min-height `--control-md`, padding 0 20, 1px border, transition `--ease`. Default = **secondary**: white fill, `--color-border-strong` border, `--color-text`. Hover gray-5. |
| `.btn--primary` | fill `--color-primary`, white text, hover/pressed tokens. One per view. |
| `.btn--quiet` | no border, transparent, `--color-text-brand`, underline on hover. For reset/cancel/“요건 보기”. |
| `.btn--danger` | secondary shape, danger-60 text/border. Destructive confirms only. |
| `.btn--lg` / `.btn--small` | 56px/19px, padding 0 24 · 40px/15px, padding 0 14, radius 6. (`.btn--small` name kept.) |
| `.btn:disabled, .btn[aria-disabled=true]` | gray-10 fill, gray-20 border, gray-60 text (5.0:1 on gray-10), `cursor:not-allowed`. |
| `.btn--busy` | shows `.spinner` before label; label stays. |
| `.field` | column, gap 8. `.field__label` 15/700 gray-90; `.field__req` (“필수”, 13px, danger-60, after label, not colour-only: the word itself); `.field__hint` 15 gray-70; `.field__error` 15 danger-60 with error icon, `role` managed by owner. |
| `.input`, `.select` | height `--control-md`, radius 8, 1px `--color-border-strong`, padding 0 14, font 16; focus → 2px `--color-primary` border (plus global outline); `[aria-invalid=true]` → 2px danger-50 border; disabled gray-5. |
| `.check`, `.radio` | label row min-height 40, gap 10, native input sized 20px with `accent-color: var(--color-primary)`; label 16. |
| `.notice` | radius 8, padding 16, 1px border, icon + body. Variants `--info` (info-5/info-10/info-60 title), `--success`, `--warning`, `--danger`, `--neutral` (gray-5). `.notice__title` 16/700, `.notice__body` 15. |
| `.badge` | height 26, padding 0 8, radius 4, 13/700, icon + text. Variants `--success` (success-5 / success-60), `--danger`, `--warning`, `--info`, `--neutral` (gray-5 / gray-70), `--brand` (blue-5 / blue-60). `.status-badge*` keep their class names and map onto this look. |
| `.card` | white, 1px `--color-border`, radius 12, padding 24 (16 ≤600px). No left-stripe cards, no boxes-in-boxes: at most one nested tinted panel (`.card__panel`, gray-5, radius 8, padding 16). |
| `.spinner` | 20px ring, 2px, track gray-20, arc primary, 900ms linear. `.spinner--sm` 16px. |
| `.progress` | 8px track gray-10, radius pill; `.progress__bar` primary; `.progress--indeterminate` animated 40% sweep (reduced-motion: static striped). `role="progressbar"` + aria values set in TSX. |
| `.link` | brand text, underline, `.link--external` appends external icon. |
| `.dl-inline` | definition list rendered as wrapped `term value` chips, 15px. |
| `.flow__actions` | bottom action row: quiet/secondary left, primary right; stacks reversed ≤600px, full-width buttons. |

TSX (all in `src/components/`):

- `Icon.tsx` — `<Icon name size? />`, inline SVG, `aria-hidden`, `currentColor`, 1.75 stroke, 20px default. Names:
  `check, checkCircle, alert, alertCircle, info, close, chevronLeft, chevronRight, chevronDown, external, upload, file, fileDown, eye, refresh, pencil, trash, clock, phone, printer, lock, user, calendar, minus, plus`.
  Replaces every Unicode glyph (✓ ✕ × ↻ ⓘ ◀ ▶ ↗ ↥ − +) in chrome.
- `Spinner.tsx` — `<Spinner label? small? />` (`role="status"` only when `label` given).
- `Notice.tsx` — `<Notice tone title? icon? role? children />`.
- `ProgressBar.tsx` — `<ProgressBar value? max? label indeterminate? />`.
- `Modal.tsx` — API unchanged (`title, description?, onClose, returnFocus?, children, footer?, variant`), add optional
  `size?: 'sm'|'md'|'lg'` (400/560/760px) and `closeOnOverlay?: boolean` (default true; confirm dialogs pass false).
  Restyle: dim `--color-dim`, radius 12, padding 24, shadow-3, title rendered as `<h2>` 19/700, close button 40×40 with
  `Icon close`, footer right-aligned buttons (stack ≤600px). Accessibility behaviour (portal, inert siblings, trap, Esc,
  focus return) unchanged. Modal content is outside `.flow`, so every style it needs must be global (components.css/modal.css).
- `ConfirmDialog.tsx` (new) — `<ConfirmDialog title description? confirmLabel cancelLabel? tone? ('primary'|'danger') onConfirm onCancel returnFocus? children? />`
  on top of Modal (`size="sm"`, `closeOnOverlay={false}`), initial focus on the title, cancel left / confirm right.
- `StatusBadge.tsx` — same two labels, `Icon` instead of glyphs.
- `Skeleton.tsx` — API unchanged; shimmer base gray-10 → gray-5 (light, not `#bbb`).
- `DateTriple` (lives in `src/forms/FormSheet.tsx`, shared by steps 1 and 3; **owned by the foundation stage**) — keep the
  existing props and behaviour contract, add optional `invalid?: boolean`, `describedBy?: string`, `idPrefix?: string`,
  `onBlur?`. Inputs use `.input` look (48px, widths 88/64/64), `inputMode="numeric"`, each input gets its own
  `aria-label` (“년/월/일” + group label). Out-of-range typing is **kept and flagged invalid** instead of silently dropped.
  Must not change how the PDF sheet uses it (FormSheet-internal usages keep rendering identically — scope new styles under a
  `date-triple--ui` modifier that steps 1 and 3 opt into).

Hooks/libs (new, `src/hooks`, `src/lib`):

- `hooks/useBeforeUnload.ts` — `useBeforeUnload(active: boolean)` registers/unregisters a `beforeunload` handler.
- `hooks/useElapsed.ts` — `useElapsed(startedAt: number | null, tickMs = 1000): number` seconds elapsed.
- `hooks/useDocumentTitle.ts` — sets `document.title`, restores nothing.
- `lib/format.ts` — `formatDate('2026-03-03') → '2026. 3. 3.'`, `formatDateTime(iso) → '2026. 11. 14. 오전 12:35'`,
  `formatBytes(n) → '1.2MB'`, `formatDuration(sec) → '약 12초' | '약 1분'`. Invalid input returns the input unchanged.
- `lib/error-copy.ts` — `friendlyError(err: unknown, fallback: string): string`. Rules: `ApiError` with server
  `detail` string → that detail; status 0 / `TypeError` / "Failed to fetch" → `인터넷 연결을 확인한 뒤 다시 시도해 주세요.`;
  5xx → `일시적인 문제로 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.`; 404/403 on application →
  `신청 정보를 찾을 수 없습니다. 처음부터 다시 시작해 주세요.`; else `fallback`. Never returns a string containing
  `/api`, an HTTP verb, or `fetch`.

`src/api.ts` (foundation stage only):

- `ApiError` gains `detail?: string`. `json()` parses `{detail}` on failure (string only) and throws
  `new ApiError(detail ?? friendly-by-status, status, detail)`. The message itself must already be citizen-safe.
  `form()` throws `ApiError` too (status kept).
- New `uploadDocumentWithProgress(id, slotKey, file, declaredIssueDate, opts: { onProgress?(sent,total), onSent?(), signal?: AbortSignal }): Promise<UploadedDocument>`
  using `XMLHttpRequest` with the same URL, method and FormData field names as the existing `uploadDocument`
  (read it; do not guess). `upload.onprogress` → `onProgress`; `upload.onload` → `onSent`; abort via signal;
  non-2xx → `ApiError` with detail; network error → `ApiError(…, 0)`. Existing `uploadDocument` stays exported.
- No request/response shape changes anywhere.

## 4. Shell — `src/App.tsx`, `src/app-shell.css`, `index.html`

```
[skip-link 본문으로 건너뛰기]
<header class="shell">            white, 1px bottom border, 4px top accent bar
  (accent bar: linear-gradient(90deg, blue-60 0 62%, cyan 62% 84%, magenta 84% 100%), decorative)
  .shell__inner  max 1200, height 72 (64 ≤600px), padding 0 24 (16)
    <button.shell__home> <img jb banner, height 44 (36), radius 6, alt="전북특별자치도 2026 전북청년 함께 두배적금"> </button>
    <div.shell__tools ref=headerHost>   ← ApplyFlow portals 신청번호 + 마이페이지 here (contract kept)
</header>
<main id="main" tabIndex=-1>  <ApplyFlow …/>  </main>
<footer class="site-footer">      white, 1px top border, padding 24, 15px gray-70
  .site-footer__inner max 1200: 「전북청년 함께 두배적금」 신청 · 전북특별자치도
  <div ref=footerHost>              ← ApplyFlow portals 문의 전화(tel: link) here
</footer>
```

- Brand asset: copy repo-root `jb.png` → `src/assets/brand/jb-banner.png` (leave the root file where the user put it).
  Use it as the favicon too (`index.html` `<link rel="icon" type="image/png">` via a small square crop is not possible
  without tooling — instead add an inline-SVG data-URI favicon: blue-60 rounded square with white “전북”).
- `index.html`: `<meta name="description">`, `<meta name="theme-color" content="#084090">`, `<noscript>` message.
- Home button: `aria-label="처음으로 (새 신청 시작)"`. `App` keeps `hasProgress` state set by ApplyFlow via
  `onProgressChange(boolean)`. Click with `hasProgress` → `ConfirmDialog` (“새 신청을 시작할까요?” / “지금 작성 중인
  신청은 이 창에서 더 이어서 쓸 수 없습니다.” / `새 신청 시작`(danger) / `계속 작성`); without progress → `goToHome()` directly.
  `goToHome` semantics unchanged (spec: Home starts a fresh draft).
- New ApplyFlow props (all optional so stages compile independently): `footerHost?: HTMLElement | null`,
  `onProgressChange?: (hasProgress: boolean) => void`. Existing `headerHost` and `key` remount contract unchanged.
- Delete the dead navy shell rules in `app-shell.css`; the `--workspace-*` variables are removed once no file reads them
  (integration stage checks with grep).

## 5. Flow frame, step 1, complete, MyPage — `ApplyFlow.tsx`, `apply-flow.css`, `IdentityCheck.tsx`, `identity-check.css`, `MyPage.tsx`, `my-page.css`, `components/SignaturePad.tsx`

### 5.1 Flow frame (all stages)

- `.flow` container: `max-width: var(--shell-max)`, padding `32px 24px 64px` (16 ≤600px). **Same frame on every stage**:
  `.flow__head` = h1 (`{program.name} 신청`, 24/700) on the first row, stepper on the second row at full container width.
  Stage content below: `.flow__body` is `max-width: var(--content-max); margin-inline:auto` for identity / upload /
  complete / mypage, and full width for forms (`.flow--forms`). Remove the `.flow--forms` title-left/stepper-right
  special-casing and the fixed `width: 940px`. Keep the class names `.flow--forms` / `.flow--fluid` on the root (PDF scale
  code reads layout width from the viewport element, not from these, but other CSS keys off them).
- Stepper (`ol.flow__stages`): connected 2px rail, 32px circular markers (24 ≤600px). complete = blue-60 fill + white
  `Icon check`; current = white fill, 2px blue-60 ring + blue-60 dot; waiting = white fill, gray-30 ring + step number in
  gray-60. Caption `N단계 · 상태` 13px gray-70, name 16/700 (15 ≤600px), counts kept (`현재 · 3 / 7` etc.). Rail segment
  left of a complete/current marker is blue-60, the rest gray-20. Semantics kept: `aria-current="step"`,
  `aria-disabled`, step 1 never re-enterable, blocked while `formContinuing`/`uploadBusy`. Non-navigable steps render as
  `<span>` (not dead tab stops); navigable ones stay buttons. After submit, step 3 shows complete and nothing is “current”
  on the complete screen except step 3 with caption `접수 완료` (fix the contradictory ring on step 2).
- Loading: centred `Spinner` + `신청 화면을 준비하고 있습니다.` (not “본인인증을 준비…” on every stage), shown via
  `useDelayedFlag` (≥150 ms) so Back/Forward remounts do not flash text. Fatal error: `Notice danger` with
  `friendlyError` copy + `다시 시도`.
- Header portal: `신청번호` label 13 gray-70 + value 15/700 (hidden ≤600px label only), `마이페이지` `.btn .btn--small`.
- Footer portal (`footerHost`): `문의 <a class="link" href="tel:…">{program.call_center}</a>` when present.
- `useDocumentTitle`: `{단계명} | 전북청년 함께 두배적금 신청` (본인인증 / 서식 작성 / 서류 업로드 및 제출 / 접수 완료 / 마이페이지).
- Stage change: after `scrollTo(top)`, move focus to the stage's `<h2 tabIndex=-1>` (each stage component's heading; for
  forms use the existing `#pdf-form-panel-title`), skipping the initial page load.
- `onProgressChange(identity !== null && !submitted)`; `useBeforeUnload` with the same condition **or** while saves are pending.
- Errors shown anywhere in ApplyFlow go through `friendlyError`.

### 5.2 Step 1 본인인증

Single card, `max-width: 720px` inside `.flow__body`, as a real `<form noValidate onSubmit>`.

1. `h2` “본인인증”.
2. `Notice info` “신청 전에 확인해 주세요” — bullet list, facts only:
   - `신청은 본인인증 → 서식 작성 → 서류 업로드 및 제출 순서로 진행합니다.`
   - `증빙서류는 발급처에서 받은 PDF 파일로 준비하면 가장 빠르고 정확하게 확인됩니다.`
   - `작성 중인 신청은 이 창(탭)에서만 이어서 쓸 수 있습니다. 제출을 마칠 때까지 창을 닫지 마세요.`
   - `본인인증에 입력한 성명·생년월일은 신청서에 그대로 들어가며 나중에 고칠 수 없습니다.`
3. The existing demo sentence stays verbatim, rendered as `Notice neutral` (policy wording is not this task's decision).
4. Fields (`.field` pattern, each with `필수`): 성명 (`autocomplete="name"`), 생년월일 (`DateTriple --ui`, hint
   `예: 1998년 6월 15일`), 휴대폰 (`inputMode="tel"`, `autocomplete="tel"`, hint `010으로 시작하는 번호`).
5. `본인 확인 서약` as a `.card__panel`: pledge text 16px, `.check` “위 내용을 확인했으며 동의합니다.”
6. `서명`: segmented control (`role="radiogroup"`, two real radio inputs styled as a 2-segment toggle, 48px, selected =
   blue-5 fill + blue-60 border/text + check icon) `직접 서명` / `서명 파일 올리기`; pad or file picker below, full card
   width up to 560px; `지우기` as `.btn--quiet .btn--small` directly under the pad's right corner. Keep the pad from
   clearing on width change where possible (only remount on mode change).
7. Actions: primary `본인인증` (`.btn--primary .btn--lg`, never `disabled` for missing input; `aria-busy` + spinner while sending).

Validation (new pure module `src/lib/identity-validation.ts` + test):

- `validateName` (non-empty after trim → `성명을 입력해 주세요.`)
- `validateBirth({y,m,d})`: all three present (`생년월일을 모두 입력해 주세요.`), real calendar date, year 1900–current,
  not in the future (`생년월일을 다시 확인해 주세요. 달력에 있는 날짜를 입력해 주세요.`).
- `validatePhone` via existing `isValidPhone` (`010으로 시작하는 휴대폰 번호 11자리를 입력해 주세요.`).
- pledge unchecked → `서약 내용을 확인하고 동의해 주세요.`; no signature → `서명을 해 주세요.`
- Timing: validate a field on blur once touched; validate all on submit. On submit failure: render an error summary
  `Notice danger` at the top of the form (`role="alert"`, title `입력 내용을 확인해 주세요`, list of links that focus each
  field) and focus the first invalid control. Each field: `aria-invalid`, `aria-describedby` → its `.field__error`.
- On submit success of validation → `ConfirmDialog` “입력한 정보가 맞습니까?” with a `dl` of 성명 / 생년월일
  (`formatDate`) / 휴대폰 and the line `확인 후에는 성명과 생년월일을 고칠 수 없습니다.`; buttons `다시 확인` / `맞습니다, 본인인증`.
  Confirm → existing `verifyIdentity` call with the **unchanged body** and unchanged `onVerified` sequence.
- Server errors → `friendlyError`, shown in the summary slot (`role="alert"`).
- Done view: `Notice success` “본인인증을 마쳤습니다.” + `dl` + button `서식 작성으로` (was `자가진단으로`).

### 5.3 Complete (in ApplyFlow)

Receipt card (`.receipt`), focus moved to its `h2` on arrival:
- Head band with the mint→cream gradient (`--jb-mint` → `--jb-cream`), `Icon checkCircle` (success-60) + `h2`
  “신청이 접수되었습니다”.
- `dl`: 신청번호 (19/700), 접수 일시 (`formatDateTime(submitted_at)` if the client has it — from the submit response or
  `fetchStatus`; omit the row if absent), 사업명.
- “다음 절차” `ol` when the steps list is available; when it is not (reload), **omit the list** rather than hard-code
  server copy, and show `진행 상황은 마이페이지에서 확인할 수 있습니다.`
- The score notice (`평가결과(심사 점수)는 공개하지 않습니다…`) as `Notice neutral`.
- `문의 {call_center}` with `tel:` link.
- Actions: `마이페이지에서 진행 상황 보기` (primary), 서식 내려받기 menu (existing `ApplicantFormsBulkMenu`, secondary),
  `접수 내용 인쇄` (quiet, `window.print()`; add a small `@media print` block in `apply-flow.css` hiding shell tools,
  stepper and actions).
- Same heading text on reload (`신청이 접수되었습니다`), no “완료되었습니다” variant.

### 5.4 MyPage

- `.mypage` → `max-width: var(--content-max)`; no fixed width. Header: plain card (not a navy slab): h2 `마이페이지`,
  program name, `dl-inline` 신청번호 / 접수 일시 (`formatDateTime`) / 문의 (`tel:`).
- Progress: `ol`, same marker language as the stepper; current step has `aria-current="step"` + text `진행 중`,
  passed `완료`, upcoming `예정`.
- Documents: table ≥600px; ≤600px each row becomes a stacked card (`display:block` rows with inline labels via
  `data-label`). Column titles: `파일` / `서류 종류` / `상태` / `확인된 내용`. `미판별` → `확인 전`. Extracted values as
  `dl-inline`, dates through `formatDate`.
- Supplement box → `Notice warning` with deadline and a `서류 다시 올리기` button that navigates to the upload stage
  (callback prop from ApplyFlow; only when the application is not submitted-locked — if it cannot be determined, omit the button).
- Load error → `Notice danger` + `다시 시도`. Never render scores (existing rule).

## 6. Step 2 서식 작성 chrome — `forms/PdfFormsWorkspace.tsx`, `forms/pdf-forms-workspace.css`

Restyle chrome only; see §0.3.

1. **Sidebar** (`.pdf-forms__nav`): card, title `서식 목록` 17/700 + `작성 완료 n / m` (15, gray-70). Items: 56px+ rows,
   public number caption 13 gray-70, title 16/500, status line 15 with icon + text (no pill badges):
   `Icon checkCircle` success-60 `작성 완료` · `Icon pencil` blue-60 **bold** `작성 중 · 남은 항목 N개` · gray-60 `미작성`.
   Active item: blue-5 background + 3px blue-60 left bar + `aria-current="true"`. Pending switch: `Spinner small` on the
   clicked item. ≤900px: horizontal scroll list with visible scroll shadow.
2. **Panel head**: `h2#pdf-form-panel-title` 19/700 (`서식N 제목`), state text beside it 15: remaining count, and the
   save state from existing props/state — `저장 중…` (spinner) / `저장했습니다` (success icon, stays until next edit) /
   save error (danger icon + friendly copy). Lives inside the head row; no reserved extra row.
   Actions: `저장` primary `.btn--small`; `미리보기`/`수정하기` secondary small; 내려받기 menu secondary small;
   `다시 작성` quiet small, visually separated by a divider. ≤900px they wrap under the title.
3. **Toolbar**: `이전 쪽` / `n / N쪽` / `다음 쪽` with `Icon chevronLeft/Right`, 40px buttons with visible text labels on
   ≥600px. Changing page scrolls the viewport to top.
4. **Missing-required state** (the one sheet-colour change): `.pdf-form__*` missing fields get the calm state by default
   — 2px `--jb-blue-40` outline + `--jb-blue-5` fill for inputs/groups (“작성할 칸”); the existing red (`#c33`) rules
   apply only under `.pdf-forms--show-errors`, a class set after the citizen presses `저장`, `서류 업로드로` or switches
   form with missing fields (state `attempted`, per workspace mount). Geometry, sizes, fonts untouched. Add a one-line
   legend under the toolbar: `파란 테두리 칸은 작성해야 하는 칸입니다.` (only in edit mode, only when the active form has
   missing fields).
5. **Page image**: track `onLoad`/`onError` on the background `<img>`. Until loaded show a skeleton placeholder of the
   page box and keep the overlay hidden (`visibility:hidden`) so inputs do not float on white. On error: `Notice danger`
   `서식 화면을 불러오지 못했습니다.` + `다시 불러오기` (re-key the img). Do not change the URL or cache key logic.
6. **Initial load**: skeleton sidebar (5 rows) + skeleton page instead of `0 / 0` and plain text; load failure gets a
   `다시 시도` button (re-run the existing loader) instead of “새로고침해 주세요”.
7. **Continue CTA**: bottom `.flow__actions`: remove the `서식 목록` scroll-to-top button; primary
   `서류 업로드로` is never silently disabled for incompleteness (`disabled` only while saving/continuing). Clicking it
   while incomplete sets `attempted`, renders `Notice warning` above the actions — title
   `아직 작성하지 않은 서식이 있습니다`, list of incomplete forms (`서식N 제목 — 남은 항목 N개`) each a button that switches
   to that form (through the existing switch path incl. `onFlush`) — and focuses the notice. Complete → existing
   `continue` path unchanged (server recheck unchanged).
8. **Errors**: route through `friendlyError`; drop the blanket suffix ` 저장 또는 서식 선택을 다시 시도해 주세요.` and append a
   retry hint only to save/switch failures. A successful save clears a stale autosave error.
9. **Menus/dialogs**: 내려받기 `<details>` closes on Escape, outside click, form switch and when a dialog opens; keeps
   right-edge anchoring and stacking context. The four `window.confirm` calls → `ConfirmDialog` with the same sentences
   as titles/descriptions and explicit verb buttons (`다시 작성` / `바꾸기` / `취소`). Signature dialog: restyle chrome with
   tokens (radius 12, same look as Modal), keep its own Escape / scroll-lock / focus-trap / focus-return code and the
   draw/upload/clear/confirm/mode behaviour exactly; first focus goes to the dialog title, not `닫기`; signed trigger on
   the sheet stays as is.
10. `useBeforeUnload(saving || hasUnflushedChanges)` — `hasUnflushedChanges` = consent values differ from last flushed
    (track with a ref inside the workspace if derivable from props; otherwise report the needed ApplyFlow change).
11. Paper-mode option cards: `.radio`-style selectable cards with `Icon`, token colours.
12. Remove dead rules listed in the audit (`pdf-forms-workspace.css` lines 2-3, 5, 86-101, 109-113, 116, 158-160,
    163-169 — verify each selector is unreferenced before deleting).

## 7. Step 3 서류 업로드 — `pages/applicant/DocumentUpload.tsx`, `document-upload.css`, new modules

### 7.1 Upload pipeline (perceived latency)

New pure modules (unit-tested, no React):

- `src/pages/applicant/upload-queue.ts`
  ```ts
  type QueueStatus = 'queued' | 'sending' | 'reading' | 'done' | 'failed'
  interface QueueItem { id: string; slotKey: string; file: File; declared: string; status: QueueStatus;
    sent: number; total: number; enqueuedAt: number; startedAt: number | null; sentAt: number | null;
    finishedAt: number | null; estimateSec: number | null; pages: number | null; kind: 'pdf-text'|'pdf-scan'|'image';
    error?: string }
  type QueueAction = enqueue | start | progress | sent | succeed | fail | cancel | retry | clearSlot
  function queueReducer(state: QueueItem[], action): QueueItem[]
  function nextRunnable(state): QueueItem | null          // first 'queued' only when nothing is sending/reading
  function slotItem(state, slotKey): QueueItem | null      // latest non-terminal or failed item for the slot
  function isActive(state): boolean                        // any queued/sending/reading
  ```
  Rules: one item per slot (enqueue for a slot that already has a queued/failed item replaces it; a slot whose item is
  sending/reading cannot be re-enqueued); strictly one in flight; `cancel` only for `queued`; `retry` turns `failed`
  back to `queued` with the same file; `succeed` removes the item (the result lives in the checklist).
- `src/lib/upload-estimate.ts`
  ```ts
  interface Observation { kind; pages: number; ms: number }
  function estimateSeconds(kind, pages, history: Observation[]): number   // pdf-text: 1; image: 3; pdf-scan: 4/page
  // with history: per-kind mean of ms/page from this session blends 50/50 with the default; clamp 1..180
  function slowThresholdSec(estimate): number   // max(10, estimate * 1.5)
  ```
- `src/lib/file-precheck.ts`
  ```ts
  type Precheck = { ok: true; kind; pages: number | null; previewUrl: string }
               | { ok: false; reason: 'format'|'heic'|'empty'|'encrypted'; message: string }
  async function precheckFile(file: File, pdf: PdfProbe): Promise<Precheck>
  ```
  `format`: extension not in pdf/jpg/jpeg/png → `PDF, JPG, PNG 파일만 올릴 수 있습니다. 서류를 PDF로 저장하거나 JPG로 바꿔 다시 선택해 주세요.`
  `heic`: → `아이폰 사진(HEIC) 형식은 올릴 수 없습니다. 사진을 JPG로 바꾸거나, 발급처에서 PDF로 받아 올려 주세요.`
  `empty` (0 bytes): → `파일 내용이 비어 있습니다. 파일을 다시 저장한 뒤 선택해 주세요.`
  `encrypted` (pdf.js PasswordException): → `암호가 걸린 PDF입니다. 암호를 해제한 파일을 올려 주세요.`
  PDF probe (injected so tests need no pdf.js): page count + whether page 1 has a text layer → `pdf-text` vs `pdf-scan`.
  Any probe failure other than a password error → `ok: true` with `pages: null`, `kind: 'pdf-scan'` (never block what the
  server would accept). Size is never blocking; files ≥ 20MB add a hint `파일이 커서 시간이 더 걸릴 수 있습니다.`

`DocumentUpload.tsx` wiring:

- `const [queue, dispatch] = useReducer(queueReducer, [])` + a runner effect: when `nextRunnable(queue)` exists →
  `start` → `uploadDocumentWithProgress` (`onProgress` → `progress`, `onSent` → `sent`) → on success: record
  `Observation` (use response `elapsed_ms` when present else wall time), **patch the checklist state from the returned
  `UploadedDocument`** (replace the slot's documents), `succeed`; on failure: `fail` with `friendlyError`.
  When the queue drains → one background `refresh()` (checklist + final-check) with the existing generation guard.
- The page is **not** `inert` during uploads. Global lock (`runMutation`, `inert`, `aria-busy`) remains only for
  work-context change, leftover delete and submit. While `isActive(queue)`: work-context controls are disabled with the
  hint `서류 확인이 끝나면 근로유형을 바꿀 수 있습니다.`; submit is disabled with `서류 확인이 끝나면 제출할 수 있습니다.`;
  `onBusyChange(true)` (parent blocks stepper/MyPage as today). Readiness is invalidated when the first item starts.
- `useBeforeUnload(isActive(queue))`.
- Declared dates persist in `sessionStorage['applicant.declaredDates.' + applicationId]` (JSON `{slotKey: 'YYYY-MM-DD' parts}`);
  cleared for a slot after a successful upload. No names or ids other than the application id already kept there.
- Estimate history lives in a module-level array (session lifetime), max 20 observations.
- Object URLs created for previews are revoked when the item leaves the queue / on unmount.

### 7.2 Slot card states

One `.card` per slot, `id="slot-{key}"`. Head: label (h3 17/700) + `.badge` `필수`, right side `요건 보기`
(`.btn--quiet .btn--small`, opens the existing requirements modal) and `{issuer}에서 발급받기` (`.link--external`); head
wraps (no overlap ≤600px). Criteria line 15 gray-70 with dates via `formatDate` (`2026. 3. 3.(공고일) 이후 발급된 서류`
— build from the existing label; if the label is free text, only reformat ISO dates found in it).

Body by state (exactly one):

| State | Content |
|---|---|
| **empty** | Step row ① `서류에 적힌 {발급일}` `DateTriple --ui` (when the slot needs a date) with warnings as `.field__error`/hint; ② drop zone: dashed 1px gray-40, radius 8, padding 20, `Icon upload`, text `파일을 여기에 끌어다 놓거나` + button `파일 선택` (`id="upload-{key}"`, `.btn`), caption `PDF 권장 · JPG, PNG 가능`. When the date is required and missing, the zone is visibly disabled and says `{발급일}을 먼저 입력해 주세요.` (existing gate rule kept). Drag-over highlight blue-5/blue-60. |
| **precheck failed** | Same as empty + `Notice danger` with the precheck message. No request sent. |
| **queued** | File row (thumbnail 56×76 from the local preview, name, `formatBytes`, page count) + `대기 중 — 앞 서류 확인이 끝나면 바로 시작합니다.` + `취소` (`.btn--quiet .btn--small`). |
| **sending** | File row + `ProgressBar` determinate `올리는 중 {n}%`. |
| **reading** | File row + `ProgressBar indeterminate` + `서류를 읽고 확인하고 있습니다.` + `{elapsed}초 경과 · 예상 {formatDuration(estimate)}`; for `pdf-text`: `곧 끝납니다.` instead of an estimate. Past `slowThresholdSec`: `Notice info` `평소보다 오래 걸리고 있습니다. 창을 닫지 말고 기다려 주세요. 다른 서류의 발급일을 먼저 적어 두셔도 됩니다.` |
| **failed (request)** | File row + `Notice danger` (friendly copy) + `같은 파일로 다시 시도` (primary small) + `다른 파일 선택`. |
| **done · 업로드 완료** | `StatusBadge` success, file row (thumbnail reuses the local preview URL while available, else the existing server thumbnail), extracted values as `.dl-inline` (dates via `formatDate`), actions `미리보기` / `다른 파일로 바꾸기`. |
| **done · 다시 올려 주세요** | `StatusBadge` danger, file row, then `Notice danger`: title = guidance title, body = guidance reason + fix (from `reupload-guidance.ts`, unchanged text), issuer link, then a separated line `자동 확인 결과입니다. 올바른 서류를 올렸는데도 같은 안내가 계속되면 {callCenter}(으)로 문의해 주세요.` (omit the phone clause when `callCenter` is absent), primary small `다시 올리기`. |
| **replace mode** | Result collapses to a one-line summary `현재 파일: {name}` and the empty-state inputs show beneath with a `취소` (quiet) that leaves replace mode. Once a new file is picked the card shows queued/sending/reading — the old badge and red notice are **not** shown during that time. On request failure the old result comes back with the failure notice. |

A per-slot live region (`<p class="sr-only" role="status" aria-live="polite">`, always mounted) announces:
`{label} 올리는 중` → `{label} 업로드 완료` / `{label} 다시 올려야 합니다. 안내를 확인해 주세요.` / `{label} 올리지 못했습니다.`
After a result, focus moves to the card's result heading only if focus was lost to `<body>`; otherwise leave it where the citizen is typing.

New optional prop: `callCenter?: string` (ApplyFlow passes `program.call_center`).

### 7.3 Rest of the page

Order top → bottom:

1. `h2` “서류 업로드 및 제출” (`tabIndex=-1`) + `Notice info` “올리기 전에 확인해 주세요”:
   `발급처에서 받은 PDF 원본이 가장 빠르고 정확하게 확인됩니다.` / `종이 서류를 찍을 때는 서류 전체가 보이게, 글자가 또렷하게 찍어 주세요.` /
   `파일을 올리면 자동으로 서류 종류와 발급일 등을 확인합니다. 확인하는 동안 다른 서류를 계속 준비할 수 있습니다.`
2. 근로유형 card (`id="work-context"`): `.card` with h3, hint 15, radios as a responsive grid of `.radio` rows
   (2 columns ≥600px), extra checkbox/select with `.check` / `.select`. **Optimistic**: local pending value shown
   immediately; on failure revert + notice. The `window.confirm` → `ConfirmDialog` (same sentence, buttons `바꾸기` / `취소`).
3. Summary bar (sticky top ≥900px, plain card): `제출 서류` `ProgressBar` (uploaded-only count / total,
   `role=progressbar`), text `{done}종 완료 · 전체 {total}종`, and when applicable `· 다시 올릴 서류 {n}종` (danger-60 with
   icon) and `· 확인 중 {n}종`.
4. Slot cards (§7.2). 5. `업로드하지 않아도 되는 서류` as a quiet list card. 6. Leftover pages section restyled.
7. Reupload trigger (`id="reupload-guidance-trigger"`) as `.btn` inside a `Notice danger` summarising
   `다시 올려야 할 서류가 {n}종 있습니다.` The dialog keeps its approved copy and behaviour, restyled. **Auto-open**:
   only when the queue is idle and the failure fingerprint (document ids + codes) is new **and** not present in
   `sessionStorage['applicant.seenReupload.' + applicationId]`; store on open. Never on plain remount/refresh.
8. Submit card (`h3#submission-heading`): lead text, blockers as a list — each row `{문서/서식 이름}` + the server message
   rendered with `white-space: pre-line`, de-duplicating the pattern `X 'X'을(를) …` when the label is repeated verbatim
   (display-only; do not alter server data) + `바로 가기` button (was `수정하기`). Pending/invalid readiness texts as
   `.field__hint` with spinner. Buttons: `서식 수정` secondary, `신청 제출` primary large.
   Click → `ConfirmDialog` (`size="md"`): title `신청을 제출할까요?`, body: `제출한 뒤에는 서식과 서류를 수정할 수 없습니다.`
   + summary `dl` (서식 `작성 완료`, 서류 `{done}종 업로드 완료`), buttons `돌아가기` / `제출하기`. Confirm → the existing
   submit path (flush wait + fresh readiness + POST) unchanged. Double click ignored (existing single-flight).
   Submit errors → `friendlyError` in a `Notice danger` (`role="alert"`) inside the submit card.

Layout: one column, `gap: 16px`; ≤600px all rows stack, file name wraps (`overflow-wrap:anywhere`), `dl-inline` wraps
whole `term value` pairs (no per-syllable breaks: `white-space: nowrap` on each pair, pairs wrap as units).

`FilePreview` / `FileLink` (`components/`): token restyle, `Icon` zoom buttons 40px with `aria-label`s, image loading
spinner, focus styles from base.

## 8. Tests (Node, no new deps)

Existing pattern: plain TS run by Node (`node --test tests/*.test.ts`, type stripping). New files under
`demo/frontend/tests/` (the P4 scan skips `tests` dirs): `upload-queue.test.ts`, `upload-estimate.test.ts`,
`file-precheck.test.ts`, `identity-validation.test.ts`, `format.test.ts`, `error-copy.test.ts`. Modules under test must
be importable by Node without bundler-only features (no CSS imports, no `import.meta.env`, no pdf.js import at module top
level — inject the probe). Follow the import style of `tests/reupload-guidance.test.ts`.

## 9. File ownership

| Stage | Owner | Files (exclusive) |
|---|---|---|
| A foundation | 1 agent, runs first | `src/styles/*` (new), `src/index.css`, `src/main.tsx`, `index.html`, `src/App.tsx`, `src/app-shell.css`, `src/assets/brand/*`, `src/assets/fonts/PretendardGOV/*`, `src/api.ts`, `src/components/{Icon,Spinner,Notice,ProgressBar,ConfirmDialog,Modal,Skeleton,StatusBadge}.tsx`, `src/components/{modal,skeleton}.css`, `src/forms/FormSheet.tsx` (DateTriple only) + the DateTriple rules it needs in `src/styles/components.css`, `src/hooks/*`, `src/lib/{format,error-copy}.ts`, `tests/{format,error-copy}.test.ts`, one-line prop additions in `ApplyFlow.tsx`, and moving the `.btn*` / `.flow__actions` rules out of `apply-flow.css` into `components.css`. Must leave the app compiling and every existing screen usable (old page CSS still loads). |
| B1 flow | parallel | `src/pages/applicant/{ApplyFlow.tsx,apply-flow.css,IdentityCheck.tsx,identity-check.css,MyPage.tsx,my-page.css}`, `src/components/SignaturePad.tsx`, `src/lib/{identity-validation,period}.ts`, `tests/identity-validation.test.ts` |
| B2 forms | parallel | `src/forms/PdfFormsWorkspace.tsx`, `src/forms/pdf-forms-workspace.css` |
| B3 upload | parallel | `src/pages/applicant/{DocumentUpload.tsx,document-upload.css,upload-queue.ts,reupload-guidance.ts}`, `src/lib/{upload-estimate,file-precheck}.ts`, `src/components/{FilePreview,FileLink,PdfPages}.tsx`, `src/components/file-preview.css`, `tests/{upload-queue,upload-estimate,file-precheck}.test.ts` |
| C integrate | 1 agent | cross-file fixes reported by B*, dead CSS (`skeleton.css` page rules, `index.css` leftovers, `--workspace-*`), `docs/USER_GUIDE.md`, `docs/DEVELOPMENT.md`, `demo/README.md`, `demo/docs/demo-script.md` (UI labels only), `THIRD_PARTY_NOTICES.md` (Pretendard GOV row, banner row), full verification |

## 10. Spec deltas to record at finish (`.trellis/spec/frontend/`)

The redesign deliberately replaces these earlier presentation rules; functional contracts are untouched.

- Title is 24px and the stepper sits under it at full width on every stage (was: 22px; step-2 title-left/progress-right).
- Sidebar status uses icon + text (still no pill badges); active item has a tinted background.
- Missing-required fields use a calm blue state until an attempt, then red (was: red from first render).
- Chrome reads `src/styles/tokens.css`; legacy `--brand` family remains only for the PDF sheet.
- Upload step: per-slot queue instead of a page-wide lock; single request in flight; results patched from the POST
  response then reconciled; reupload dialog auto-opens once per new failure fingerprint per tab.
- New conventions: tokens, component classes, `friendlyError`, `ConfirmDialog` instead of `window.confirm`, Node test location.

## 11. Risks and rollback

- Parallel agents share one working tree: ownership table prevents overlap; transient type errors from another agent's
  files are expected mid-stage and resolved in stage C.
- PDF sheet regression is the highest-impact risk → §0.3 freeze, AC8 diff check, P14 scenario run, before/after
  screenshots of 서식1·2·5 at the same viewport.
- Patching checklist state from the POST response could drift from server truth (NHIS pair re-check, substitutions) →
  always reconcile with a background refresh when the queue drains; submit still relies only on fresh server readiness.
- Font fetch may be unavailable → documented fallback.
- Everything is on branch `feat/applicant-public-redesign`; rollback is dropping the branch. No data migration.
