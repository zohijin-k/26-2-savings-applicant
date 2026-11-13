# 두배적금 신청자 화면

`26-2-savings-applicant`는 **전북청년 함께 두배적금 신청자 전용 화면 저장소**입니다.
앱을 열면 두배적금 신청 1단계인 본인인증으로 바로 이동합니다.

신청자는 공고문 서식을 작성·서명하고 서류를 올린 뒤 신청을 제출할 수 있습니다.
현재 신청 흐름은 **1. 본인인증 → 2. 서식 작성 → 3. 서류 업로드 및 제출**입니다.
본인인증은 실제 인증 서비스 연동 전의 데모 방식입니다.

## 관련 저장소

- [26-2-capstone — 프로젝트 안내](https://github.com/zohijin-k/26-2-capstone)
- [26-2-savings-officer — 두배적금 담당자](https://github.com/zohijin-k/26-2-savings-officer)
- [26-2-youth-applicant — 청년 취업지원패키지 신청자](https://github.com/zohijin-k/26-2-youth-applicant)
- [26-2-youth-officer — 청년 취업지원패키지 담당자](https://github.com/zohijin-k/26-2-youth-officer)

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

## 개발과 참고 문서

- [개발 안내](docs/DEVELOPMENT.md): 환경, 실행 및 시험 방법
- [데모 안내](demo/README.md): 서식 작성·서류 업로드와 개발 도구
- [엔진 안내](engine_v2/README.md): OCR·서류 추출 도구
- [제3자 고지](THIRD_PARTY_NOTICES.md): 모델·글꼴·패키지 출처와 라이선스

화면은 PC 사용을 기준으로 합니다. 서식은 원본 PDF 배치를 유지하며 좁은 화면에서는
가로 스크롤이 생길 수 있습니다. OCR 판독 결과는 오류가 있을 수 있으며, 신청자에게
심사 점수는 공개하지 않습니다. 시험에는 가상 정보와 합성 서류만 사용합니다.
