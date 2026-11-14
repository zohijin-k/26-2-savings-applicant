# KRDS / KWCAG / perceived-wait research for the applicant redesign

**Provenance.** "V" = read from a primary file or page this session; "S" = small-model summary of a fetched page; "R" = recall, not fetched. Token values come from the official repo file `resources/css/token/krds_tokens.css` (generated 2024-12-09), saved at `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/krds_research/krds_tokens.css`. SCSS, component HTML and krds.go.kr page text are in the same folder. Contrast ratios are my own calculation.

Three things I could not verify:
- **KRDS copyright policy:** `utility_05.html` and `utility_06.html` on krds.go.kr return an empty template.
- **Applicability to 지자체:** I found no primary source for whether KRDS is mandatory for local governments.
- **전북특별자치도 CI colours:** no official values found.

## 1. Tokens (V)

KRDS rem values assume `html{font-size:62.5%}` (`_variables_for_code.scss`), so 1rem = 10px. Convert to px if the app keeps a 16px root.

| Scale | 5 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 95 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| primary | #ecf2fe | #d8e5fd | #b1cefb | #86aff9 | #4c87f6 | **#256ef4** | #0b50d0 | #083891 | #052561 | #03163a | #020f27 |
| secondary | #eef2f7 | #d6e0eb | #bacbde | #90b0d5 | #6b96c7 | #346fb2 | #1c589c | **#063a74** | #052b57 | #031f3f | #02162c |
| gray | #f4f5f6 | #e6e8ea | #cdd1d5 | #b1b8be | #8a949e | #6d7882 | #58616a | #464c53 | #33363d | #1e2124 | #131416 |
| danger | #fdefec | #fcdfd9 | #f7afa1 | #f48771 | #f05f42 | #de3412 | #bd2c0f | #8a240f | #5c180a | #390d05 | #260903 |
| warning | #fff3db | #ffe0a3 | #ffc95c | #ffb114 | #c78500 | #9e6a00 | #8a5c00 | #614100 | #422c00 | #2e1f00 | #241800 |
| success | #eaf6ec | #d8eedd | #a9dab4 | #7ec88e | #3fa654 | #228738 | #267337 | #285d33 | #1f4727 | #122b18 | #0e2012 |
| information | #e7f4fe | #d3ebfd | #9ed2fa | #5fb5f7 | #2098f3 | #0b78cb | #096ab3 | #085691 | #053961 | #03253f | #021a2c |

Gray also has 0 = #ffffff and 100 = #000000. Point 50 is #d63d4a.

**Semantic mapping (light mode)**
- **Text:** basic gray-90, bolder gray-95, subtle gray-70, disabled gray-40, primary primary-60. Status text uses the -60 step.
- **Border:** light gray-20, default gray-30, dark gray-60. Input border is gray-60, active primary-50, error danger-50. Divider light is gray-20.
- **Surface and background:** white; gray-subtler gray-5; gray-subtle gray-10; disabled gray-20; dim #000000bf. Status surfaces use the -5 step, status borders -10 (light) or -50.
- **Buttons:** primary fill primary-50, hover -60, pressed -70. Secondary is primary-5 fill, primary-50 border, primary-60 text. Tertiary is transparent with a gray-60 border and gray-90 text. Disabled is gray-20 fill, gray-30 border, gray-50 text.
- **Links:** primary-50, visited #5917b8.

**Contrast on white**

| Pair | Ratio | Consequence |
|---|---|---|
| primary-50 | 4.55 | Just passes AA; use primary-60 (6.83) for blue text |
| gray-50 | 4.51 | Borderline for body text |
| gray-40 (disabled, placeholder) | 3.08 | Not for real content |
| gray-30 border | 2.01 | Fails 3:1; use gray-60 (6.30) for input borders, as KRDS does |
| gray-70 | 8.68 | Safe secondary text |
| Status -60 on -5 | 5.0–5.3 | Passes AA |

**Typography**
- **Family and weights:** `"Pretendard GOV", sans-serif`; 400 and 700 (500 optional). (V)
- **Rules:** line-height 1.5 everywhere, `word-break: keep-all`, body minimum 16px, KRDS default body **17px**. (V for the CSS; S for the page rules)
- **PC / mobile sizes in px (V):**
  - Display 60/44, 44/32, 36/28.
  - Heading xl 40/28, l 32/24, m 24/22, s 19, xs 17, xxs 15.
  - Body and label l 19, m 17, s 15, xs 13.
- **Letter-spacing:** 1px on display and heading xl/l. (S)

**Spacing, radius, shadow, layout (V)**
- **Spacing (px):** primitives 0, 1, 2, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96.
  - gap-1..12: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.
  - padding-1..10: 2, 4, 8, 10, 12, 16, 20, 24, 32, 40.
  - PC rhythm: h1→h2 48, h2→h2 80, h2→h3 40, h3→h3 64, title→body 16/20/24, card padding 40/32/24/16.
- **Radius:** 2 / 4 / 6 / 8 / 10 / 12 px, plus max. The shape page caps it at 12px: "과하게 둥근 형태로 변형되는 것을 방지". Buttons and inputs use 6–8, cards 10, modals 12.
- **Shadow:** alpha tokens shadow1 #0000000d, shadow2 #00000014, shadow3 #0000001f.
  - Low: `0 0 2px shadow1, 0 4px 8px shadow2`.
  - Mid: `0 0 2px shadow2, 0 8px 16px shadow3`.
  - Modal: `0 0 2px shadow2, 0 16px 24px shadow3`.
- **Breakpoints:** 360 / 768 / 1024 / 1280 / 1440. Content max 1200px; screen margin 24px, 16px on small.
- **Target size:** the KRDS button page recommends 17×17px for mouse and 44×44px for touch.
- **Focus ring (`_reset.scss`):** `*:focus{outline:2px solid #fff; outline-offset:0; box-shadow:0 0 0 4px #256ef4}`. Inputs instead switch to a 2px primary-50 border.

## 2. Component conventions (V unless marked)

- **Masthead:** text "이 누리집은 대한민국 공식 전자정부 누리집입니다." on secondary-5 #eef2f7, 15px, min-height 32px, flag icon.
  - It sits at the top of every screen, with the skip link before it; text and style must not be altered.
  - "공식 디지털 정부서비스가 아닌 사이트에서는 배너를 사용하지 않아야 한다."
  - It is defined for services run by "대한민국 정부 조직 및 관련 기관". Put it behind a build flag, off for demo, and have the agency confirm.
- **Identifier:** last block inside the footer, with the operating agency's logo (not the service logo). Text pattern: "이 누리집은 [운영기관명]에서 운영하는 누리집입니다."
- **Footer sample:** service logo, address, 대표전화 with hours, utility links, 개인정보처리방침 (emphasised), 저작권 정책, 웹 접근성 품질인증, copyright line, identifier.
- **Step indicator:**
  - Markup is `<ol>`; each item has "N단계" (13px, gray-70) and a title (15px bold, nowrap).
  - Dot is 20px, connector 3px. Done is gray-50 with a check; active is primary-50 with sr-only "현재단계" or `aria-current`.
  - Use 3–7 steps with short labels, and never distinguish state by colour alone.
  - The KRDS sample is 유의 사항 확인 → 신청인 정보 → …
- **Buttons:**

  | Size | Height | Padding-x | Radius | Font |
  |---|---|---|---|---|
  | xsmall | 32 | 10 | 4 | 15 |
  | small | 40 | 12 | 6 | 15 |
  | medium | 48 | 16 | 6 | 17 |
  | large (default) | 56 | 20 | 8 | 19 |
  | xlarge | 64 | 24 | 8 | 19 |

  - Weight is 400. Hierarchy is primary (filled), secondary (primary-5 with border), tertiary (gray outline), text.
  - "한 페이지에 최상위 수준의 강조 버튼은 한 번만 사용", equal sizes within a group, verb labels.
  - Double clicks on submit must be ignored.
- **Text input:**
  - Default height 56 (48 and 40 also defined), radius 8, 1px gray-60 border, padding-x 16.
  - Label above at 15px; hint or error below at 13px with an icon. Error class is `.form-hint-invalid` (danger-60); success and information variants exist.
  - Placeholder must not replace the label, paste must not be blocked, and autocomplete should be supported.
- **Checkbox and radio:** 20px box (medium) or 24px (large); radius 4; label 17 or 19px.
- **File upload:**
  - Drop zone is a gray-10 surface, radius 12, padding 64/40, 19px text: "첨부할 파일을 여기에 끌어다 놓거나, 파일 선택 버튼을 눌러 파일을 직접 선택해주세요."
  - Drag and drop must always come with a button.
  - List rows show "이름 [형식, 크기]"; per-row state goes spinner (sr-only "업로드 중") → check ("업로드 완료") → delete button.
  - Error rows use danger-5 background, danger-50 border and a specific message.
  - State format, size and count limits up front, keep the select button enabled after upload, give one uploader per unrelated document, and use a lower-emphasis button than the page's submit.
  - One conflict to decide: "파일을 자동으로 제출하지 않는다" (no server upload before form submit). Upload-time OCR breaks this unless the copy says the file is only being checked and is not yet submitted.
- **Spinner:**
  - 20px, 2px ring, gray-20 track, primary-50 arc, 900ms linear, `role="status"`, text 15px gray-70.
  - Not for waits under 1s; one per screen except per-file rows; placed next to the thing being processed.
  - Announce start and completion with `aria-live="polite"`.
  - Use a determinate spinner for uploads and downloads.
  - KRDS asks for 3:1 between track, arc and background, but its own track on white is 1.54, so darken it.
  - There is no skeleton or progress-bar component in the kit.
- **Badge:** 24px high, radius 4, 15px (large 32px / 17px); status-5 background with status-60 text.
- **Modal:** widths 400 / 560 / 760, radius 12, padding 40, dim at 75% black.
- **Critical alerts:** site-level banner with badge 긴급 / 안전 / 안내; not for form errors.
- **Error pattern:** inline or modal; say what happened, where, and how to fix it, in a polite tone; keep entered values; move focus to the failing field.

**Service pattern 신청**
- **유의사항/자격 확인:** comes first. It lists whether the application can be cancelled or edited, whether 본인인증 or 전자서명 is involved, and the documents to prepare.
- **신청서 작성:**
  - 필수: no tabs or accordions inside one step.
  - 필수: help channels including a contact (전화 etc.).
  - 필수: a visually separated reset button.
  - 권장: 임시 저장, and help placed at the field.
- **확인/확정:** 필수 when the submission cannot be cancelled or edited. Show a summary of key data with both confirm and back buttons.
- **완료:** 필수 for every application. Show a summary and a link to check the result.

## 3. KWCAG 2.2 (KS X OT0003, revised 2022-12-28, 33 items; S via the a11ykr mirror)

- **5.4.3 명도 대비:** 4.5:1; 3:1 for 18pt or larger, or 14pt bold.
- **5.4.1 색에 무관한 인식:** status needs an icon or text as well as colour.
- **5.4.4 콘텐츠 간의 구분:** neighbouring content must be visually separated.
- **6.1.1 / 6.1.2 키보드, 초점:** logical order, no traps, always-visible focus.
- **6.1.3 조작 가능:** control diagonal of at least 6.0mm, with 1px or more inner margin.
- **6.2.1 응답시간 조절:** session or auth timeouts need extend or disable, warned at least 20s ahead.
- **6.4.1 건너뛰기 링크; 6.4.2 제목:** page titles must be unique per step.
- **6.5.1 단일 포인터:** signature and drag need a non-path alternative.
- **6.5.3 레이블과 네임.**
- **7.2.1 사용자 요구에 따른 실행:** no auto-submit on focus.
- **7.2.2 찾기 쉬운 도움 정보:** contact or help in the same place on every page.
- **7.3.1 오류 정정:** location, cause and fix.
- **7.3.2 레이블 제공.**
- **7.3.3 접근 가능한 인증:** no cognitive-test-only authentication; allow paste and autofill.
- **7.3.4 반복 입력 정보:** prefill data entered in earlier steps.
- **8.2.1:** name, role, state.

Reflow at 320px / 400% zoom (WCAG 1.4.10) and status messages (4.1.3) are not separate KWCAG items. KRDS cites WCAG 2.1 AA for them (Status Messages on the spinner page), so treat them as required.

## 4. Perceived wait, 3–30s

- **NN/g response limits (S):** 0.1s feels instant; 1s keeps flow; 10s is the attention limit. Over 10s needs a percent-done indicator and a way to interrupt. For unknown length, "show running progress in absolute terms", naming each item as it is processed.
- **NN/g progress indicators (S):**
  - Any wait over 1s needs feedback; a looped spinner suits only 2–10s; 10s or more needs percent-done plus a rough time estimate.
  - Show step counts and explanatory text; a static "Loading…" is not enough.
  - Do not let the bar stall near the end.
  - In a University of Nebraska-Lincoln study, users waited about three times longer with an indicator.
- **NN/g skeleton screens (S):** only for full-page loads. For uploads and conversions, "it does not make sense… to show a skeleton screen"; use a progress bar or stepped wizard.
- **GOV.UK:** there is no official spinner component. In the backlog thread (S; contributor comments, not policy), users were reassured by text such as "Processing payment", static waiting pages felt broken, and one team used `aria-live` going from "Processing…" to "Complete" with a Continue link instead of meta refresh.
- **GOV.UK One Login spinner (S):** wait → "still waiting" (example 10s) → abort or error (example 30s), polling every 2s, start time kept in sessionStorage so a refresh resumes.
- **Labor illusion (R):** Buell & Norton 2011 found that showing the work being done raises perceived value.

**Applied to the OCR step**
1. Start OCR per file at upload, in the background, and keep the other upload slots and the page usable.
2. Each row shows a labelled stage sequence (업로드 → 문서 확인 → 항목 판독 → 완료) with a determinate bar for the upload bytes and "보통 10~20초" copy.
3. After about 10s switch to "조금 더 걸리고 있습니다" text; at timeout offer retry or continue.
4. Use one polite live region per row for start and completion, not per tick.
5. Keep entered data on failure.
6. Disable double submit by showing the click was accepted, with a spinner inside the button.

## 5. Adoption

- **Pretendard GOV (V):** SIL OFL 1.1 (`pretendard-gov@1.3.9`, licence "OFL-1.1"; LICENSE has Reserved Font Name 'Pretendard'). Self-hosting, subsetting and bundling are allowed; it cannot be sold alone, and a modified build must be renamed. The KRDS repo ships subset woff2 files for Regular, Medium and Bold at about 265KB each. Self-host these with `font-display: swap` rather than using a CDN, since agency networks often block external hosts.
- **`krds-uiux` (V):** npm 1.1.0, published 2026-01-12, `license: ISC` in package.json, though the README defers to the KRDS 이용약관, which I could not retrieve. The site footer reads "© 2023 Ministry of the Interior and Safety. All rights reserved." Token values are plain colours and sizes, so re-implementing them is low risk; confirm terms with krds@nia.or.kr or 1555-6365 before shipping the kit's icons or logo.
- **Recommendation:** do not import the kit CSS. `component.css` is 530KB, relies on a 62.5% root, global `*:focus` and `input[type=checkbox]{sr-only}` resets, ID selectors and jQuery-style JS; it would fight React and the PDF overlay. Re-implement a small token file in px using KRDS names and write the eight or so components by hand to the specs above.
- **전북 identity:** I only have approximate colours sampled from the repo's `jb.png` banner: navy about #1a2a8c, blue about #0a4a9a, cyan about #0aa8d8, magenta about #e80a78. They are not official. Use KRDS primary and secondary for the UI and keep 전북 colours to the logo and identifier.

## Sources
- https://github.com/KRDS-uiux/krds-uiux (tokens, SCSS, `html/code/*.html`)
- https://registry.npmjs.org/krds-uiux
- https://www.krds.go.kr/html/site/style/style_02.html through style_08.html
- https://www.krds.go.kr/html/site/component/ (component_02_01, 02_02, 05_02, 07_01, 07_02, 09_03, 09_04)
- https://www.krds.go.kr/html/site/global/global_07.html
- https://www.krds.go.kr/html/site/service/ (service_04_04 through 04_07)
- https://www.krds.go.kr/html/site/outline/outline_04.html
- https://github.com/orioncactus/pretendard (LICENSE, packages/pretendard-gov)
- https://a11ykr.github.io/kwcag22/
- https://www.nngroup.com/articles/response-times-3-important-limits/
- https://www.nngroup.com/articles/progress-indicators/
- https://www.nngroup.com/articles/skeleton-screens/
- https://github.com/alphagov/govuk-design-system-backlog/issues/28
- https://cdn.jsdelivr.net/npm/@govuk-one-login/frontend-ui@5.3.1/build/components/spinner/README.md
