# 두배적금 신청자 화면

`26-2-savings-applicant`는 **전북청년 함께 두배적금 신청자 전용 화면 저장소**입니다.
앱을 열면 두배적금 신청 1단계인 본인인증으로 바로 이동합니다.

신청자는 공고문 서식을 작성·서명하고 서류를 올린 뒤 신청을 제출할 수 있습니다.
현재 신청 흐름은 **1. 본인인증 → 2. 서식 작성 → 3. 서류 업로드 및 제출**입니다.
본인인증은 실제 인증 서비스 연동 전의 데모 방식입니다.

## 화면 구성

신청자 화면은 사업 배너(`demo/frontend/src/assets/brand/jb-banner.png`)의 색을 기준으로 한
하나의 디자인 체계를 씁니다. 글꼴은 Pretendard GOV를 저장소에 포함해 쓰며 외부 서버를 호출하지 않습니다.
모든 단계에 같은 머리글·단계 표시·바닥글(문의 전화)이 나옵니다.

| 단계 | 신청자가 하는 일 | 화면이 돕는 것 |
|---|---|---|
| 1. 본인인증 | 성명·생년월일·휴대폰 입력, 서약, 서명 | 빠진 항목을 칸마다 알려 주고, 고칠 수 없는 정보는 보내기 전에 다시 확인받습니다. |
| 2. 서식 작성 | 원본 PDF 위에서 서식 5종 작성·서명 | 작성할 칸을 표시하고, 덜 쓴 서식과 남은 항목 수를 알려 줍니다. 저장 상태를 항상 보여 줍니다. |
| 3. 서류 업로드 및 제출 | 근로유형 선택, 증빙서류 업로드, 제출 | 아래 "서류 확인을 기다리는 동안" 참고. 제출 전에 확인 창을 거칩니다. |
| 접수 완료 | 접수 내용 확인 | 신청번호·접수 일시·다음 절차·문의처를 접수증 형태로 보여 주고 인쇄할 수 있습니다. |
| 마이페이지 | 진행 상황 확인 | 진행 단계, 제출한 서류, 동의 이력을 보여 줍니다. 심사 점수는 보여 주지 않습니다. |

### 서류 확인을 기다리는 동안

서류를 올리면 서버가 서류 종류와 발급일 등을 자동으로 확인합니다. 이 확인은 서류에 따라
1초 미만에서 수십 초까지 걸립니다. 화면은 기다리는 시간이 짧게 느껴지도록 다음과 같이 동작합니다.
서버 쪽 판독 속도 자체는 이 저장소의 화면 작업으로 바뀌지 않습니다.

- 파일을 고르면 그 칸에 파일 이름·크기·미리보기와 진행 상태가 바로 나옵니다.
- 서버로 보내는 동안에는 실제 전송률을, 확인하는 동안에는 경과 시간과 예상 시간을 보여 줍니다.
- 한 서류를 확인하는 동안에도 다른 서류의 발급일을 적고 파일을 골라 둘 수 있습니다.
  고른 파일은 "대기 중"으로 줄을 서서 한 건씩 차례로 올라갑니다.
- 지원하지 않는 형식(HEIC 포함), 빈 파일, 암호가 걸린 PDF는 서버로 보내기 전에 그 칸에서 안내합니다.
- 다시 올려야 하는 서류는 사유와 해결 방법을 그 칸 안에서 바로 보여 줍니다.

발급처에서 받은 PDF 원본이 가장 빠르고 정확하게 확인됩니다. 스캔본이나 사진은 쪽수에 비례해 더 걸립니다.

## 관련 저장소

- [26-2-capstone — 프로젝트 안내](https://github.com/zohijin-k/26-2-capstone)
- [26-2-savings-officer — 두배적금 담당자](https://github.com/zohijin-k/26-2-savings-officer)
- [26-2-youth — 청년 취업지원패키지 신청자·담당자](https://github.com/zohijin-k/26-2-youth)

## 실행 방법

필요 환경은 Python 3.12 이상, Node.js 20 이상입니다. 저장소 루트에서 준비합니다.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r demo/backend/requirements.txt
python -m pip install -r engine_v2/requirements.txt
python engine_v2/tools/fetch_own_models.py
cd demo/frontend && npm install && cd ../..
python -m demo.fixtures.make_samples
```

터미널 두 개에서 각각 실행합니다.

```bash
# 백엔드 — 저장소 루트에서
uvicorn demo.backend.main:app --reload --port 8000
```

```bash
# 프런트엔드
cd demo/frontend && npm run dev
```

브라우저에서 <http://localhost:5173>을 엽니다. Vite가 `/api` 요청을 백엔드로 전달합니다.
API 문서는 <http://localhost:8000/docs>에서 확인할 수 있습니다.

로컬 OCR은 macOS를 포함해 own이 기본이며 모델 파일은 별도로 내려받습니다.
기본 모델 경로에 파일이 없으면 easyocr로 대체합니다. 전북AI 연동은 이번 실행에서
사용하지 않으므로 JBAI_* 설정은 비워 둡니다. 시연용 문서는 합성 데이터로 만듭니다.

작성 중인 신청은 **같은 브라우저 탭**에서만 이어서 쓸 수 있습니다. 새 탭을 열면 새 신청이 시작됩니다.

### 서류 업로드만 시험할 때 (개발용)

1단계 본인인증을 마친 신청의 2단계(서식·동의·서명)를 가짜 값으로 채워, 서식 작성 없이 서류 업로드로 넘어갈 수 있습니다. 데모 DB에서만 동작합니다.

1. 화면에서 1단계 본인인증을 마칩니다.
2. 저장소 루트에서 실행합니다.
   ```bash
   PYTHONPATH=. python -B -m demo.backend.tools.seed_application
   ```
3. **1단계를 한 같은 탭** 주소창에 출력된 `/apply/upload` 주소를 입력합니다. 새 탭에서는 열리지 않습니다.
4. 근로유형을 고르고 서류를 올립니다.
5. 시험이 끝나면 정리합니다.
   ```bash
   PYTHONPATH=. python -B -m demo.backend.tools.seed_application --clean
   ```

시드한 신청은 2단계를 화면에서 다시 저장하지 마세요. 정리 표시가 지워져 `--clean`이 그 신청을 놓칩니다. 옵션과 자세한 동작은 [데모 안내](demo/README.md)를 참고하세요.

`--clean`은 **가장 최근에 만든 신청일 때만** 실행하세요. 신청번호를 전체 건수로 매기기 때문에,
그 뒤에 만들어진 신청이 있는 상태에서 지우면 새 신청 생성이 번호 중복으로 실패합니다.
그럴 때는 `python -m demo.backend.reset`으로 데모 데이터를 초기화합니다.

## 시험

프런트엔드는 `demo/frontend`에서 실행합니다.

```bash
npm run lint                 # 경고 1개(StatusBadge)·오류 0개가 기준
npx tsc -b                   # 타입 검사
node --test tests/           # 단위 시험 76개
node src/forms/phone.test.ts
npx vite build
```

백엔드와 시나리오는 저장소 루트에서 실행합니다. 백엔드 전체 시험은 임시 파일을 약 5GB 씁니다.

```bash
python -m pytest demo/backend/tests -q                       # 1,339개 통과가 기준
python -m demo.backend.tests.run_p4_scenarios                # 통과 195 / 실패 0
python -m demo.backend.tests.run_p14_pdf_forms_scenarios     # 원본 서식 좌표·렌더링
```

P4 시나리오는 `demo/` 아래 `.py`·`.ts`·`.tsx`·`.css`에 `download`, `attachment`라는 문자열이 있으면 실패합니다.
화면 코드에서는 이 두 단어를 쓰지 않습니다. 전체 시험 방법은 [개발 안내](docs/DEVELOPMENT.md)에 있습니다.

## 개발과 참고 문서

- [개발 안내](docs/DEVELOPMENT.md): 환경, 실행 및 시험 방법
- [사용 안내](docs/USER_GUIDE.md): 신청자 화면 사용 순서
- [데모 안내](demo/README.md): 서식 작성·서류 업로드와 개발 도구
- [엔진 안내](engine_v2/README.md): OCR·서류 추출 도구
- [제3자 고지](THIRD_PARTY_NOTICES.md): 모델·글꼴·패키지 출처와 라이선스
- [디자인 프롬프트](docs/DESIGN_PROMPT.md): 이 화면의 디자인을 다른 청년정책 신청 화면에 옮길 때 쓰는 프롬프트
- 화면 규칙: [`.trellis/spec/frontend/`](.trellis/spec/frontend/index.md) — 디자인 체계, 서류 업로드 대기열, 원본 PDF 작업 화면

본인인증·서류 업로드·접수 완료·마이페이지는 좁은 화면에서도 가로 스크롤 없이 보입니다.
서식 작성은 PC 사용을 기준으로 합니다. 서식은 원본 PDF 배치를 유지하므로 좁은 화면에서는
서식 영역 안에서 가로 스크롤이 생깁니다. OCR 판독 결과는 오류가 있을 수 있으며, 신청자에게
심사 점수는 공개하지 않습니다. 시험에는 가상 정보와 합성 서류만 사용합니다.
