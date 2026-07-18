# Import pipeline evaluation (PoC)

Standalone comparison of **OCR (Tesseract)** vs **Vision AI (multimodal)** on the same textbook page image.

Not integrated into EDUNGA.

## Input

Default fixture: `scripts/fixtures/poc-textbook-page-1.41.png`  
(Pazdro exercise **1.41** with subtasks a–d and answer key)

## Run

```bash
# Requires OPENAI_API_KEY in .env for vision branch
npm run poc-compare-import

# Or with a custom image:
node scripts/poc/compare-import-pipelines.mjs path/to/page.png
```

## Output

- Console summary of both pipelines
- `scripts/poc/output/comparison-<timestamp>.json` — full side-by-side report
- `scripts/poc/output/vision-<timestamp>.json` — structured vision result

## Vision JSON schema (per exercise)

- `identifier` — e.g. `1.41`
- `instruction` — Polish task text
- `subtasks[]` — `{ label, expression, mathElements[] }`
- `answers[]` — `{ label, value }` when visible on page
- `level` — `basic` / `extended` / `unknown` (from number color)

## What to compare

| Aspect | OCR | Vision |
|--------|-----|--------|
| Mixed numbers | Lost or wrong | Must preserve exactly (e.g. `1 3/4`, not `1/4`) |
| Fractions | Often broken | Preserve as written, no simplification |
| Multiplication (·) | Often missing | Preserve typography from page |
| Subtasks a–d | Line fragmentation | Structured subtasks |
| Answers | Garbled or missing | Should read Odp. section |
| Identifier | Partial | Should read 1.41 |
