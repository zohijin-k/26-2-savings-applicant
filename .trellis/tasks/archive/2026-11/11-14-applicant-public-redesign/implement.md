# Implement — 신청자 화면 공공서비스 리디자인

Branch: `feat/applicant-public-redesign` (from `main`). No commits by sub-agents; the main session drives the commit plan at finish.

Dev servers already running for this session: frontend `http://localhost:5175` (Vite, config
`demo/frontend/node_modules/.local-dev/vite.config.mjs`, proxies `/api` → backend), backend `http://127.0.0.1:8001`.
Do not start, stop or reconfigure them. Ports 8000/5173/5174 belong to other repositories.

Scratch directory (outside the repo, use for build output, capture scripts, logs):
`/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad`

## Stages

### A. Foundation (one agent, first)

- [ ] `src/styles/tokens.css`, `base.css`, `components.css`; `main.tsx` import order; `index.css` reduced to legacy sheet tokens (values unchanged).
- [ ] Pretendard GOV self-hosted (`npm pack pretendard-gov` in the scratch dir; copy 3 subset woff2 + licence). Fallback: system stack, report it.
- [ ] `Icon`, `Spinner`, `Notice`, `ProgressBar`, `ConfirmDialog`; restyle `Modal` (+ `size`, `closeOnOverlay`), `Skeleton`, `StatusBadge`.
- [ ] `DateTriple` `--ui` variant with `invalid` / `describedBy` / `idPrefix` / `onBlur`; sheet usages render as before.
- [ ] `hooks/useBeforeUnload`, `useElapsed`, `useDocumentTitle`; `lib/format.ts`, `lib/error-copy.ts` + tests.
- [ ] `api.ts`: `ApiError.detail`, citizen-safe messages in `json()` / `form()`, `uploadDocumentWithProgress` (XHR).
- [ ] Shell: `App.tsx` (skip link, header with banner, `<main>`, footer, `footerHost`, home `ConfirmDialog`, `onProgressChange`), `app-shell.css`, `index.html`, `src/assets/brand/jb-banner.png`.
- [ ] Move `.btn*` and `.flow__actions` into `components.css`; add optional `footerHost` / `onProgressChange` props to `ApplyFlow`.
- [ ] Gate: lint + both `tsc --noEmit` + frontend unit tests pass; every existing screen still loads at `http://localhost:5175`.

### B. Screens (three agents in parallel, exclusive files per design §9)

- [ ] B1 flow frame + stepper + step 1 + complete + MyPage (design §5).
- [ ] B2 step 2 chrome (design §6) — sheet geometry frozen.
- [ ] B3 step 3 upload pipeline + cards + submit confirm (design §7).
- [ ] Each: lint clean for owned files, own unit tests pass, final report lists any change needed in files not owned.

### C. Integration (one agent)

- [ ] Apply cross-file requests from B reports; resolve type errors.
- [ ] Delete dead CSS (grep-verified), remove `--workspace-*` once unreferenced.
- [ ] Docs: UI label changes in `docs/USER_GUIDE.md`, `docs/DEVELOPMENT.md`, `demo/README.md`, `demo/docs/demo-script.md`; `THIRD_PARTY_NOTICES.md` rows.
- [ ] Full verification (below) green.

### D. Review and fix (main session orchestrates)

- [ ] Screenshot pass at 1440×900 and 390×844 for every state in AC2/AC9/AC14, plus a 3.5 s delayed upload.
- [ ] Independent reviews: contract compliance (PRD R8, design §0), accessibility (keyboard, focus, live regions, contrast), citizen-copy/complaint risk, upload-queue correctness, visual consistency. Each finding verified before fixing.
- [ ] `trellis-check` full-scope pass.

## Validation commands

From `demo/frontend`:

```bash
npm run lint
npx tsc -p tsconfig.app.json --noEmit --incremental false
npx tsc -p tsconfig.node.json --noEmit --incremental false
npx vite build --outDir "<scratch>/dist-check" --emptyOutDir
node src/forms/phone.test.ts
node --test tests/
```

From the repo root:

```bash
.venv/bin/python -B -m pytest demo/backend/tests -q -x -p no:cacheprovider      # baseline 1339 passed
.venv/bin/python -B -m demo.backend.tests.run_p4_scenarios                       # baseline 통과 195 / 실패 0
.venv/bin/python -B -m demo.backend.tests.run_p14_pdf_forms_scenarios            # baseline [OK]
git diff --stat main -- demo/backend engine engine_v2                            # must be empty
grep -rniE "download|attachment" demo/frontend/src --include='*.ts' --include='*.tsx' --include='*.css' -l   # only the 3 exempt files
```

Baseline before this task: lint 0 errors / 1 warning (`StatusBadge.tsx` only-export-components), all others pass.
`timeout` does not exist on this macOS.

## Risky files / rollback points

- `src/forms/PdfFormsWorkspace.tsx` (960 lines): keep the diff out of the scale/box math; capture 서식1·2·5 before/after.
- `src/pages/applicant/DocumentUpload.tsx` (690 lines): mutation serialisation and readiness-generation guards must survive the queue rewrite.
- `src/api.ts`: error message changes must not break callers that branch on `ApiError.status` (403/404 draft discard in `ApplyFlow`).
- Rollback: `git checkout main -- demo/frontend` per stage, or drop the branch.

## Test data

Synthetic only. `PYTHONPATH=. python -B -m demo.backend.tools.seed_application --frontend-url http://localhost:5175`
skips step 2 after step 1 in the same tab; run `--clean` afterwards. Samples: `demo/fixtures/samples/`. Prior capture
scripts: `<scratch>/capture-tools/` (Playwright over installed Chrome).
