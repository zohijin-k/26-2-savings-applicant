# 화면 범위 설계

## 진입/상태
`App.tsx`를 신청자 shell로 줄이고 `ApplyFlow`가 `double_savings` 설정만 선택한다. 기존 사업 선택 컴포넌트 대신 초기화/오류/재시도 표시를 둔다. 새 초안은 한 번의 초기화 요청으로 생성하며 인증 완료 초안 복원을 우선한다. 다른 사업 ID가 저장된 세션은 불러와 편집하지 않고 연결을 해제한 뒤 두배적금 인증으로 안내한다. StrictMode effect 재마운트에 대한 중복 요청 방어를 확인한다.

## 삭제·수정 표적
- 삭제: `pages/officer/` 전체, `pages/applicant/ProgramPicker.tsx`, `program-picker.css`, `SubsidyItems.tsx`, `subsidy-items.css`, `components/CriteriaEditor.tsx` (전용 스타일은 참조 확인 후 정리).
- 수정: `App.tsx`, `navigation-url.ts`, `app-shell.css`, `ApplyFlow.tsx`, `PdfFormsWorkspace.tsx`, `FormSheet.tsx` 및 `form-field-bindings.ts`의 취업 전용 표현, `DocumentUpload.tsx`의 면접확인서 메뉴, `MyPage.tsx`의 취업 지원금 표현, `api.ts`의 담당자/취업 전용 호출·타입·mock import. 쓰이지 않게 된 css·모델 상수는 참조 조사 후 제거한다.
- 보존: 신청자 공용 FileLink/FilePreview/PdfPages/Modal/SignaturePad, 두배적금 서식·원본 파일 받기, backend 전체, 공유 backend용 취업 서식 자산.
- 공유 필드바인딩은 백엔드 좌표 JSON을 삭제하지 않고 프런트 지원 키만 줄인다. backend 양 사업 회귀 시험은 계속 실행한다.

## 프런트 호출이 사라지는 백엔드 목록(삭제 금지)
| 파일/경로 | 기능 | 보존 이유 |
|---|---|---|
| api/officer.py, `/api/officer/roles`, `/applications`, `/applications/{id}`, `/applications/{id}/decision`, `/applications/decisions` | 담당자 목록·상세·역할·판정 | 향후 담당자 저장소 연결 미정 |
| api/criteria.py, `/api/officer/programs/{code}/criteria` GET/PUT | 담당자 기준 조회·수정 | 담당자 기능 보존 |
| api/subsidy.py, `/api/applications/{id}/subsidy-items` GET/POST | 취업패키지 지원 선택 | 타 사업 백엔드 보존 |
| api/forms.py의 job_application/job_consent/job_interview_confirmation 관련 처리 | 취업 서식·면접확인서 | 백엔드 공유 자산과 API 보존 |
| rules/programs.py의 JOB_PACKAGE, required_docs.py 취업 분기, rules/subsidy.py | 타 사업 규칙 | 삭제 범위는 프런트뿐 |
| api/review.py의 _run_review/submit, models.py의 Review/Document 및 담당자 기록 | 판정 저장/조회 기반 | 현재 신청자 제출에도 계속 사용하므로 미사용 코드로 분류하지 않음 |
| api/criteria.py 공개 두배적금 기준, /api/files, forms API 공용 부분 | 신청자 공용 | 계속 사용 |

최종 보고는 실제 import 제거 결과를 다시 추적해 호출 소멸과 여전히 공유 사용을 구분한다.
