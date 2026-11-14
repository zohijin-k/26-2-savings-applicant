# Read-only understanding report: constraints, verification baseline, Trellis mechanics

Repo untouched by me (`git status`: only `?? jb.png` and `?? .trellis/tasks/11-14-applicant-public-redesign/`, the latter created at 00:29 by another actor during my run). My logs and a build output sit outside the repo in `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/` (`pytest-understand.log`, `understand-run_p4_scenarios.log`, `understand-run_p14_pdf_forms_scenarios.log`, `dist-understand/`).

## 1. Verification commands (all currently pass)

| What | Command (cwd) | Result |
|---|---|---|
| Lint | `npm run lint` (`demo/frontend`) | exit 0, 0 errors, 1 warning: `src/components/StatusBadge.tsx:3:14 react(only-export-components)` (documented baseline) |
| Typecheck, no writes | `npx tsc -p tsconfig.app.json --noEmit --incremental false` and same for `tsconfig.node.json` (`demo/frontend`) | both exit 0 |
| Build, out of repo | `npx vite build --outDir <scratchpad>/dist-understand --emptyOutDir` (`demo/frontend`) | exit 0; JS 723.42 kB (gzip 218.80), CSS 62.51 kB, `pdf.worker` 1,232 kB, Noto Sans 166 kB, Noto Serif 341.5 kB; >500 kB chunk warning |
| Frontend unit: phone | `node src/forms/phone.test.ts` (`demo/frontend`) | exit 0 (plain throw-on-fail script) |
| Frontend unit: reupload | `node --test tests/reupload-guidance.test.ts` (`demo/frontend`) | 16 pass / 0 fail |
| Backend pytest | `.venv/bin/python -B -m pytest demo/backend/tests -q -x -p no:cacheprovider` (repo root) | 1339 passed, 9 warnings, 85.76s |
| Scenario P4 | `.venv/bin/python -B -m demo.backend.tests.run_p4_scenarios` (repo root) | 통과 195 / 실패 0 |
| Scenario P14 | `.venv/bin/python -B -m demo.backend.tests.run_p14_pdf_forms_scenarios` (repo root) | `[OK] 8개 원본 서식, 좌표·렌더링·예시 제거 검증` |

- **No test runner:** `package.json` has no `test` script and no vitest; Node v26.13.1 runs the `.ts` files directly.
- **`npm run build` writes into the repo:** it is `tsc -b && vite build`, which writes `dist/` and `node_modules/.tmp/*.tsbuildinfo` (both gitignored). The documented check is `npx tsc -b && npx oxlint && npx vite build` (`docs/DEVELOPMENT.md:138`).
- **Docs baseline is stale:** `docs/DEVELOPMENT.md:132` says backend 1,227 passed; the actual count is 1,339.
- **`timeout` does not exist on this macOS.**
- **Not run:** the other 16 scenario modules and `engine_v2/tests`.

## 2. Decisions a redesign must respect

- **Original-PDF fidelity:** "do not reflow its cells into a replacement form"; scale background, masks, inputs and page height by the same `pageWidth / pageSize.width` (`.trellis/spec/frontend/pdf-form-workspace.md:11`). "Changing the surrounding spacing must not change the PDF renderer" (`:41`).
- **Styling scope:** "Do not change global `--brand`, document fonts, PDF field colors/coordinates or assets to restyle navigation"; keep the "light top bar" and keep primary save/continue distinguishable from secondary and quiet actions (`:47`). `--brand: #1f3864` is in `src/index.css:12`; its comment says the 판정 3색 values must not change.
- **Stage strip:** "connected horizontal line with circular markers"; not "per-stage cards or faint underline-only labels"; `aria-current`; explicit status text, not colour only (`:43`). Title keeps `.flow__head h1` at 22px (`:49`). No second workspace heading or always-reserved save-guidance row (`:41`).
- **Form order:** public form order comes from API `public_form`; never sort internal ids client-side (`:13`).
- **Save transitions:** `onFlush` before any document switch or preview; no navigation in `finally` (`:17-33`).
- **Form 5 signature dialog:** owns Escape, scroll lock, focus trap and focus return (`:37`).
- **Three steps only:** legacy `/apply/final` normalises to upload; keep `/final-check` (`:55`).
- **No internal results to applicants:** "Never display raw internal findings or confidence"; "UPLOADED means upload complete, not eligibility approval"; only the ten reupload codes at FAIL; fixed guidance copy; no interpolation of other people's identity or guessed dates (`:59`). Approved modal copy is in `.trellis/tasks/archive/2026-11/11-13-savings-applicant-submit/modal-copy.md` (title `다시 올려야 할 서류를 확인해 주세요`).
- **Applicant status labels:** only `업로드 완료` / `다시 올려 주세요` (`frontend-decisions.md` in the same archive).
- **No scores:** "점수는 신청자에게 절대 보이지 않는다" (`demo/README.md:280`); "신청자 화면에 배점·내부 판단 정보·서류 속 타인의 이름을 노출하지 않습니다" (`docs/DEVELOPMENT.md:149`).
- **IDs and URLs:** stage-only paths; id in `sessionStorage['applicant.activeApplicationId']`; never from the URL; Home starts a fresh draft; top-bar application number and My Page are portalled from `ApplyFlow` into the host owned by `App` (`.trellis/spec/frontend/state-management.md:27-31`).
- **PC-first:** "PC 전용… 폭 940px 고정 레이아웃… 가로 스크롤만" (`demo/README.md:12`; `apply-flow.css:4` `width: 940px`, relaxed under 960px at `:114-115`).
- **Demo identity wording:** `IdentityCheck.tsx:206` shows "데모 화면입니다. 실제 서비스에서는 로그인할 때 휴대폰·간편인증으로 대신합니다." `docs/USER_GUIDE.md:9` says it is not a real 인증기관 login. Removing or rewording it for production is a product decision, not a styling one.
- **`(데모 추정치)` labels** are required on unconfirmed values (`demo/README.md:282`).
- **Synthetic data only** (`demo/README.md:15`, `docs/DEVELOPMENT.md:155`).
- **Fonts:**
  - UI stack is `'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo','Noto Sans KR',system-ui` (`index.css:32`), body 14px / 1.6.
  - The bundled Noto subsets are form fonts only: weight 400, `font-display: block`, KS X 1001 2,350 glyphs (`pdf-forms-workspace.css:124-125`). They are unsuitable as a UI font (no bold, missing glyphs).
  - Nothing forbids a new UI webfont. Existing practice is to self-host under `src/assets/fonts/<Family>/` with `OFL.txt` beside it, plus a row in the `THIRD_PARTY_NOTICES.md` table (항목 | 출처·버전 | 라이선스 표기 | 저장소 포함 | 출처), including copyright and Reserved Font Name.
  - The Noto Sans RFN question is already flagged unresolved there (`THIRD_PARTY_NOTICES.md:16`).
  - The app makes no external or CDN requests today.
- **New task's own decisions** (`.trellis/tasks/11-14-applicant-public-redesign/prd.md`): no backend changes, frontend-only perceived speed, `jb.png` as the design reference.

## 3. Trellis checklist (developer `codex`)

- [x] **Identity:** `.trellis/.developer` has `name=codex`. `.trellis/workspace/codex/` does not exist (only `hcw889`, `rlawlqls`), which may matter for `add_session.py` at finish.
- [x] **Task exists:** `.trellis/tasks/11-14-applicant-public-redesign/` has status `planning`, creator and assignee `codex`, `base_branch: main`, `branch: null`. The session pointer `.trellis/.runtime/sessions/claude_0bd76493-….json` targets it. Do not run `create` again.
- [ ] **Artifacts for a complex task:** `prd.md` (requirements and AC only; currently TBD), `design.md` and `implement.md` must all exist before start. Research goes in `research/*.md`.
- [ ] **Manifests:** `implement.jsonl` and `check.jsonl` are in the task dir and are 0 bytes (v0.6.17 seeds them empty, with no `_example` row). Fill them with:
  - `python ./.trellis/scripts/task.py add-context 11-14-applicant-public-redesign implement <repo-relative path> "<reason>"`, and the same with `check`.
  - Line format is `{"file": "...", "reason": "..."}`. List specs and research only, not code files.
  - Precedent entries: `.trellis/spec/frontend/index.md`, `pdf-form-workspace.md`, `state-management.md`, `.trellis/spec/backend/applicant-submission.md`, `guides/code-reuse-thinking-guide.md`, and task research.
- [ ] **Validate and start:** `python ./.trellis/scripts/task.py validate <name>`, then after artifact review `python ./.trellis/scripts/task.py start 11-14-applicant-public-redesign`. Start refuses with "have no curated entries" unless `--allow-empty-context` is passed; it sets the status to `in_progress`.
- [ ] **Branch:** `git checkout -b feat/<…>` (no direct push to main, `docs/DEVELOPMENT.md:39-43`), then `task.py set-branch`.
- [ ] **Dispatch:** agent types `trellis-implement` then `trellis-check` (`.claude/agents/`). The prompt's first line must be `Active task: .trellis/tasks/11-14-applicant-public-redesign`, and it must tell the agent it is already that sub-agent.
- [ ] **How sub-agents get context:** the PreToolUse hook on `Task`/`Agent` (`.claude/hooks/inject-subagent-context.py`) inlines the jsonl-listed files plus `prd.md`, `design.md` and `implement.md`, marked `<!-- trellis-hook-injected -->`. Default caps are 32 KB per file, 64 KB per artifact, 128 KB total. If the marker is absent, the agent must read those files itself. The implement agent may not commit, push or merge.
- [ ] **Finish:** `trellis-update-spec`, then one commit plan confirmed by the user (no amend, no push), then `/trellis:finish-work`. Commit style is `feat(applicant): …`; archive commits are `chore(task): archive <name>`.
- `python` resolves to `.venv/bin/python` 3.14.6. Frontend specs other than `pdf-form-workspace.md` and `state-management.md` are unfilled templates.

## 4. Strings and hooks that tests and tools rely on

- **P4 token scan (highest risk):** `run_p4_scenarios.py:645-668,725` fails if any `.py/.ts/.tsx/.css` under `demo/` contains `download` or `attachment`, case-insensitive. Directories named `tests`, `node_modules`, `dist` are skipped. Only three frontend files are exempt: `frontend/src/forms/PdfFormsWorkspace.tsx`, `frontend/src/forms/pdf-forms-workspace.css`, `frontend/src/pages/applicant/DocumentUpload.tsx`. Elsewhere, CSS `background-attachment`, a `.download-*` class, an `<a download>` or an English comment with either word breaks it. Today only the first two files contain the tokens.
- **Font files:** `run_p14_pdf_forms_scenarios.py:50-58` and `backend/forms/render.py:40` need `src/assets/fonts/NotoSansKR/NotoSansKR-subset.{ttf,woff2}` + `OFL.txt` and the NotoSerifKR equivalents at those exact paths. `run_p7_scenarios.py:458` uses the Sans TTF.
- **Unit-test imports:** `tests/reupload-guidance.test.ts` imports `REUPLOAD_GUIDANCE`, `reuploadFindings`, `issuerLink` from `src/pages/applicant/reupload-guidance.ts` and type `Finding` from `src/api.ts`; it asserts exactly ten codes. `phone.test.ts` imports `formatPhone`, `isValidPhone`.
- **Seed tool:** `seed_application.py:359` prints `…/apply/upload` and relies on same-tab `sessionStorage`; keep that route and key.
- **DOM ids used for focus and scroll:** `slot-${slot_key}`, `upload-${slot_key}`, `work-context`, `reupload-guidance-trigger`, `submission-heading`, `reupload-${slot_key}` (`DocumentUpload.tsx:247,313,461-472,519,646-675`); `pdf-form-panel`, `pdf-form-panel-title`, `form-signature-file` (`PdfFormsWorkspace.tsx:861-921`); `identity-sign-file` (`IdentityCheck.tsx:323`); Modal `${id}-title` and `${id}-description`; `#root`.
- **Upload busy state (the OCR-wait surface):** `aria-busy` and `inert` wrap the whole upload page while one slot is busy (`DocumentUpload.tsx:515-516`). The status copy is `서류를 올리고 확인하고 있습니다…` (`:645`), with a `useDelayedFlag` skeleton (`:229,322`).
- **Docs quoting UI:** `docs/USER_GUIDE.md` and `demo/docs/demo-script.md` (e.g. `:103` "올리기 전에 꼭 확인하세요") are already partly stale; label changes need doc touch-ups.

## 5. Overlap with other in-progress tasks

Git conflict risk is effectively nil. The working tree is clean, there are no worktrees, the only remote branch is `origin/main` (not fetched), and local `feat/documentai-measurement` is 0 commits ahead of main.

The six `in_progress` tasks are stale metadata carried over from the pre-split repo (creators `rlawlqls` and `Develope-SYNE`, notes "Python unavailable… awaiting commit approval"). Their code is already on main.

| Task | Files it names or covers | Status of its decisions |
|---|---|---|
| `11-13-savings-inline-forms` | `App.tsx`, `app-shell.css`, `forms/PdfFormsWorkspace.tsx`, `forms/pdf-forms-workspace.css`, `pages/applicant/ApplyFlow.tsx`, `apply-flow.css`, three frontend specs | R9-R16 are the user's prior visual sign-offs and are the layout rules now in the spec (compact header, connected rail, plain sidebar list, 22px title). Its "four markers" wording is superseded by three steps. A redesign rewrites exactly these files, so those rules need a conscious keep or override in the new PRD. |
| `11-13-hide-applicant-id` | `ApplyFlow.tsx`, `state-management.md` | Binding. |
| `11-13-identity-signature-ui` | no files listed; subject is the identity-check signature area | Implemented; keep the 직접 서명 / 서명 파일 올리기 tabs, and no horizontal overflow on small screens. |
| `11-13-refresh-navigation` | no files listed | Superseded (ids in the URL, program selection). |
| `11-10-forms-on-pdf`, `11-11-paper-flow` | no files listed | Still binding in substance: original-PDF writing; form 5 online vs 스캔본 choice with a mode-switch confirmation. The employment-package parts were removed. |
