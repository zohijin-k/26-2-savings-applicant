# 두배적금 신청자 전용 저장소 정리

## 목표
`26-2-savings-applicant`를 두배적금 신청자 전용으로 만들고, 민원인이 고칠 수 있는 지정된 서류 결함만 재업로드·제출 차단 대상으로 안내한다.

## 확인한 사실
- 대상: `/Users/zohijin/Desktop/26-2-savings-applicant`, origin `https://github.com/zohijin-k/26-2-savings-applicant.git`, 조사 시작 시 `main` / `e449c55`, 깨끗한 작업 트리.
- 안내 저장소인 현재 세션 시작 폴더와 대상 저장소는 별개다. 안내 저장소에는 아무것도 작성하지 않는다.
- 현재 프런트는 신청자/담당자를 동시에 마운트하고, 사업 선택 후 신청 초안을 생성한다 (`demo/frontend/src/App.tsx:16`, `demo/frontend/src/pages/applicant/ApplyFlow.tsx:278`).
- 현재 제출은 모든 서류 FAIL 및 확정 소득·연령·근로 자격을 차단한다 (`demo/backend/api/review.py:116`, `demo/backend/api/review.py:157`).
- 신청자 서류 응답과 담당자 응답은 분리되어 있다 (`demo/backend/api/common.py:208`, `demo/backend/api/officer.py:821`).

## 요구사항과 단계
| ID | 요구사항 | 소유 태스크 |
|---|---|---|
| S1-1 | 안내/역할/사업 선택 없이 두배적금 본인인증으로 진입 | 11-13-savings-applicant-scope |
| S1-2 | 담당자 및 취업지원패키지 프런트엔드 라우트·화면·링크·전용 코드 제거 | 11-13-savings-applicant-scope |
| S1-3 | 담당자 API·심사 저장·DB 모델을 보존하고 프런트 호출이 사라지는 백엔드 목록 보고 | 11-13-savings-applicant-scope |
| S1-4 | 루트 README 재작성, 업로드 개발용 절 유지, 두 보조 문서는 바뀐 사실만 최소 정정 | 11-13-savings-applicant-scope |
| S2-1 | 승인된 재업로드 코드의 확정 FAIL만 신청자에게 표시하고 차단 | 11-13-savings-applicant-submit |
| S2-2 | 그 밖의 FAIL/NEEDS_REVIEW는 숨기고 제출 허용, 내부 판정·저장 데이터 유지 | 11-13-savings-applicant-submit |
| S2-3 | 4단계 폐지, 3단계 직접 제출 및 비활성 사유 표시 | 11-13-savings-applicant-submit |
| S2-4 | 여러 서류·여러 사유를 모은 큰 모달, 쉬운 해결 안내, 해당 업로드로 이동, 키보드·스크린리더 대응 | 11-13-savings-applicant-submit |

## 공통 수용 기준
- 각 단계는 별도 브랜치·작업 커밋·구현 승인·커밋 승인을 받는다. 1단계 승인이 2단계를 승인하지 않는다.
- 각 커밋 직전 `git diff --stat main`, 네 갈래 전체 결과, 변경·삭제 시험 목록 및 이유를 제시하고 기다린다.
- 실서류와 금지된 데이터 디렉터리를 열거나 시험 입력으로 쓰지 않는다. 모든 시험은 합성 문서와 임시 DB/저장소만 쓴다.
- 기준선(사용자 제공 및 직전 태스크 보고): engine_v2 1,264 통과/3 건너뜀; backend 1,227 통과; 시나리오 18개 모듈(집계 출력 17개) 1,885 통과/0 실패; 프런트 lint 경고 1/build 통과. 이번 계획 턴에서 재실행한 결과가 아니다.
- 기존 시험 삭제는 계획하지 않는다. 기대값 변경은 파일·시험 이름·변경 이유를 사전에 보고하고 승인받는다. 화면 제거 영향은 따로 묶는다. 추가 변경을 발견하면 승인 전 수정하지 않는다.
- 엔진 규칙·임계값·원문 OCR·심사 payload·점수·DB 스키마는 유지한다. 프런트에서 숨긴 판정도 원래 상태와 사유 그대로 저장·담당자 조회 가능해야 한다.

## 범위 밖
엔진 판정 변경, 담당자 저장소 연결 또는 담당자 UI/필터 변경, OCR 속도 개선, 실제 자료 평가, 외부 배포·push·PR 병합.

## 승인 시 명시할 경계
현재 담당자 API의 AI판정 라벨은 FAIL=부적합, NEEDS_REVIEW=확인필요이고 필터도 원값을 쓴다 (`demo/backend/api/officer.py:78`, `:191`, `:528`). 이번 작업은 원래 판정을 보존한 채 신청을 접수하여 담당자 확인 대상으로 남긴다. FAIL을 NEEDS_REVIEW로 바꾸거나 담당자 저장소의 실제 확인필요 목록에 연결하는 것은 하지 않는다. 문자 그대로 담당자 목록의 확인필요 필터까지 바꾸어야 한다면 현재 범위와 충돌하므로 별도 범위 결정이 필요하다.
