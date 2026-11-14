# Document Upload Queue (step 3)

How `pages/applicant/DocumentUpload.tsx` sends documents while the OCR/assessment request is slow. Frontend-only; the
upload API is unchanged. Introduced by task `11-14-applicant-public-redesign`.

## 1. Scope / Trigger

`POST /api/applications/{id}/documents` saves the file, runs OCR and assessment synchronously, and returns the result.
It can take from 0.1 s (text PDF) to tens of seconds (scanned PDF, remote OCR). The backend handler blocks its event
loop for that time, so no other request is answered meanwhile, and two uploads to the same slot would race. The client
therefore queues uploads, keeps the page usable, and never has more than one upload request in flight.

## 2. Signatures

```ts
// api.ts — same URL, method and FormData keys as uploadDocument
uploadDocumentWithProgress(id: number, slotKey: string, file: File, declaredIssueDate: string,
  opts?: { onProgress?(sent: number, total: number): void; onSent?(): void; signal?: AbortSignal }): Promise<UploadedDocument>

// pages/applicant/upload-queue.ts — pure
type QueueStatus = 'queued' | 'sending' | 'reading' | 'failed'      // success removes the item
queueReducer(state: QueueItem[], action: QueueAction): QueueItem[]
inFlight(state): QueueItem | null          // the one item that is sending/reading
nextRunnable(state): QueueItem | null      // first 'queued', only when nothing is in flight
slotItem(state, slotKey): QueueItem | null
isActive(state): boolean                   // any queued/sending/reading

// lib/upload-estimate.ts — pure
estimateSeconds(kind: 'pdf-text' | 'pdf-scan' | 'image', pages: number | null, history: readonly Observation[]): number
slowThresholdSec(estimate: number): number                // max(10, estimate * 1.5)

// lib/file-precheck.ts — pure, pdf.js injected
precheckFile(file: File, pdf: PdfProbe, previewUrl?: string): Promise<Precheck>
```

## 3. Contracts

- One item per slot. Enqueueing for a slot that has a queued or failed item replaces it; a slot whose item is in flight
  cannot be enqueued again. The reducer itself refuses a second in-flight item.
- The runner starts `nextRunnable` only. No `GET` is fired while the queue is active; the checklist and `/final-check`
  are re-read once when the queue drains, behind the existing response-generation guard.
- The result card is rendered from the POST response (the checklist state is patched), then reconciled by that re-read.
  Submission still depends only on fresh server readiness.
- Readiness is invalidated when the first item starts. While the queue is active: work-type controls and submit are
  disabled with a visible reason, and `onBusyChange(true)` blocks the parent's stepper and My Page.
- The page-wide lock (`inert`, `aria-busy`) is used only for work-type change, leftover delete and submit.
- Waiting copy is honest: real byte percentage while sending; after that `서류를 읽고 확인하고 있습니다.` with elapsed
  seconds and an estimate labelled `예상`. No percentage and no invented sub-steps for the server phase.
- sessionStorage (tab-scoped) holds only: `applicant.declaredDates.{applicationId}` (slot key → typed issue date) and
  `applicant.seenReupload.{applicationId}` (document id + reason code already shown in the auto-opened dialog).
- Applicant projection rules are unchanged: two status labels, ten allowlisted reason codes, fixed guidance copy, no raw
  findings (see [Applicant PDF Workspace](./pdf-form-workspace.md) and `../backend/applicant-submission.md`).

## 4. Validation & Error Matrix

| Condition | Behaviour | Request sent |
| --- | --- | --- |
| Extension not pdf/jpg/jpeg/png | Slot notice: format message | No |
| `.heic` / `.heif` | Slot notice: HEIC message with how to convert | No |
| 0-byte file | Slot notice: empty-file message | No |
| pdf.js password error | Slot notice: encrypted-PDF message | No |
| Any other pdf.js probe error or timeout | Passes as `pdf-scan`, pages unknown | Yes |
| File ≥ 20 MB | Passes, adds a "takes longer" hint | Yes |
| Request fails (network / 5xx / 4xx detail) | Slot notice via `friendlyError`, `같은 파일로 다시 시도` keeps the same `File` | Retry on demand |
| Request failed but the re-read shows a new document id for the slot | Failure dropped, result shown | — |
| Elapsed > `slowThresholdSec(estimate)` | Adds the "평소보다 오래 걸리고 있습니다" notice | — |
| Leaving the stage mid-request | Request aborted, queued files never sent, busy state cleared | — |

Never block a file the server would accept.

## 5. Good / Base / Bad Cases

- Good: three files picked in a row → first sends, others show `대기 중` with `취소`; POST spans do not overlap; each
  result appears as its response arrives; one re-read at the end.
- Base: single text PDF → file row within ~20 ms of the pick, result in well under a second, no estimate shown (`곧 끝납니다.`).
- Bad: starting a second POST while one is in flight, firing `refresh()` between queued uploads, or showing the old
  rejected badge during a replacement upload.

## 6. Tests Required

- `tests/upload-queue.test.ts`: `nextRunnable` returns null while an item is sending/reading; enqueue-replace rules;
  cancel only for queued; retry returns a failed item to queued; a second `start` is refused.
- `tests/upload-estimate.test.ts`: defaults per kind, history blending, clamp to 1..180, slow threshold.
- `tests/file-precheck.test.ts`: each blocking reason, non-password probe errors pass, large-file hint.
- Browser (manual/Playwright): hold the upload response and assert no overlapping `POST …/documents` and no `GET`
  between the first POST start and the last POST end.

## 7. Wrong vs Correct

### Wrong

```tsx
<div inert={busy}>…all slots…</div>            // page frozen for the whole OCR
await uploadDocument(…); await refresh()        // result waits for two more round trips, response discarded
```

### Correct

```tsx
const next = nextRunnable(queue)                // null while something is in flight
const doc = await uploadDocumentWithProgress(id, next.slotKey, next.file, next.declared, { onProgress, onSent, signal })
patchChecklist(next.slotKey, doc)               // show the result now
// …when the queue drains: one refresh() behind the generation guard
```
