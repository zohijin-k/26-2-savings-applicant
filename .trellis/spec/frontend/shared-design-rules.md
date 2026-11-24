# Shared Applicant Design Rules

One set of tokens and style rules for the two applicant frontends:
`26-2-savings-applicant` (두배적금, 전북특별자치도) and `26-2-youth` (청년정책, 전북청년허브센터).
Structure, sizes and components are the same in both. Only the brand layer differs.

This file is byte-identical in both repositories. The source copy lives in `26-2-youth`.

## Files

| File (under `demo/frontend`) | Shared? | Owns |
| --- | --- | --- |
| `src/styles/ui-tokens.css` | shared (6B) | Fixed values used by both applicant apps and the youth officer screens: neutrals, status colours, type, space, radius, control heights. |
| `src/styles/tokens.css` | shared | Imports `ui-tokens.css` and `brand.css`, and maps them to the names screens read (`--color-*`, `--fs-*`, `--sp-*`, `--radius-*`, `--control-*`, layout). |
| `src/styles/brand.css` | **per business** | `--brand-5 … --brand-80`, `--brand-accent-1…3`, `--brand-tint-a/b`, `--brand-stripe`, `--logo-h`, `--logo-h-sm`. Same names in both repos, different values. |
| `src/styles/base.css` | shared | Fonts, body, headings, the single focus rule, `.sr-only`, `.skip-link`, reduced motion. |
| `src/styles/components.css` | shared | `.btn`, `.flow__actions`, `.field`, `.input`, `.select`, `.check`, `.radio`, `.date-triple--ui`, `.notice`, `.badge`, `.status-badge`, `.card`, `.spinner`, `.progress`, `.link`, `.fact-list`, `.dl-inline`, `.dialog`, `.more`, `.caution`, `.segmented`. |
| `scripts/sync-shared-styles.mjs`, `scripts/check-design-rules.mjs` | shared | Copy/compare the shared files; check these rules. |
| page and shell CSS | per repo | Layout only, built from tokens and the component classes. |

Import paths:
- Savings imports `tokens.css → index.css → base.css → components.css` from `src/main.tsx`.
- Youth imports `tokens.css → base.css → components.css → applicant-adapters.css → applicant-shell.css` from `pages/applicant/ApplicantApp.tsx` only, so none of it reaches the officer document. Never import the shared files from youth `App.tsx`, `api.ts` or officer code.

## Brand layer

- The primary colour is per business: `--color-primary`, `--color-primary-hover`, `--color-primary-pressed`, `--color-surface-brand` and `--color-text-brand` read `--brand-60/70/80/5/60`. Everything else (neutrals, status, focus ring, page background, borders) comes from `ui-tokens.css` and is identical.
- Youth brand values equal the 6B primary (`#173975` scale), so youth renders as before. Savings uses the banner blue (`#084090` scale).
- Accents, tints and the stripe are decoration only: never text, state or button colours. Savings magenta reads as an error.
- Screens never reference a business-specific name (`--jb-*`, `--stripe-N`). Add a new brand value to **both** `brand.css` files and to `BRAND_VARS` in `check-design-rules.mjs`.
- `brand-60` must reach 4.5:1 against white, `brand-5` and `brand-10`; `brand-70` against white. The check script verifies this.

## Style rules

- Colour literals (`#hex`, `rgb()`, `hsl()`) only in `ui-tokens.css`, `tokens.css`, `brand.css`, `index.css`, `forms/form-sheet.css`, rules that reproduce the original PDF (`.pdf-form__*`) and `@media print`.
- Type scale 13 / 15 / 16 / 17 / 19 / 22 / 24 / 28px through `--fs-*`. Body 16px, nothing below 13px, no px font sizes in chrome CSS.
- Radii 4 / 6 / 8 / 12px or pill through `--radius-*` (`0` and `50%` allowed). The 2px PDF field radius is a document exception.
- Breakpoints `max-width: 600px` and `900px` only.
- Control heights 40 / 48 / 56px (`--control-sm/md/lg`). Text inputs and selects are 56px with 17px text; checkboxes and radios are 24px on a 48px row. The primary action in `.flow__actions` is 56px.
- Required marks are the word 필수 in `--color-text-brand`, bold. Red is reserved for errors.
- One focus style in `base.css`. Do not add per-component focus outlines (PDF overlay inputs keep their own).
- Document status: `.badge--solid` (youth) and `.status-badge--uploaded / --reupload_required` (savings) are filled success/danger with white text; other badges are tinted.
- Dialogs: dim 60%, widths 400 / 560 / 760px, radius 12px, 24px padding, footer border on top, cancel left and action right, stacked full width at 600px. Savings `Modal` and youth `Dialog` both follow these values.
- No framed box on wide screens: header, body and footer run full width on the page background; content keeps its own `--shell-max` / `--content-max` columns.
- The header is `--shell-h` tall in both apps; the logo height comes from `--logo-h` / `--logo-h-sm`. The top stripe is `--brand-stripe`.

## Changing a shared file

1. Edit it in `26-2-youth/demo/frontend`.
2. `node scripts/check-design-rules.mjs` in both repos.
3. `node scripts/sync-shared-styles.mjs --to ../../26-2-savings-applicant/demo/frontend` (paths relative to `26-2-youth/demo/frontend`; adjust to your checkout).
4. `node scripts/sync-shared-styles.mjs --check <other demo/frontend>` must print that all shared files are equal.
5. Build both apps and look at both in a browser.

## Wrong / correct

```css
/* Wrong: business colour or literal in a screen file */
.pdf-forms__nav-item.is-active { box-shadow: inset 3px 0 0 var(--jb-blue-60); }
.dslot__badge { color: #fff; border-radius: 3px; font-size: 14px; }

/* Correct */
.pdf-forms__nav-item.is-active { box-shadow: inset 3px 0 0 var(--color-primary); }
.dslot__badge { color: var(--color-text-on-primary); border-radius: var(--radius-4); font-size: var(--fs-15); }
```
