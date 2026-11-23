# Reproducing the observed local environment

This additive lock covers the backend, engine_v2 (including macOS OCR dependencies), uvicorn standard extras and pytest. It records CPython 3.14.6 on macOS 26.6.2 arm64. It does not establish support for Python 3.12, Linux or Windows. Use each platform's separately verified lock when one becomes available. Do not replace the existing requirements or CI with this platform-specific file.

From the repository root, create a new environment with the matching interpreter:

```sh
repro_dir="$(mktemp -d /tmp/capstone-repro.XXXXXX)"
python3.14 -m venv "$repro_dir/venv"
"$repro_dir/venv/bin/python" -m pip install --require-hashes --only-binary=:all: -r demo/backend/locks/macos-arm64-py314.txt
"$repro_dir/venv/bin/python" -m pip check
JBAI_ALLOW_REAL_DOCS=false "$repro_dir/venv/bin/python" -B -m pytest -q demo/backend/tests engine_v2/tests
```

For offline reproduction, first download these exact wheels with `pip download --require-hashes --only-binary=:all: -r demo/backend/locks/macos-arm64-py314.txt -d /tmp/capstone-wheels`, then install with `--no-index --find-links=/tmp/capstone-wheels --require-hashes`. A wheel hash permits only that artifact. A missing wheel must fail; do not silently remove hashes or install a source archive.

The lock does not include OCR weights, private data, fonts or institution assets. Tests requiring those assets can skip or fail in a filtered source snapshot. Run application servers only with a fresh synthetic database and the documented program configuration. This lock is installation evidence, not a project license or permission to redistribute dependencies. PyMuPDF's AGPL/commercial terms and bundled package notices require separate rights review. PRODUCTION_NOT_READY.
