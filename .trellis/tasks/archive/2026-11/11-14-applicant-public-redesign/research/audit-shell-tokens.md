# Frontend foundation / shell / shared components — read-only audit

All paths relative to `/Users/zohijin/Desktop/26-2-savings-applicant/demo/frontend/`. Nothing was modified. Counts come from a script over the 11 CSS files under `src/` (comments stripped, 3-digit hex normalised).

## 1. Global design foundation

**Tokens — `src/index.css:2-30` (`:root`)**
- Form: `--form-border=#333`, `--form-label-bg=#f2f2f2` (both 0 uses)
- Text: `--text=#1a1a1a`, `--muted=#666`
- Brand/state: `--brand=#1f3864`, `--brand-tint=#eaf0fb`, `--success=#177245`, `--success-tint=#f2fbf5`, `--fail=#c00`, `--fail-tint=#fff5f5`, `--warning=#b8860b` (about 3.3:1 on white, fails AA as text), `--warning-tint=#fffaf0`
- Surfaces: `--border=#ddd`, `--border-strong=#bbb`, `--surface=#fff`, `--surface-subtle=#fafafa`
- Shape/motion: `--radius-sm=8px`, `--radius-md=12px`, `--radius-lg=18px`, `--shadow-sm=0 1px 3px rgb(20 20 30 / 6%)` (0 uses), `--shadow-md=0 12px 32px rgb(20 20 30 / 14%)`, `--ease=160ms ease`

**Second palette — `src/app-shell.css:93-98` (`.app-shell--applicant`)**
- `--workspace-accent=#315dcc`, `--workspace-ink=#233047`, `--workspace-muted=#66758b`, `--workspace-border=#dfe5ed`, `--workspace-tint=#edf3ff` (0 uses); page background `#f5f7fa`.
- These are scoped to the shell div, so they are undefined inside anything portaled to `document.body` (Modal, signature dialog). That is why CSS is littered with `var(--workspace-accent, #315dcc)` fallbacks.
- Other local tokens: `--skeleton-base/--skeleton-shine` (`skeleton.css:1-4`), `--sheet-w/--line/--label-bg/--band-bg/--note-hl` (`form-sheet.css`), `--stage-*`, `--forms-sidebar-width` (`apply-flow.css`).

**Fonts**
- Root stack (`index.css:32`): `'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif`. No webfont is loaded for UI text.
- The only `@font-face` rules are in `forms/pdf-forms-workspace.css:124-125`: Noto Sans KR and Noto Serif KR, weight 400 only, subset woff2 (166 KB / 341 KB), `font-display: block`. They exist for PDF overlay fidelity, and load only once the forms CSS is imported.
- UI bold (700 ×28, 600 ×14) therefore depends on OS fonts; on Android/Linux it becomes synthetic bold of a subset font.
- Base: `body { font-size: 14px; line-height: 1.6 }` (`index.css:42-46`).

**Colours actually used**
- 119 distinct hex values (276 occurrences) plus 25 distinct `rgb()` values.
- By family: 15 saturated blues, 30 slate greys, 31 cool near-white tints, 23 pure greys, 11 ambers, 6 reds, 3 greens.
- Worst file: `pdf-forms-workspace.css` has 50 distinct hex in 199 lines; `apply-flow.css` 23, `form-sheet.css` 26.
- Three competing accent blues: `--brand #1f3864` (46 `var()` uses), `#315dcc` (11 literal + 14 `var()`), `#0b57d0` (9, `form-sheet.css`). Further blues: `#112861`, `#284fb5`, `#16294d`, `#284166`, `#30496f`, `#284b8d`, `#496ab5`, `#101d42`.
- Reds: `#c00`, `#a22` ×4, `#c33` ×3. Ambers: `#b8860b`, `#b06000` ×4, `#b45309` ×2, `#b26a00`, `#bb7b16`, `#8a4b00`.
- Two muted systems coexist: neutral (`#666/#444/#555/#777/#888/#8a8a8a`) and slate (`#66758b` plus 29 one-off neighbours such as `#626f82/#637186/#606e82/#62728b`).

**Type, radius, shadow, breakpoints**
- Font sizes: 20 distinct, 10–28px, including 10.5/11.5/12.5/13.5/14.5. Most used: 12.5px ×30, 12px ×29, 13px ×28, 11px ×20. Excluding `form-sheet.css`, 76 of 141 px declarations are below 13px.
- Radii: 14 distinct literals (0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18px, 50%, 999px) alongside the 3 tokens.
- Shadows: 15 distinct values, 5 different shadow tints (`rgb(20 20 30)`, `(15 30 60)`, `(25 43 72)`, `(31 48 76)`, `(0 0 0)`).
- Breakpoints: 8 distinct max-widths (520, 560, 580, 800, 850, 900, 960, 1000). One `@media print` (`document-upload.css:18-47`).
- Container widths: `.flow { width: 940px }` (`apply-flow.css:4`), forms 1160px (`:24`), shell inner 1160px (`app-shell.css:103`), my-page 940px.

**Focus and motion**
- No global `:focus-visible` rule; five ad-hoc patterns:
  1. `outline: 2px solid var(--workspace-accent)` (`apply-flow.css:87`, `pdf-forms-workspace.css:20,44`)
  2. `outline: 2px solid var(--brand)` (`pdf-forms-workspace.css:129,139,143,180,192`)
  3. `outline: none; box-shadow: 0 0 0 3px var(--brand-tint)` (`apply-flow.css:196-200`, `identity-check.css:89-93`) — a `#eaf0fb` ring on a `#f5f7fa` page is nearly invisible
  4. `outline: 3px solid color-mix(var(--brand) 35%)` (`document-upload.css:145-150`)
  5. `#0b57d0` underline/outline (`form-sheet.css:129,233`)
- No focus style at all: `.modal__close`, `.fpreview__zoom button`, `.file-link`, base `.btn`.
- `prefers-reduced-motion` is handled only in `skeleton.css:59,84` (shimmer, spinner). Modal `modal-fade/modal-pop` and all transitions are unguarded.

## 2. App shell

- `index.html`: `lang="ko"`, viewport, static `<title>전북청년 함께 두배적금 신청</title>`. No favicon (no `public/`, no `<link rel=icon>`), no meta description, no theme-color, no `<noscript>`. The title never changes per step.
- `App.tsx:25-38`: the whole frame is `div.app-shell > nav.shell[aria-label="두배적금 신청"] + ApplyFlow`. There is no `<header>`, `<main>`, `<footer>` or skip link. The `<nav>` holds no navigation, only a 30×30 `#284166` square button reading "전북" (`aria-label="두배적금 본인인증으로 이동"`), the title `<strong>`, and a portal host.
- `app-shell.css:4-90` is a dead navy theme, fully overridden by `:93-123`. `.shell__title small` is never rendered.
- Portaled into the header by `ApplyFlow.tsx:353-358`: `신청번호 <strong>` at 11/12px and a 32px `마이페이지` button.
- `ApplyFlow.tsx:361` renders `<h1>{program.name} 신청</h1>` directly under the header, so the service name appears twice stacked.
- Boot state is bare text: `<p className="flow" role="status">두배적금 본인인증을 준비하고 있습니다...</p>` (`:253`). Error state is raw `e.message` plus `다시 시도` (`:252`).
- **Complaint risk:** clicking the "전북" mark calls `goToHome()` (`navigation-url.ts:34-38`), which clears the sessionStorage id and starts a brand-new draft with no confirmation. This is spec-intended (`.trellis/spec/frontend/state-management.md`), but to a citizen it is "I clicked the logo and lost my application".
- Missing for a government service:
  - official agency identity (전북특별자치도 CI or 누리집 banner; the mark is a fake seal)
  - footer with 담당부서, 문의전화, 운영시간, 개인정보처리방침, 저작권
  - a help or contact entry point in the frame (a 문의 number exists only inside MyPage)
  - 신청기간 or deadline notice
  - save-state reassurance ("자동 저장됨")
  - session/timeout notice
  - per-step document title
  - skip link and `<main>`

## 3. Shared components

| Component | API | Notes |
|---|---|---|
| `Modal.tsx` | `title, description?, onClose, returnFocus?, children, footer?, variant='default'｜'viewer'｜'printable-viewer'｜'reupload'` | Portal to a body-level host. Good accessibility: `role=dialog`, `aria-modal`, labelledby/describedby, siblings set `inert`, body scroll lock, stacked-dialog guard, Tab trap, Esc, focus to `<h3 tabIndex=-1>`, focus return. Weak points: overlay click closes; close is a "✕" glyph at 28×28 with no focus style; title is always `<h3>`; `printable-viewer` is never used, so the print CSS is dead. |
| `Skeleton.tsx` | `Skeleton{children,className,label='불러오는 중',style}`, `SkeletonLine{width,className}`, `SkeletonBlock{className}`, `SkeletonCard` | `role=status aria-busy` plus sr-only label. Shimmer base is `--border-strong #bbb`, a heavy dark-grey bar. `skeleton.css:68-91` is a dumping ground for page rules (`.dslot__spinner`, `.status-badge--loading`, `.dresult__*`, `.mypage__*`). |
| `StatusBadge.tsx` | `status: DocStatus` | Only `UPLOADED` → "✓ 업로드 완료" and `REUPLOAD_REQUIRED` → "↻ 다시 올려 주세요". Text glyphs, 12px pill; CSS in `index.css:48-65`, loading variant in `skeleton.css:73`. `--compact` is unused. |
| `FilePreview.tsx` | `url, name, kind:'pdf'｜'image', onClose` | Viewer modal with 6 zoom widths. Zoom buttons are 28px "−/+"; the percent button has `title="원래 크기로"` but no aria-label. No image loading state. Stage background `#e6e9ee`. |
| `FileLink.tsx` | `url, name, format` | Underlined `--brand` button with `cursor: zoom-in`, no focus style. |
| `PdfPages.tsx` | `url, width, maxHeight?, maxPages?, pageNo?, onPageCount?, onReady?, onError?, className?` | pdf.js canvases with `aria-label="N쪽"` (no `role=img`). Renders `null` for the first 150ms, then a skeleton. Error is `PDF를 열 수 없습니다.` with no retry. |
| `hooks/useDelayedFlag.ts` | `(active, delay=150)` | Delays showing only. There is no minimum display time and no elapsed-time or staged-message hook, so nothing reusable exists for long OCR waits. |

**Inconsistencies between components**
- Two modal implementations. `Modal` uses a 45% overlay, `--radius-lg`, 16px h3 and a round ✕. The signature dialog (`PdfFormsWorkspace.tsx:903-931`, `pdf-forms-workspace.css:172-195`) is hand-rolled: 50% overlay, literal `18px`, 22px h3, a 28px "×" glyph, z-index 110 vs 100.
- Buttons inside either dialog sit outside `.flow`, so they get only the base `.btn` (`apply-flow.css:137-168`): `#888` border, `8px 20px` padding, no min-height, no focus ring. In-page buttons get `.flow .btn` (`:171-200`): 42px, `#c3cad5` border.

## 4. What makes it look 조잡

1. Two unreconciled themes: neutral-grey + navy (`index.css` tokens) versus slate + `#315dcc` (workspace). They meet on the same screen.
2. Two primary button colours: `.flow .btn--primary` is navy `#1f3864` (`apply-flow.css:202`), but `.flow__actions > .btn--primary` is `#315dcc` (`:215`). The reupload modal, the completion "마이페이지" button and the signature "확인" are navy; step CTAs are blue.
3. Seven control heights: 26 (`pdf-forms-workspace.css:50`), 28 (modal close, zoom), 30 (`document-upload.css:131`), 32 (`btn--small`, mypage, panel actions), 36 (`document-upload.css:355`), 38 (`identity-check.css:42,65`), 42 (`.flow .btn`).
4. Fourteen radius literals, including 5/6/7/8/9/10px side by side (`app-shell.css:107,112` use 8 and 7 within the same header).
5. Twenty font sizes with half-pixel steps; most UI text is 11–13px on a 14px base. Stepper caption is 11px, dropping to 10px under 580px (`apply-flow.css:81,109`). For a public service the body should be 16px or larger.
6. 119 hex colours with about 60 one-off slate and tint values.
7. Icons are Unicode glyphs (✓ ✕ × ↻ ⓘ − +) that render differently per OS font; only two inline SVGs exist.
8. Five focus-ring styles, and four controls with none.
9. Eight breakpoints with no shared scale.
10. Fifteen shadows in five tints.
11. Duplicate or dead CSS: `.btn` is defined twice (`apply-flow.css:137` and `:171`); the navy shell is dead; `.flow__sub`, `.flow__gap`, `.flow__submission-order`, `.flow-block--stop`, `.status-badge--compact`, `--shadow-sm`, `--workspace-tint`, `--form-border` and `--form-label-bg` are unused.
12. The stepper (`apply-flow.css:61-95`) uses 20px nodes, a 1px line and grey `#8e9db0` "complete" dots, so done and waiting are hard to tell apart. It needs about 15 special-case rules for `.flow--forms` alignment.
13. Header title "전북청년 함께 두배적금 신청" is immediately followed by an identical h1.

## 5. Routing and navigation — do not break

- **URL model:** `/apply/{identity|forms|upload|complete|mypage}`. `/apply/final` and `?from=final` alias to upload (`ApplyFlow.tsx:42-44`). `?from=<stage>` is set only for mypage (`:201`). Unknown paths normalise to `/apply/identity`.
- **No id in the URL.** The application id lives in sessionStorage under `applicant.activeApplicationId` (`navigation-url.ts:1`), tab-scoped. The spec forbids putting an id or applicant data in URLs.
- **History:** the first write is `replaceState`, later ones `pushState` (`:201-202`). `routeUrl` strips `NAVIGATION_PARAMS` but preserves other query params and the hash.
- **Back/forward:** `popstate` bumps `key` on `<ApplyFlow>` (`App.tsx:12-16,37`), causing a full remount and refetch of programs, application, consents and status. The bare "준비하고 있습니다..." text therefore flashes on every Back; this is a perceived-speed target. Consent radio choices that have not been flushed live only in state.
- **Refresh:** restores the stage from the pathname if the saved application fetch succeeds and is `double_savings`. A 403/404 silently creates a new draft; other errors show the retry screen. `complete` with a draft status falls back to upload.
- **Deep link:** `/apply/upload` without identity is allowed and shows `본인인증 전입니다.` (`:446-456`). `backend/tools/seed_application.py:359` and `backend/tests/test_seed_application.py:136,211` assert the `/apply/upload` path string.
- **New tab** always starts a new draft.
- **Contracts to keep:**
  - the `headerHost` portal (`App.tsx:10,34` ↔ `ApplyFlow.tsx:353`)
  - the `key={applicantKey}` remount
  - module-level `pendingDraft` and `applicationGeneration` (StrictMode dedupe)
  - `flushForms` before leaving forms (`stepperNavigate`, `openMyPage`)
  - stepper semantics: `aria-current="step"`, `aria-disabled` rather than `disabled`, step 1 never re-enterable, navigation blocked while `formContinuing` or `uploadBusy`
  - `.flow--forms` / `.flow--fluid` width classes, on which PDF overlay scaling depends
  - the Noto `@font-face` rules with `font-display: block`, and all `.pdf-form__*` / `form-sheet.css` tokens
- **Hosting:** the backend has no SPA fallback (no `StaticFiles` or index route). Production hosting must rewrite `/apply/*` to `index.html` or refresh will 404.
- **Tests:** the only frontend test is `tests/reupload-guidance.test.ts` (logic, not DOM). `backend/tests/run_p4_scenarios.py:641-643` references `PdfFormsWorkspace.tsx`, `pdf-forms-workspace.css` and `DocumentUpload.tsx` by path, so do not rename them.
