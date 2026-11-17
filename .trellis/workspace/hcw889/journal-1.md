# Journal - hcw889 (Part 1)

> AI development session journal
> Started: 2026-09-14

---



## Session 1: 현황 대시보드 초안
<!-- trellis-session: v=2 fp=99580ec87009e60f -->

**Date**: 2026-09-15
**Task**: 현황 대시보드 초안
**Branch**: `main`

### Summary

두배적금 신청·심사 현황 대시보드 프론트엔드 초안 작성(Vite+React+TS+ECharts, '26년 규모 기반 목업 데이터, 전북 14개 시군 지도, 기준일 슬라이더). 피드백 반영: 작성 시작 데이터 제거, 배점·커트라인 정보를 하단 담당자용 영역으로 분리

### Git Commits

| Hash | Message |
|------|---------|
| `1ef266d` | 대시보드 데모 생성 (목업데이터) |

### Status

[OK] **Completed**


## Session 2: 담당자 화면과 연결 실행 안내
<!-- trellis-session: v=2 fp=e53bd6995813481c -->

**Date**: 2026-11-17
**Task**: 담당자 화면과 연결 실행 안내
**Branch**: `feat/linked-run-docs`

### Summary

이 화면에서 낸 신청을 담당자 화면에서 보려면 담당자 저장소의 백엔드를 띄운다는 안내를 문서에 더했다. 담당자 저장소의 백엔드가 신청자 API도 함께 제공하게 된 데 따른 문서 변경이고, 이 저장소의 코드는 바꾸지 않았다.

### Main Changes

- docs/DEVELOPMENT.md에 연결 실행 절, README.md에 짧은 안내
- applicant-submission.md에 같은 신청자 API 코드가 담당자 저장소에도 있으니 함께 고친다는 규칙 추가

### Git Commits

| Hash | Message |
|------|---------|
| `c843e21` | docs: 담당자 화면과 연결해서 실행하는 방법 안내 |

### Testing

- [OK] 문서만 바뀜. demo, engine, engine_v2 변경 0
- [OK] 이 구성은 담당자 저장소 작업의 화면 확인에서 이 저장소의 프런트로 실제로 돌려 봄

### Status

[OK] **Completed**

### Next Steps

- 신청자 API를 고치면 담당자 저장소에도 반영
