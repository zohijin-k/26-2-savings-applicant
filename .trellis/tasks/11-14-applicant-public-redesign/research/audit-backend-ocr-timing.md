# Backend upload/OCR path — read-only findings

Nothing in the repo was modified. Timings were taken with `.venv/bin/python` on this dev Mac (Apple M2, 8 cores) against files already in `demo/storage/documents`; scripts are in `/private/tmp/claude-501/-Users-zohijin-Desktop-26-2-savings-applicant/0bd76493-b12f-4a72-9341-2d2536d4d6a1/scratchpad/timing/`. JBAI latency was **not** measured: the running 8001 backend has no `JBAI_*` or `ENGINE_V2_OCR` env vars, so it uses local `own` OCR only. Event-loop blocking (section 4) is read from code, not reproduced, because POSTing was forbidden.

## 1. Server-side sequence for `POST /api/applications/{id}/documents`

Handler is `async def upload_document` (`demo/backend/api/documents.py:278-354`). Everything below runs synchronously inside the request.

| Step | Where | Duration |
|---|---|---|
| Load application, build checklist | `documents.py:290-291` | a few ms |
| Suffix check against `["pdf","jpg","jpeg","png"]` (filename only, no magic bytes, no size cap) | `documents.py:293-298`, `rules/required_docs.py:24` | ~0 |
| Slot check, declared date parse | `documents.py:304-308` | ~0 |
| Save: `path.write_bytes(await file.read())`, whole file in memory | `documents.py:309-312` | ms |
| `assess_upload` → `read_document` over `CHAIN = [FixtureOcr, JbaiOcr, LocalOcr, PdfTextOcr, UpstageOcr]` | `upload_assessment.py:58`, `ocr/__init__.py:28-51` | dominant, see below |
| Post-processing: header-only field removal, required-field gates, file evidence, image quality, masking | `ocr/__init__.py:70-94` | tens of ms |
| `check_document` rules (type, identity, dates, quality) | `upload_assessment.py:70` | ms |
| DB: delete old slot rows, insert row, optional NHIS pair re-check | `documents.py:338-353` | ms |

Engine order and fallback:
- **Fixture**: filename stem match only (`ocr/fixture.py:381-386`); 0 ms.
- **JBAI** (`ocr/jbai.py:220-250`): only if `JBAI_API_KEY` and `JBAI_ALLOW_REAL_DOCS` are set, the slot expects 초본·등본·납부확인서·자격득실, and the file has no text layer. It renders pages at 200 dpi JPEG and makes **two sequential HTTP calls per page** (OCR, then table) (`engine_v2/pipeline/jbai_ocr.py:640-655`, `675-690`), each with a 60 s timeout (`jbai.py:47`). A timeout is not retried and falls through to LocalOcr, which re-reads the whole file. A 429 retries up to 3 times with sleeps capped at 10 s (`jbai.py:49`, `jbai_ocr.py:522-530`). Results are cached in memory by SHA-256, 64 entries (`jbai.py:254-286`).
- **LocalOcr** (`ocr/localocr.py:653-836`): engine is `own` (PP-OCRv5 ONNX CPU) when the model files exist, which they do in `engine_v2/models/own`. easyocr is the fallback only when models are missing, and it is **not installed** in `.venv`. Pages run one after another (`localocr.py:759-764`); there is no result cache.
- **PdfText**: text-layer PDFs; for images it only measures resolution and screen-capture heuristics.
- **Upstage**: stub.

Measured (own engine):

| Case | Time |
|---|---|
| `own.sessions()` cold model load | 0.33 s |
| Preprocess 3-page image-only PDF (2066×2923 px, 250 dpi) | 0.70 s |
| OCR per page, same PDF | 3.3–4.2 s (detection 0.65 s, recognition loop ~3.6 s for ~125 lines, one `rec.run` per line, `own.py:122-135`) |
| `read_document`, 3-page image PDF | 12.1 s; second identical read 11.5 s |
| `read_document`, JPG 970×1282 | 3.1 s |
| `read_document`, 1-page text PDF | 0.14 s |
| Fixture hit | <1 ms |

Estimated JBAI worst cases: first request times out → 60 s + ~12 s local re-read ≈ 72 s for a 3-page 초본; a timeout on the last of 6 requests is worse still. A production Linux server will differ from the M2 numbers.

Merged upload (`slot_key=auto`, `documents.py:357-468`) uses only text-layer reading per page (`pdftext.py:423-450`), so it is fast but does not OCR scanned pages; those land in `unassigned`.

## 2. Response and information available for progress

Single-slot response is `document_dict` (`api/common.py:214-254`): `document_id, slot_key, file_name, file_format, file_url, expected_doc_type, detected_doc_type, declared_issue_date, status` (`UPLOADED` | `REUPLOAD_REQUIRED`), `findings` (allowlisted FAIL codes only), `extracted` (only 발급일·성명·응시일·결제금액·동의여부·서명잉크확인), `elapsed_ms, page_index, uploaded_at`. Merged response: `{mode, source_file, page_count, assigned[], unassigned[]}`.

Engine, tier and fallback reason are deliberately officer-only (`documents.py:209-211`, `common.py:250`). Any progress text for citizens must stay neutral ("서류를 읽는 중") and not name an engine.

Stages that exist in code but are not emitted anywhere today: file saved → page count known after `preprocess` → page i/n OCR loop (`localocr.py:760`, `jbai_ocr.py:684`) → classification → field extraction → rule check → saved. There is no job id, no callback hook, and no progress state.

## 3. Options

**(a) Frontend-only, no contract change**
- Client-side pre-checks before POST: extension, size, and for PDFs page count and encryption via pdf.js. Catches the instant-400 and encrypted cases without a round trip. Low effort, low risk.
- Staged progress copy driven by a timer calibrated to ~4 s per page (page count from pdf.js), with an honest "최대 1분" notice. Low effort.
- Keep the rest of the page usable during upload. Caveat: today the backend cannot answer other requests while OCR runs (section 4), so background refreshes will hang.
- Text-layer PDFs return in ~0.15 s, so steering citizens to the original 정부24/공단 PDF instead of a scan or photo is the largest real saving available without code changes.

**(b) Small backend additions**
- Run `assess_upload` off the event loop (`run_in_threadpool`, or make the handler `def`). About 3 lines; response unchanged. This is a prerequisite for any polling/SSE and for the app staying responsive. Low risk, but it makes real concurrency possible, so pair it with a per-application lock.
- Parallel pages in LocalOcr: measured 3 pages in a 3-thread pool at 7.3 s versus 11.2 s sequential. Low-to-medium risk; page order must be preserved.
- Batch recognition lines in `own.py` instead of one `rec.run` per line. Likely the biggest CPU win, but output must be re-validated against the OCR benchmarks. Medium risk.
- SHA-256 result cache for LocalOcr, mirroring the JBAI cache, so re-uploading the same file is instant. Low risk; keep masked results in memory only.
- Model warm-up in `lifespan` (`main.py:24-29`): saves only 0.33 s on the first upload. Low value.
- Progress channel: `progress_id` form field plus `GET .../upload-progress/{id}`, or SSE, fed by a callback in the page loop. Additive and medium effort; requires the threadpool change first.
- Lower `JBAI_TIMEOUT_SEC` (env only) and run the OCR and table calls concurrently (the client already has a 4-slot semaphore, `jbai_ocr.py:397`).
- Early cheap checks before OCR (size cap, magic bytes, page-count cap) returning 400. This adds new 400 cases, so tests need additions.

**(c) Larger**
- 202 + job id + polling, or a background worker queue. This breaks the synchronous 200 + document-dict contract.
- GPU or a separate OCR service; multiple uvicorn workers with a non-SQLite database.

**Tests pinning the synchronous upload contract** (all under `demo/backend/tests`):
- POST `/documents` expecting 200 and a document dict: `run_p3`, `run_p4`, `run_p5`, `run_p6` (reads `elapsed_ms`, line 392), `run_p7`, `run_p9`, `run_p15_jbai` (200 on network failure, log format, lines 445-536), `run_p16`, `run_p17_own`, `run_p18`, `run_p19`, `run_p20`, `test_applicant_failure_findings`, `test_nhis_recent_history`, `test_review_regressions`, `test_portal_uploads`.
- `run_p2_scenarios.py:274` asserts `ocr.elapsed_ms < 5000`.
- Tests that patch `read_document`/`CHAIN` or call `assess_upload`: `test_verify_upload*`, `test_verify_cases`, `test_seed_application`, `test_p2_*_uploads`, `test_quality_failure_policy`, `test_objective_image_quality`, `test_nhis_identity`, `test_nhis_qualification`, `test_address_resolution_failures`, `run_p8`, `run_p12`. Keep the `reader=read_document` signature (`upload_assessment.py:55`).
- Spec: `.trellis/spec/backend/applicant-submission.md` fixes the `UPLOADED`/`REUPLOAD_REQUIRED` projection and the 10-code allowlist. The other backend spec files have no upload-latency or async rules.

Safe for a minimal-risk change: everything in (a), plus threadpool offload, the hash cache and an additive progress endpoint. Changing status code or response shape touches all the tests above.

## 4. Concurrency

- The handler is `async def` calling blocking OCR, and uvicorn runs one process (`--reload`, no workers). During a 12 s OCR the event loop is blocked, so **every other request stalls**, including other citizens' requests, `GET required-documents` and form page images. Uploads are therefore serialised server-wide today.
- The frontend also serialises: `runMutation` guards on `mutation.current` (`demo/frontend/src/pages/applicant/DocumentUpload.tsx:425-437, 451-454`).
- There are no per-application locks. If OCR moves to a threadpool, two uploads to the **same slot** race: `_replace_existing` then `_save_row` are separate commits (`documents.py:338-348`), which can leave two rows, and the same filename overwrites the file mid-read (`documents.py:311`). `_refresh_nhis_identity` rewrites sibling rows without a lock. Different slots are safe on disk (separate directories).
- SQLite uses `check_same_thread=False` with default journaling (`models.py:18`); writes are short, so "database is locked" is unlikely but possible.
- Global model state: ONNX sessions are `lru_cache`d and thread-safe for `run`. Two concurrent 3-page reads took 17.8 s wall versus ~12 s for one, so parallelism is real but CPU-bound (`intra_op_num_threads = 2`, `own.py:44`).
- Verdict: parallel uploads from the browser gain nothing today and are unsafe for the same slot after any threadpool change unless a per-application lock is added.

## 5. Failure modes the citizen can hit

| Case | What the frontend gets |
|---|---|
| HEIC, webp, hwp, zip | 400 `{"detail":"pdf, jpg, png 파일만 올릴 수 있습니다. (올리신 형식: heic)"}`. `pillow_heif` is not installed, so iPhone HEIC is always rejected. |
| Bad slot / bad date | 400 `업로드 대상이 아닌 슬롯입니다: …` / `발급일은 YYYY-MM-DD 형식으로 입력해 주세요.` |
| Unknown application | 404 `신청 건을 찾을 수 없습니다.` |
| Encrypted PDF | 200, `REUPLOAD_REQUIRED`, `UNREADABLE_FILE` "파일을 열 수 없습니다." with fix text "PDF 암호를 해제한 뒤 다시 올려 주세요…" (`rules/doc_check.py:85, 461`) |
| Corrupt image, or HEIC renamed `.jpg` | Same `UNREADABLE_FILE` response, so the citizen is told to remove a **PDF password** for a broken photo. Misleading. |
| OCR engine missing, model error, any adapter exception | Swallowed (`ocr/__init__.py:46-49`). 200 `UPLOADED` with empty `extracted`; the case goes silently to officer review. |
| JBAI timeout / 401 / 429 / network | 200 after the delay; reason is officer-only. |
| Unrecognised document type (e.g. sideways photo) | 200 `UPLOADED`; the finding is NEEDS_REVIEW and hidden. The local path reads photos with `pymupdf.Pixmap` (`engine_v2/pipeline/preprocess.py:148`), which ignores EXIF rotation; only the JBAI path applies `exif_transpose` (`jbai_ocr.py:617`). `own` has no orientation correction. |
| Small or low-resolution image | 200 `REUPLOAD_REQUIRED` with `IMAGE_RESOLUTION_TOO_LOW` (unreadable and under 600×800 px) or `LOW_IMAGE_QUALITY` "이미지가 흐리거나 작아 읽을 수 없습니다." (quality < 0.6) |
| Wrong document in slot | 200 `REUPLOAD_REQUIRED`, `WRONG_DOCUMENT_TYPE` "'A' 자리에 'B'를 올리신 것 같습니다." |
| Huge or many-page scan | No size or page cap. ~4 s per page with the whole app frozen; 15+ pages exceeds a typical 60 s reverse-proxy timeout (504, not JSON). `form()` in `demo/frontend/src/api.ts:247-254` then shows `업로드 실패 (504)`, and the server may still save the row afterwards. `fetch` has no client timeout or abort. |
| Upload after submission | Not blocked: `upload_document` has no `STATUS_DRAFT` check, unlike `set_doc_context` (`documents.py:162`). |
| Unhandled 500 | Plain-text body; frontend shows `업로드 실패 (500)`. |

Replacing a file under a different name leaves the old file on disk; only the DB row is deleted (`documents.py:266-275`).
