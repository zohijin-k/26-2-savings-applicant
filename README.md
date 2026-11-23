# 두배적금 신청자 프런트엔드

이 프로젝트는 **전북대학교 캡스톤디자인 교과목에서 전북특별자치도청과 협력하여 수행한 학생 팀 프로젝트**입니다. 학교 수업의 일부로 실제 행정 업무의 기술적 개선을 탐구한 결과물이며, 도청 공식 운영 시스템으로 배포되었거나 운영 승인을 받은 서비스라는 뜻은 아닙니다.

**PRODUCTION_NOT_READY.** 본인인증 데모 → 원본 서식 작성·서명 → 서류 업로드·제출 → 접수증·마이페이지를 제공하는 신청자 전용 화면입니다. 실제 본인인증 서비스는 연결되지 않았습니다. 담당자 목록과 심사는 [officer](https://github.com/zohijin-k/26-2-savings-officer)에서 엽니다.

## 저장소 역할과 연결 실행

| 저장소 | 현재 역할 |
|---|---|
| [capstone](https://github.com/zohijin-k/26-2-capstone) | 전체 안내·분리 전 코드와 이력 보관 |
| [officer](https://github.com/zohijin-k/26-2-savings-officer) | 두배적금 공용 백엔드 + 담당자 프런트 |
| [applicant](https://github.com/zohijin-k/26-2-savings-applicant) | 두배적금 신청자 프런트 |
| [youth](https://github.com/zohijin-k/26-2-youth) | 취업지원패키지·범용 청년사업의 독립 백엔드 + 신청자·담당자 프런트 |

이 저장소의 주 실행 대상은 `demo/frontend`입니다. 두배적금은 **officer의 백엔드 하나(8000)**를 사용하며 applicant(5173)와 officer(5174)가 그 API·DB를 공유합니다. 여기 보존된 백엔드는 officer의 소유자·담당자 인증 미들웨어와 동일한 서비스가 아니므로 연결 실행 기준으로 사용하지 않습니다. youth는 독립 백엔드입니다.

## 프런트 실행

검증 환경은 **CPython 3.14.6 / macOS 26.6.2 / arm64, Node 26.13.1 / npm 11.20.0**입니다. 최신 코드의 Python 3.12·Linux·Windows 전체 실행은 미검증입니다. 과거 WSL 결과를 최신 main의 보장으로 사용하지 않습니다. Node의 직접 TypeScript 시험은 22.18 이상이 필요하며, 여기서는 위 실측 버전을 기준으로 합니다.

[`package-lock.json`](demo/frontend/package-lock.json)의 실제 잠금 버전은 React **19.3.0**, Vite **8.3.0**, TypeScript **6.0.3**, pdfjs-dist **5.7.284**입니다. Python 잠금은 FastAPI **0.162.2**, uvicorn **0.54.0**, SQLModel **0.0.44**, ONNX Runtime **1.31.1**, pytest **9.2.0** 등 55개 패키지를 포함합니다. [hash lock](demo/backend/locks/macos-arm64-py314.txt)과 [재현 범위](demo/backend/locks/README.md)를 확인하세요. 이 macOS 전용 lock을 다른 OS에 적용하거나 기존 requirements의 하한을 지원 보장으로 해석하지 않습니다. 프런트 package `0.0.0`·API 선언 `0.1.0`은 제품 릴리스 번호가 아닙니다.

```bash
# 이 저장소 루트; 신청자 프런트만 준비
cd demo/frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

먼저 [officer 실행 안내](https://github.com/zohijin-k/26-2-savings-officer#readme)에 따라 그 저장소의 venv와 `.env`를 준비하고 아래 백엔드를 실행합니다.

```bash
# officer 저장소 루트, officer venv 활성화 상태
python -m uvicorn demo.backend.main:app --env-file .env --reload --host 127.0.0.1 --port 8000
```

officer의 `.env`에는 `OFFICER_PASSWORD`·`OFFICER_SESSION_SECRET`이 필요합니다. 이 저장소의 `.env.example`에는 두 키가 없으며 여기에 officer 인증을 구성하지 않습니다. 연결 백엔드에서 `JBAI_API_KEY`를 비우고 `JBAI_ALLOW_REAL_DOCS=false`, `PROGRAM_LLM_ENABLED=false`로 둡니다. 프런트에 비밀키를 넣지 않습니다. 두 Vite 설정은 `/api`를 8000으로 프록시합니다. 같은 `localhost` 호스트명으로 <http://localhost:5173>과 <http://localhost:5174>를 사용하고, API 문서는 <http://localhost:8000/docs>에서 봅니다.

작성 중 신청은 같은 브라우저 탭에서 이어갑니다. 소유자 쿠키·동일 출처를 유지해야 합니다. 파일 미리보기·업로드 대기열·불확실한 요청 재시도를 지원하며, 화면 진행률을 판독 정확도나 속도 보장으로 해석하지 않습니다. 원본 PDF 서식은 PC 기준 배치를 유지합니다.

## OCR·Document AI와 심사 경계

일반 문서의 구현 체인은 **fixture → 조건부 JBAI → LocalOcr → PDF text → 상용 스텁**입니다. [`demo/backend/ocr/`](demo/backend/ocr/__init__.py)가 순서를 정하고, [`engine_v2/`](engine_v2/README.md)가 OCR·분류·문서별 필드 추출, `engine/`과 백엔드 규칙이 자격·제출 판정을 담당합니다. Document AI의 필드·좌표·신뢰도 추출과 규칙 판정, 담당자 최종 판단은 구분합니다. Upstage 계층은 실제 연동 완료가 아닌 스텁입니다.

로컬 기본 선택은 own입니다. 현재 코드는 **기본 선택에서 모델이 없을 때** easyocr를 선택하지만 easyocr는 기본 requirements에 설치되지 않습니다. 명시한 `ENGINE_V2_OCR=own`의 모델 누락·해시·추론 오류를 다른 엔진으로 대체하지 않습니다. 자동 대체를 설치 성공이나 정확도 보장으로 설명하지 않습니다. 아래 명령은 선택한 own 모델을 다운로드·검증하므로, 로컬 OCR을 시험할 때만 별도로 실행합니다.

```bash
python -m engine_v2.tools.fetch_own_models
python -c "from engine_v2.tools.fetch_own_models import verify_models; verify_models()"
```

[`fetch_own_models.py`](engine_v2/tools/fetch_own_models.py)의 고정 SHA-256:

| 파일 (`engine_v2/models/own/`) | SHA-256 |
|---|---|
| `det.onnx` | `4d97c44a20d30a81aad087d6a396b08f786c4635742afc391f6621f5c6ae78ae` |
| `rec.onnx` | `cd6e2ea50f6943ca7271eb8c56a877a5a90720b7047fe9c41a2e541a25773c9b` |
| `korean_dict.txt` | `a88071c68c01707489baa79ebe0405b7beb5cca229f4fc94cc3ef992328802d7` |

위 모델 설치 명령은 실제 API를 실행하는 **officer 저장소**에서 실행하세요. 아래 보존 백엔드 회귀 시험을 재현할 때만 이 저장소에도 별도 모델·시험 자산이 필요합니다.

두배적금 신청자 응답은 `UPLOADED`/`REUPLOAD_REQUIRED`와 허용된 재업로드 사유입니다. 내부 `PASS`/`FAIL`/`NEEDS_REVIEW`, 점수·신뢰도·담당자 이유를 노출하거나 공개 상태값으로 추정하지 않습니다. 직접 submit도 서버에서 기존 차단 조건을 재검사합니다. 연결 백엔드는 소유자 쿠키로 신청을 보호하며 원본은 소유자 또는 로그인한 담당자만 봅니다.

담당자 결정·메모는 `expected_revision`, 일괄 처리는 `expected_revisions`를 보내는 Review CAS(compare-and-swap)를 사용합니다. 오래된 revision은 충돌로 처리하며 전체 심사 내용을 덮어쓰지 않습니다. 제출 후 문서 변경 잠금과 트랜잭션 회귀도 유지합니다. 세션은 단일 프로세스 가정을 포함하므로 다중 worker 안전성을 보장하지 않습니다.

이 화면은 담당자 CAS를 대신하지 않습니다. youth 영수증은 canonical `PAYMENT_RECEIPT`에 대해 OCR·Document AI 없이 수동 검토하며 두배적금 응답 계약과 다릅니다. [youth P1–P19](https://github.com/zohijin-k/26-2-youth/blob/main/docs/phase7-policy-decisions.md)는 미결 상태와 현재 판정을 유지합니다. JBAI는 키·허용 플래그를 켜면 이미지 외부 전송이 가능한 별도 옵션이며 기관 승인 완료로 취급하지 않습니다.

## 검증

```bash
# demo/frontend에서; tests와 함께 배치된 .test.ts도 포함
npm run lint
npm run build
python3 - <<'NODE_TESTS'
from pathlib import Path
import subprocess
roots = ['tests', 'src/lib', 'src/forms', 'src/pages/officer']
files = sorted(str(f) for root in roots for f in Path(root).glob('*.test.ts'))
assert files, 'No Node tests found'
subprocess.run(['node', '--test', *files], check=True)
NODE_TESTS
```

보존 백엔드·엔진 자체 회귀를 재현할 경우에만 이 저장소 루트에서 별도 venv를 만듭니다. 연결 실행 백엔드의 검증을 대체하지 않습니다.

```bash
# 새 로컬 개발 사본의 루트; 위 macOS/arm64·CPython 3.14.6 환경
python3.14 -m venv .venv
source .venv/bin/activate
python -m pip install --require-hashes --only-binary=:all: -r demo/backend/locks/macos-arm64-py314.txt
python -m pip check
cp .env.example .env
cd demo/frontend
npm ci
cd ../..
```

기존 [`demo/backend/requirements.txt`](demo/backend/requirements.txt)·[`engine_v2/requirements.txt`](engine_v2/requirements.txt)는 일반 의존성 선언이며 위 재현용 lock과 목적이 다릅니다. 모델·합성 시험용 글꼴은 lock에 포함되지 않습니다.
```bash
# 저장소 루트, 위 venv 활성화, 외부 공급자 비활성화
JBAI_API_KEY= JBAI_ALLOW_REAL_DOCS=false PROGRAM_LLM_ENABLED=false python -m pytest -q demo/backend/tests engine_v2/tests
```

전체 suite에는 별도 모델·합성 글꼴 등 자산이 필요합니다. 합성 글꼴 도구는 `python -m engine_v2.tools.fetch_synth_fonts`이며 출처·사용 조건을 확인한 별도 로컬 자산입니다. 자산 없는 사본의 skip/failure를 숨기거나 hash/시험 규칙을 완화하지 않습니다.

Phase 8 [#17](https://github.com/zohijin-k/26-2-savings-applicant/pull/17)의 기존 결과는 Python **2,606**, 프런트 **98**개 통과(실패·오류·skip 0)입니다. 코드 main의 신청자 재업로드 투영 핵심 **41**개도 확인했습니다. 과거 검증 HEAD와 코드 main의 실행 코드·테스트 동일성을 대조한 결과이며 이번 README 작업의 전체 재실행 결과가 아닙니다. 이 저장소에는 GitHub Actions가 없으므로 hosted CI 성공을 주장하지 않습니다. 기존 Fast Refresh export·bundle·deprecation 경고를 유지합니다.

## 버전과 release-manifest

README 정리 직전 확인한 최신 코드 main은 [`a3baa5efe948800568c645c7736f2839f2af3e07`](https://github.com/zohijin-k/26-2-savings-applicant/commit/a3baa5efe948800568c645c7736f2839f2af3e07)입니다. 문서 전용 병합 이후의 현재 main SHA는 [GitHub main 조회](https://api.github.com/repos/zohijin-k/26-2-savings-applicant/commits/main) 또는 아래 명령으로 확인합니다. 문서 커밋 SHA와 코드 검증 기준 SHA를 혼동하지 않습니다.

```bash
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

[전체 release-manifest](https://github.com/zohijin-k/26-2-capstone#release-manifest)는 네 코드 기준 SHA와 검증 범위를 연결합니다. 전체 내부 `release-manifest.final.json`과 증거·소스 아카이브는 비공개로 보존하며 공개 링크를 만들지 않습니다.
## 개인정보·권리·검증 한계

시험에는 합성 정보와 임시 DB·저장소만 사용합니다. 실서류·주민번호·OCR 원문·환경변수·쿠키·DB·업로드·모델·비공개 증거와 소스 스냅샷을 Git/PR에 올리지 않습니다. 마스킹이 원본 파일을 익명화한다는 뜻은 아닙니다. 실제 외부 OCR/LLM 호출과 실서류 정확도·신뢰도 보정, 최종 SHA 전체 브라우저 흐름, 다중 worker 세션·잠금은 이번 문서 검증으로 승인하지 않습니다.

프로젝트 LICENSE와 기여자·기관의 재배포 권한은 **미확정**입니다. 기존 공개 저장소도 신규 소스 공개 권한의 근거가 아닙니다. Noto subset 출처·조건, Pretendard GOV 고지, 기관 브랜드, PDF/HWP 서식 재사용, PyMuPDF의 AGPL/상용 조건 및 의존성 고지는 별도 확인이 필요합니다. [제3자 고지](THIRD_PARTY_NOTICES.md)를 확인하되 전체 프로젝트의 재배포 허가로 해석하지 마세요. 비공개 소스 스냅샷은 공개하지 않습니다.

**PRODUCTION_NOT_READY.** 운영 DB migration·배포·인프라 변경은 이 안내의 범위가 아닙니다.

[개발 안내](docs/DEVELOPMENT.md) · [사용 안내](docs/USER_GUIDE.md) · [엔진](engine_v2/README.md). 이전 단독 실행·테스트 수치는 위 연결 기준과 구분하세요.
