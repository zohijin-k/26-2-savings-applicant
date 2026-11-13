# 1단계 검증 결과 — 커밋 승인 대기

브랜치: `refactor/savings-applicant-scope`. 구현·검증 완료, 커밋/스테이징/push/병합 없음. 2단계 태스크는 planning으로 보류한다.

## 네 갈래 비교
| 갈래 | 승인된 기준선 | 이번 결과 | 차이 |
|---|---|---|---|
| engine_v2 | 1,264 통과 / 3 건너뜀 | 1,264 통과 / 3 건너뜀 | 없음 |
| demo/backend | 1,227 통과 | 1,227 통과 | 없음 |
| 시나리오 | 18개 모듈 / 1,885 통과 / 실패 0 | 18개 모듈 / 1,885 통과 / 실패 0 | 없음 |
| 프런트 | lint 경고 1 / build 통과 | lint 경고 1·오류 0 / 타입 검사·build 통과 | 없음 |

엔진의 기존 의존성 경고 7개, 백엔드 경고 9개, 프런트 StatusBadge Fast Refresh 경고 1개 및 build의 큰 chunk 안내가 남는다. 경고를 억제하거나 skip을 추가하지 않았다. 시나리오는 17개 모듈의 건수 합계와 건수 없는 P14의 exit=0을 따로 확인했다. 독립 검토 보존 수정 뒤 전체 18개를 다시 실행했다.

## 실행
- `PYTHONPATH=. .venv/bin/python -B -m pytest engine_v2/tests -q -o cache_dir=/tmp/savings-scope-pytest-engine`
- `PYTHONPATH=. .venv/bin/python -B -m pytest demo/backend/tests -q -o cache_dir=/tmp/savings-scope-pytest-backend`
- 18개 `demo.backend.tests.run_p*_scenarios` 모듈을 별도 프로세스로 순차 실행. `--live` 사용 안 함.
- `npm run lint`, `npm run build` (demo/frontend).
- `git diff --check`, Trellis 문맥 validate.

## 직접 본인인증 진입을 확인한 방법
실제 `App`, `ApplyFlow`, `api`, `navigation-url`을 TypeScript로 변환하여 현재 설치된 React와 같은 버전의 react-test-renderer에서 StrictMode로 실행했다. API 응답은 합성이고 무거운 자식 화면은 경계 stub이다. 실제 MyPage 보완 기한 검증 1건은 MyPage를 stub하지 않고 실행했다. 테스트 도구는 /tmp에만 설치했고 저장소 package.json/lockfile은 바꾸지 않았다.

24개 실행 검증은 루트에서 IdentityCheck 선택·double_savings POST 1회·URL 정규화, 단계별 세션 복원, 옛 역할/사업 URL, 타 사업 세션 거부, GET/후속 조회 실패 재시도, storage 차단, StrictMode/history 중복 생성 방지, 늦은 POST가 새 선택을 덮지 않음, 홈의 새 신청·제출 후 새 신청·홈 도중 요청 세대 분리, 자가진단·동의 차단 및 4단계 최종 확인 유지, 설정된 두배적금 보완 기한/대상 표시를 확인했다.

**한계:** 실제 Chrome/컴퓨터 사용은 권한 미부여로 진행하지 못했다. 브라우저 레이아웃·키보드/서명·PDF 시각 확인을 했다고 주장하지 않는다. 위 실행 검증은 부모 컴포넌트 진입·상태 전이 확인이며 실제 화면 렌더링 검증의 대체라는 의미는 아니다. 임시 UI 서버는 이번에 만든 합성 DB만 연결했으며 검증 종료 후 중지했다. 기존 데모 DB·업로드·실서류는 열지 않았다.

## 시험·보호 범위
- 기존 시험 기대값 변경 0 / 삭제 0. 담당자·취업 화면 삭제에 따른 기존 시험 변경·삭제도 0.
- 기존 프런트 phone.test.ts 변경 0.
- 백엔드·engine/·engine_v2/·공유 fixture/합성 기대 파일의 tracked 306개 SHA-256을 작업 전후 대조하여 전부 일치.
- 보호 디렉터리 `git diff main`도 비어 있다. 신규 skip이나 시험 완화 없음.
- 추가 24개 검증은 임시 harness이며 기존 네 갈래 시험 수에 더하지 않았다.

## 독립 검토
Trellis implement/check 에이전트로 검토했다. 일반 보완 안내와 홈의 새 신청 기능 누락을 수정한 뒤 재검토에서 남은 이슈 없음. README의 개발용 업로드 절은 기존 내용과 대조하여 다른 사업의 지원항목 표현 외에 명령·같은 탭·정리 안내를 보존했다. 삭제 파일/라우트/백엔드 호출 목록은 removed-frontend.md 참조.

## 합성 검증 로그
- `/tmp/savings-scope-engine.log`, `/tmp/savings-scope-backend.log`
- `/tmp/savings-scope-scenarios.log`, `/tmp/savings-scope-scenarios-summary.json`, `/tmp/savings-scope-scenarios-total.json` 및 모듈별 로그
- `/tmp/savings-scope-frontend-lint.log`, `/tmp/savings-scope-frontend-build.log`
- `/tmp/savings_scope_entry_check.cjs`, `/tmp/savings-scope-entry.log`, `/tmp/savings-scope-entry-summary.json`

### 추가 진입 검증 목록
- root enters savings identity; StrictMode creates one draft; four steps preserved
- same-tab identity restores savings without POST
- same-tab forms restores savings without POST
- same-tab upload restores savings without POST
- same-tab final restores savings without POST
- same-tab mypage restores savings without POST
- legacy /officer/province/review/9?mode=officer&o_role=province&debug=1 normalizes to identity
- legacy /apply/subsidy normalizes to identity
- legacy /?mode=officer normalizes to identity
- legacy /apply/program normalizes to identity
- foreign-program saved application never reused
- missing saved application creates one savings draft
- transient saved GET failure retries without new POST
- post-create status failure retries same new draft
- storage-disabled post-create retry keeps same in-memory draft
- history remount while POST pending shares one draft request
- stale pending POST cannot replace a later selected savings application
- existing self-check rejection still prevents upload transition
- existing consent gate still prevents upload transition
- completed consent moves to upload; submission still goes through final step
- explicit home starts a new identity draft while preserving the old row
- submitted applicant can start a fresh application through home
- home during pending creation isolates generations and ignores late old response
- actual savings MyPage still renders configured supplement deadline and targets

## 사용자 요청 추가 확인

커밋 전 저축목적 및 다섯 서식 작성·저장·미리보기의 main 대비 실행 동등성을 추가 확인했다. precommit-confirmation.md 참조. 기존 네 갈래 시험/기대값·코드 변경은 없으므로 전체 시험을 불필요하게 다시 실행하지 않았다.
