# 1단계 삭제·라우트·백엔드 호출 보고

## 삭제한 프런트 파일 (13개)
- `demo/frontend/src/components/CriteriaEditor.tsx`
- `demo/frontend/src/pages/applicant/ProgramPicker.tsx`
- `demo/frontend/src/pages/applicant/SubsidyItems.tsx`
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

## 제거한 진입/라우트
- `/officer` 및 `/officer/**` 역할·목록·상세 화면과 담당자 mount/navigation/client/mock.
- `?mode=officer` 역할 전환, 사업 선택 stage 및 옛 `/apply/program` 진입.
- 취업지원패키지 `/apply/subsidy` 단계와 전용 서식·지원항목·면접확인서 메뉴.
- `/`와 옛 역할·사업 URL은 두배적금 `/apply/identity`로 정규화한다. 새 신청 POST는 double_savings로만 전송한다.
- `/apply/forms`, `/apply/upload`, `/apply/final`, `/apply/complete`, `/apply/mypage`는 유지한다. 4단계 최종 확인은 제거하지 않았다.

## 이번 프런트에서 직접 호출하지 않게 된 백엔드 (삭제/수정 없음)
| 파일 | 경로/기능 |
|---|---|
| demo/backend/api/officer.py | `/api/officer/roles`, `/api/officer/applications`, `/api/officer/applications/{id}`, 단건 `/decision`, 일괄 `/decisions` |
| demo/backend/api/criteria.py | 공개 `GET /api/programs/{code}/criteria`, 담당자 `GET/PUT /api/officer/programs/{code}/criteria` |
| demo/backend/api/subsidy.py | `GET/POST /api/applications/{id}/subsidy-items` |
| demo/backend/api/forms.py | job_application/job_consent/job_interview_confirmation 관련 취업 전용 서식/면접확인서 API 경로 |

공개 criteria API도 ProgramPicker 제거로 직접 프런트 호출이 사라졌다. 계획의 계속 사용 예상과 달리 확인된 결과다. `/api/programs`는 계속 사용하며 서버 내부에서 기준을 읽는다. 모든 위 API·연관 타 사업 규칙·서식 자산은 그대로 보존한다.

`api/review.py` 심사 저장, `models.py`의 Application/Document/Review와 담당자 판정 필드, 공용 forms/files API는 여전히 신청자 흐름에 필요하므로 미사용 코드로 분류하지 않는다. 일반 보완 기한·대상 표시도 두배적금 기준에 따라 활성화될 수 있어 유지했다.
