# Applicant UI Foundation

Design system for the applicant screens (`demo/frontend/src`). Introduced by task `11-14-applicant-public-redesign`.
Brand reference: `demo/frontend/src/assets/brand/jb-banner.png` (전북특별자치도 · 전북청년 함께 두배적금 banner).

## Files and import order

`src/main.tsx` imports, in this order: `styles/tokens.css` → `index.css` → `styles/base.css` → `styles/components.css` → `App`.

| File | Owns |
| --- | --- |
| `styles/tokens.css` | Every colour, type size, space, radius, shadow, control size. The only chrome file with colour literals. |
| `index.css` | Legacy variables read by the PDF sheet only (`--text`, `--muted`, `--brand`, `--success`, `--border-strong`). Values are frozen. |
| `styles/base.css` | Root font, body 16px, headings, the single `:focus-visible` rule, `.sr-only`, `.skip-link`, reduced-motion block, Pretendard GOV `@font-face` (400/500/700, `font-display: swap`, self-hosted). |
| `styles/components.css` | `.btn`, `.field`, `.input`, `.select`, `.check`, `.radio`, `.notice`, `.badge`, `.status-badge`, `.card`, `.card__panel`, `.spinner`, `.progress`, `.link`, `.dl-inline`, `.flow__actions`, `.date-triple--ui`. |
| page CSS (`apply-flow.css`, `identity-check.css`, `my-page.css`, `document-upload.css`, chrome part of `pdf-forms-workspace.css`) | Layout only, built from tokens and the component classes. |

## Rules

- Chrome CSS reads `var(--…)` tokens only. Colour literals are allowed in `tokens.css`, `index.css`, `form-sheet.css` and the `.pdf-form__*` sheet rules — nowhere else.
- Type scale: 13 / 15 / 16 / 17 / 19 / 22 / 24 / 28px. Body is 16px; nothing below 13px. No half-pixel sizes.
- Radii: 4 / 6 / 8 / 12px or pill. Breakpoints: `max-width: 900px` and `max-width: 600px` only (plus `print`, `prefers-reduced-motion`).
- Primary colour is `--color-primary` (`#084090`, from the banner). `--jb-cyan` and `--jb-magenta` are decorative only: never text, never a state colour (magenta reads as an error).
- Buttons: `.btn` is the secondary look; `.btn--primary` once per view; `.btn--quiet` for reset/cancel; `.btn--danger` for destructive confirms. Heights follow three sizes: `.btn--lg` 56px (step CTAs), default 48px, `.btn--small` 40px.
- Never disable a primary action to signal missing input. Keep it enabled, and on press show what is missing and move focus there. `disabled` is for in-flight work only.
- Focus: one global rule in `base.css` (`outline: 3px solid var(--color-focus); outline-offset: 2px`). Do not add per-component focus styles. PDF overlay inputs keep their own and set `outline-offset: 0`.
- Icons: `<Icon name>` from `components/Icon.tsx` (inline SVG, `currentColor`). No Unicode glyph icons in chrome.
- Dialogs: `ConfirmDialog` (on `Modal`) replaces `window.confirm`. Modal content is portaled outside `.flow`, so everything it needs must be styled globally.
- Copy: 합쇼체. No invented facts (hours, addresses, time estimates other than the computed upload estimate). The approved text in `pages/applicant/reupload-guidance.ts` is fixed and may contain 해요체 titles; do not edit it for tone.
- Dates shown to applicants go through `lib/format.ts` (`formatDate` → `2026. 3. 3.`, `formatDateTime`, `formatBytes`, `formatDuration`).
- Phone numbers render through `components/PhoneLink.tsx` (`tel:` link).

## Error copy contract

```ts
// lib/error-copy.ts
friendlyError(err: unknown, fallback: string): string
// api.ts
class ApiError extends Error { readonly status: number; readonly detail?: string }
```

| Input | Text shown |
| --- | --- |
| `ApiError` with a string `detail` from the server | that detail |
| status 0, `TypeError`, "Failed to fetch" | `인터넷 연결을 확인한 뒤 다시 시도해 주세요.` |
| 5xx | `일시적인 문제로 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.` |
| 403 / 404 on an application | `신청 정보를 찾을 수 없습니다. 처음부터 다시 시작해 주세요.` |
| anything else | the caller's `fallback` |

`json()` / `form()` in `api.ts` already throw `ApiError` with a citizen-safe message, and `status` is still set, so callers that branch on 403/404 keep working.

### Wrong

```tsx
catch (e) { setError((e as Error).message) }        // can leak "GET /api/… 실패 (500)" or "Failed to fetch"
if (!ready) return <button disabled>본인인증</button> // silent dead end
```

### Correct

```tsx
catch (e) { setError(friendlyError(e, '저장하지 못했습니다. 다시 시도해 주세요.')) }
<button className="btn btn--primary btn--lg" onClick={submit}>본인인증</button> // submit() shows the error summary and focuses the first invalid field
```

## Scenario test constraint (P4 token scan)

`demo/backend/tests/run_p4_scenarios.py` fails if any `.py/.ts/.tsx/.css` under `demo/` (outside directories named `tests`, `node_modules`, `dist`) contains the substrings `download` or `attachment`, case-insensitive. Three frontend files are exempt (`forms/PdfFormsWorkspace.tsx`, `forms/pdf-forms-workspace.css`, `pages/applicant/DocumentUpload.tsx`); after the redesign none of them contains the words either. Avoid them in class names, attributes, icon names, comments and CSS properties (`background-attachment`). Use `fileDown`, `내려받기`, `save`.

## Tests

Pure modules have Node tests under `demo/frontend/tests/` (run from `demo/frontend`: `node --test tests/`; Node strips types, no bundler). A module under test must import cleanly in plain Node: no CSS imports, no `import.meta.env`, no pdf.js at module top level (inject it, as `lib/file-precheck.ts` does with `PdfProbe`).

## Dev data gotcha

> **Warning**: `demo/backend/api/applications.py::_next_application_no` numbers a new application as `row count + 1`. Deleting any row that is not the newest (for example `seed_application --clean` on an older application) makes every later `POST /api/applications` for that prefix fail with a UNIQUE error until the count catches up. In a shared dev database, clean only the newest row.
