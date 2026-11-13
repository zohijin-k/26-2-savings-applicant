# 제안 커밋 — 승인 전 실행 금지

메시지: `refactor(applicant): scope UI to double savings applicants`

## 작업 커밋에 넣을 파일
- `.trellis/spec/frontend/pdf-form-workspace.md`
- `.trellis/spec/frontend/state-management.md`
- `README.md`
- `demo/README.md`
- `demo/frontend/index.html`
- `demo/frontend/src/App.tsx`
- `demo/frontend/src/api.ts`
- `demo/frontend/src/app-shell.css`
- `demo/frontend/src/components/CriteriaEditor.tsx`
- `demo/frontend/src/components/StatusBadge.tsx`
- `demo/frontend/src/components/skeleton.css`
- `demo/frontend/src/forms/PdfFormsWorkspace.tsx`
- `demo/frontend/src/forms/form-field-bindings.ts`
- `demo/frontend/src/forms/form2-model.ts`
- `demo/frontend/src/navigation-url.ts`
- `demo/frontend/src/pages/applicant/ApplyFlow.tsx`
- `demo/frontend/src/pages/applicant/DocumentUpload.tsx`
- `demo/frontend/src/pages/applicant/FinalCheck.tsx`
- `demo/frontend/src/pages/applicant/MyPage.tsx`
- `demo/frontend/src/pages/applicant/ProgramPicker.tsx`
- `demo/frontend/src/pages/applicant/SubsidyItems.tsx`
- `demo/frontend/src/pages/applicant/apply-flow.css`
- `demo/frontend/src/pages/applicant/program-picker.css`
- `demo/frontend/src/pages/applicant/subsidy-items.css`
- `demo/frontend/src/pages/officer/ApplicationList.tsx`
- `demo/frontend/src/pages/officer/DocumentViewer.tsx`
- `demo/frontend/src/pages/officer/OfficerConsole.tsx`
- `demo/frontend/src/pages/officer/ReviewDetail.tsx`
- `demo/frontend/src/pages/officer/ScoreSheet6.tsx`
- `demo/frontend/src/pages/officer/format.ts`
- `demo/frontend/src/pages/officer/mock-data.ts`
- `demo/frontend/src/pages/officer/officer.css`
- `docs/DEVELOPMENT.md`

## 새 Trellis 기록 포함 범위
- `.trellis/tasks/11-13-savings-applicant-only/`: 원래 요청과 두 단계 계획·조사 기록.
- `.trellis/tasks/11-13-savings-applicant-scope/`: 승인된 1단계 계획·검증·삭제 목록과 커밋 제안.
- `.trellis/tasks/11-13-savings-applicant-submit/`: 이전 턴에서 작성한 2단계 **계획만**. 코드 구현·활성화·승인은 없으며 planning을 유지한다. 기존 상위/문맥 파일의 링크 대상 보존 목적이다.

## 제외
- `.trellis/workspace/codex/`: 개발자 초기화 기록. 이번 작업 커밋에 포함하지 않는다.
- `.trellis/.developer`, `.trellis/.runtime/`: 로컬 식별/런타임 파일, gitignore 대상.
- /tmp 검증 로그/설치 도구/임시 DB, node_modules/dist 및 모델/실서류.

코드·문서와 위 계획·검증 기록은 모두 이 세션에서 만든 변경이다. 알 수 없는 사용자 변경은 발견되지 않았다. stage/commit/push/병합하지 않았다. 사용자 커밋 승인 후에만 명시한 파일을 git add하고 새 커밋을 만든다. 자동 archive/journal 커밋은 이번 승인 제안에 포함하지 않는다.

## 승인 및 조건 확인

사용자가 1단계 커밋을 승인했고 savingPurpose 및 서식 보존 조건 검증을 완료했다(precommit-confirmation.md). 이 커밋만 실행하며 push/PR/merge는 사용자가 직접 수행한다.
