# llama-cpp-python Setup (Mac + Docker)

This repo uses `python -m llama_cpp.server` for local GGUF inference. On Apple Silicon, you likely need OpenBLAS and a source build.

## macOS (Apple Silicon)
1) Install OpenBLAS:
```bash
brew install openblas
```

2) Build from source with OpenBLAS:
```bash
export CMAKE_ARGS="-DGGML_BLAS=ON -DGGML_BLAS_VENDOR=OpenBLAS -DBLAS_VENDOR=OpenBLAS \
  -DBLAS_LIBRARIES=/opt/homebrew/opt/openblas/lib/libopenblas.dylib \
  -DBLAS_INCLUDE_DIRS=/opt/homebrew/opt/openblas/include"
export FORCE_CMAKE=1
pip install --no-binary=:all: llama-cpp-python
```

3) Verify:
```bash
python -m llama_cpp.server --help
```

## Docker (Linux)
You can install `llama-cpp-python` in the container using `pip install llama-cpp-python`. If you want BLAS acceleration in Docker, add OpenBLAS to the image and set `CMAKE_ARGS` similarly.

## Run servers
Set GGUF model paths in `.env`:
```bash
LLM_CHAT_MODEL_PATH=external/grey/models/cognee-distillabs-model-gguf-quantized/model-quantized.gguf
LLM_EMBED_MODEL_PATH=external/grey/models/nomic-embed-text/nomic-embed-text-v1.5.f16.gguf
```

Single-port mode (FastAPI in-process):
```bash
INPROC_LLM=1
```

Then run:
```bash
make llm-embed
make llm-chat
```

## Notes
- If `pip install llama-cpp-python` fails, make sure you’re using a venv and have OpenBLAS installed.
- `LLM_CHAT_CMD` / `LLM_EMBED_CMD` can override the runner if you use a custom server.
