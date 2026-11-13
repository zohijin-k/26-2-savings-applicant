# 조사 결과

## 조사 범위
요청한 대상 저장소의 코드·합성 시험 소스·설정·현재 문서만 읽었다. 실제 서류, 원본 공고 PDF, 사용자 업로드, DB 및 금지 데이터 디렉터리는 열지 않았다. 시험·앱은 이번 계획 턴에서 실행하지 않았다.

## 현재 데이터 흐름과 변경 위치
| 근거 | 현재 동작 | 계획 |
|---|---|---|
| frontend/src/App.tsx:16 | OfficerConsole import 및 두 역할 상시 마운트 | 신청자 shell만 남김 |
| frontend/src/navigation-url.ts:1 | Mode 및 /officer·query role 라우팅 | 두배적금 신청 라우팅 정리 |
| frontend/src/pages/applicant/ApplyFlow.tsx:57, :94, :278 | program/subsidy/final stage, 4개 스텝, 선택 후 초안 생성 | 1단계: 선택 제거/고정 사업, 2단계: final 제거 |
| frontend/src/forms/PdfFormsWorkspace.tsx:116, :170 | 취업 서식·지원항목 분기 | 1단계 프런트에서 제거, backend 자산 보존 |
| backend/api/common.py:193 | FAIL 있으면 같은 서류 REVIEW만 숨김; review-only 표시 | 2단계 확정 허용 코드만 신청자에게 표시 |
| backend/api/common.py:208 | 신청자에 원래 stage1_status·ocr_confidence 반환 | 중립 업로드 상태와 public 재업로드 사유만 반환 |
| backend/api/review.py:116, :157, :271 | 모든 FAIL와 eligibility가 blocker | 허용 서류 사유 + 입력 완성만 blocker |
| backend/api/applications.py:221, :318 및 review.py:856 | 연령 blocker 신청자 반환 | 신청자에서 제거; assess_age 및 review 저장 유지 |
| backend/api/applications.py:322 및 ApplyFlow의 continueFromForms | 자가진단 부적격 응답 및 단계 이동 차단 | 필수 작성 검사 유지, 자격 결과 숨기고 접수 허용 |
| frontend/src/components/Modal.tsx:24 | Escape·스크롤 잠금만 제공 | 진입 포커스·트랩·복원·배경 차단 추가 |
| backend/ocr/base.py:unreadable | 암호/손상 모두 is_encrypted와 UNREADABLE_FILE 사용 | 새 원인 코드/판정 변경 없이 공통 안내 |
| backend/api/officer.py:78, :191, :528 | FAIL=부적합, 원래 review.final_status 필터 | 변경 범위 밖; 담당자 실제 확인필요 필터 연결 미구현 |
| backend/tools/verify_upload.py:250, :291, :322 | 신청자 projection/차단 공유; 원판정 별도 출력 | 파생 신청자 출력만 영향 승인 필요 |

모든 표의 상대 코드 경로는 demo/ 아래 기준이다(명시한 engine 경로 제외). 정밀 삭제 목록은 1단계 design.md, 코드/문구는 2단계 reason-guidance.md.

## 문서 불일치
- 루트 README가 두 사업·담당자 데모로 설명: 1단계 재작성 대상.
- docs/DEVELOPMENT.md: 저장소 이름 및 신청자·담당자 화면 표기, 오래된 260/3·1,776 시험 수. 기준선과 단계 검증 실측으로 최소 정정.
- demo/README.md: 역할 탭·목업·타 사업 UI·4단계(2단계 완료 시)·옛 시나리오 목록 표기 최소 정정. 백엔드 담당자·취업 시험 자체는 유효하므로 실행 목록에서 제거하지 않음.
- 원래 문서의 18개 모듈과 직전 보고의 17개 counting 모듈은 충돌하지 않는다. 실제 run_p*_scenarios.py 18개이며 한 모듈은 개수 출력이 없다. 모듈 exit와 assertion 합계를 따로 보고한다.

## 승인·시험 상태
현재는 새 Trellis 계획 파일만 작성했으며 main 코드와 기존 시험/문서는 그대로다. 기준선은 사용자 제공값과 직전 archive 보고서의 일치 확인이며 이번 재검증 결과가 아니다. 각 단계의 검증 결과를 이번 수치인 것처럼 미리 쓰지 않는다.
