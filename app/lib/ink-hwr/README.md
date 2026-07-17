# Local handwriting → math (CoMER)

Offline mathematical handwriting recognition for the EDUNGA editor.

## Engine

- Package: [`ink-on`](https://www.npmjs.com/package/ink-on) (`ink-on/core`)
- Model: CoMER (ECCV 2022), INT8 ONNX, ~7.2 MB
- Runs in the browser via ONNX Runtime Web (WASM) — no API key, no server OCR

## Setup (once)

```bash
npm run download:comer-models
npm run copy:onnx-wasm
```

Models go to `public/models/comer/`. WASM goes to `public/onnxruntime-web/`.
If local WASM is missing, the engine falls back to the jsDelivr CDN.

Single-thread WASM is forced (avoids SharedArrayBuffer hangs without COOP/COEP).

## Editor flow

1. Click **✎→fx** on the toolbar.
2. Write in the left canvas (pen / eraser / clear).
3. Live LaTeX + math preview on the right — edit before insert.
4. **Wstaw do edytora** inserts a MathNode at the caret.
