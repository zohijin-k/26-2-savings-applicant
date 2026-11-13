# 실행 계획

구현 브랜치 예정: `refactor/savings-applicant-scope` (승인 전 생성하지 않음).

1. 계획 승인 후 start, main/clean 상태 확인, 별도 브랜치 생성.
2. 두배적금 자동 진입과 동일 탭 복원, 이전 다른 사업/담당자 URL 정리.
3. 담당자 및 취업 프런트 코드와 API 클라이언트 참조 제거. 공유 신청자 기능 확인.
4. 루트 README 재작성; 두 보조 문서의 바뀐 사실만 정정. 개발용 업로드 절 보존 확인.
5. 화면 이동/뒤로가기/새로고침/마이페이지/오류 재시도와 중복 초안 방어 확인.
6. 아래 네 갈래 전체 검증 실행, 변경 시험 0 유지. 필요한 기대값 변경 발견 시 이름·이유 보고 후 승인 전 수정하지 않음.
7. `.trellis/spec` 갱신 필요성을 검토하고 범위에 맞는 spec만 갱신.
8. `git diff --check`, `git diff --stat main`, 네 갈래 결과·파일 목록·메시지·시험 영향 보고 후 커밋 승인 대기.

## 검증 명령
- `PYTHONPATH=. .venv/bin/python -B -m pytest engine_v2/tests -q`
- `PYTHONPATH=. .venv/bin/python -B -m pytest demo/backend/tests -q`
- 모든 `demo/backend/tests/run_p*_scenarios.py` 18개를 모듈별 별도 프로세스로 끝까지 실행. 실패한 모듈도 별도 기록하며 집계 출력이 없는 모듈은 exit code로 기록. `--live` 금지.
- `npm run lint`, `npm run build` (cwd demo/frontend).

시험 준비/수행 중 네트워크 모델 설치나 실서류 접근은 하지 않는다. 기존 가상 fixture 및 engine_v2/tests의 합성 자료만 사용한다. 필요한 실행 환경이 없으면 그 사실과 실패를 그대로 보고한다.

## 커밋 초안
`refactor(applicant): scope UI to double savings applicants` — 이 단계 프런트/README·최소 보조 문서/해당 태스크 계획·검증 기록만. 기존 다른 태스크나 사용자 변경은 포함하지 않는다.
