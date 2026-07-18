# CKE import regression fixtures

Frozen Vision API output and expected `EditorDocument` structures for the CKE (matura) import pipeline.

## FREEZE

The CKE import pipeline is **frozen at 148/148 passing tests** (`npm run test:cke-import`).

- **Allowed:** bug fixes only; each fix must add or update a regression fixture that reproduces the bug.
- **Not allowed:** architectural changes unless driven by a real editor-use issue (not import-pipeline churn).
- **Gate:** `npm run test:cke-import` must stay green before merge.
- **Editor focus:** downstream rendering and editing live in `app/components/editor/` — import code changes require strong justification.

**Dev workflow:** mock Vision fixtures only — no OpenAI API during development. Use scoped tests while fixing one category; run the full suite for final regression. Enable live Vision only for explicit final verification.

## Layout

```
scripts/fixtures/cke-import/
├── vision/           # Input: VisionExercise JSON (Stage 1 output)
│   ├── task-18-mc.json
│   ├── task-pf.json
│   └── ...
└── expected/         # Output: canonical EditorDocument structure (Stage 3)
    ├── task-18-mc.structure.json
    └── ...
```

## Dev workflow

| Phase | What to run | OpenAI API? |
|-------|-------------|-------------|
| **Daily dev** | Scoped test for the fixture you are fixing | No — mock fixtures only |
| **Before merge** | `npm run test:cke-import` (full offline suite) | No |
| **Final verification** | `CKE_IMPORT_LIVE_VISION=1 npm run test:cke-import` | Yes — opt-in only |

```bash
# Dev import with mock fixtures mapped to PDF pages (no API)
CKE_IMPORT_MOCK_PAGES="18:task-18-mc" npm run dev
```

## Fixture library (10 representative categories)

| Category | Fixture(s) | Scoped test command |
|----------|-----------|---------------------|
| Multiple choice | `task-18-mc`, `task-context-mc`, `task-18-figure` | `npm run test:cke-import -- mc` |
| True / False | `task-pf` | `npm run test:cke-import -- true-false` |
| Matching | `task-matching` | `npm run test:cke-import -- matching` |
| Geometry (triangle figure) | `task-18-figure` | `npm run test:cke-import -- geometry` |
| Function graph | `task-image-reading-order` | `npm run test:cke-import -- graph` |
| Table | `task-table` | `npm run test:cke-import -- table` |
| Inline math | `task-18-inline-sentence`, `task-18-mc`, `task-intervals-sets`, `task-set-instruction` | `npm run test:cke-import -- inline-math` |
| Display math | `task-display-math` | `npm run test:cke-import -- display-math` |
| Image-based task | `task-image-reading-order`, `task-18-figure` | `npm run test:cke-import -- image` |
| Open question | `task-zapisz-obliczenia` | `npm run test:cke-import -- open` |

### Task 18 bundle

All three task-18 fixtures (MC, inline sentence, geometry figure):

```bash
npm run test:cke-import -- 18
```

### Single fixture

```bash
npm run test:cke-import -- task-18-mc
npm run test:cke-import -- task-pf
```

### Environment alias

```bash
npm run test:cke-import -- --filter true-false
CKE_IMPORT_FILTER=18 npm run test:cke-import
CKE_IMPORT_SCOPE=geometry npm run test:cke-import
CKE_IMPORT_SCOPE=true-false,matching npm run test:cke-import
```

## Running tests

```bash
# Full offline regression (all fixtures, 148 tests)
npm run test:cke-import

# Scoped — fast, fixture/category only (examples above)
npm run test:cke-import -- true-false
npm run test:cke-import -- 18
npm run test:cke-import -- geometry

# Fail if known regressions are still present
CKE_IMPORT_STRICT_KNOWN=1 npm run test:cke-import

# Live Vision against real CKE PDF (final check only — costs API credits)
# Requires OPENAI_API_KEY + CKE_IMPORT_LIVE_VISION=1; skipped in scoped mode
CKE_IMPORT_LIVE_VISION=1 npm run test:cke-import

# Custom PDF path and live targets
CKE_IMPORT_PDF="path/to/matura.pdf" CKE_IMPORT_LIVE_TARGETS="18,7" CKE_IMPORT_LIVE_VISION=1 npm run test:cke-import
```

Default live PDF path:
`C:\Users\edyta\Dropbox\Mój komputer (LAPTOP-CIN5IPK8)\Downloads\matematyka-2026-maj-matura-podstawowa.pdf`

## All vision fixtures

| Fixture | Primary category | Notes |
|---------|-----------------|-------|
| `task-18-mc` | Multiple choice, inline math | Task 18 — LaTeX in choices |
| `task-context-mc` | Multiple choice | Context → instruction → question → ABCD |
| `task-18-figure` | Geometry, image, MC | Triangle figure + inline ABCD |
| `task-pf` | True / False | `true-false-table` node |
| `task-matching` | Matching | `matching-table` node |
| `task-image-reading-order` | Function graph, image | Wykres funkcji f — known anchor regression |
| `task-table` | Table | Known regression — flattened to tabs |
| `task-18-inline-sentence` | Inline math | Y-sort merge in sentence |
| `task-display-math` | Display math | Standalone equations via mathElements |
| `task-intervals-sets` | Inline math | Intervals, mixed numbers, set union |
| `task-set-instruction` | Inline math | Set literals with √2, π, fractions |
| `task-zapisz-obliczenia` | Open question | "Zapisz obliczenia." ordering |

**Coverage gaps:** none — all 10 representative categories have at least one saved Vision fixture. To add a new edge case, capture from a live run when needed (do not auto-call OpenAI during dev).

## Updating snapshots

When the pipeline is **intentionally** fixed, regenerate expected structures:

```bash
node --import tsx -e "
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { visionExerciseToEditorDocuments } from './app/lib/import/visionToEditorDocument.ts';
import { documentToStructure, FIXTURES_ROOT } from './scripts/lib/cke-import-test-harness.mjs';

const fixtures = [/* list fixture names */];
const outDir = join(FIXTURES_ROOT, 'expected');
mkdirSync(outDir, { recursive: true });
for (const name of fixtures) {
  const exercise = JSON.parse(readFileSync(join(FIXTURES_ROOT, 'vision', name + '.json'), 'utf8'));
  const docs = visionExerciseToEditorDocuments(exercise, name);
  writeFileSync(join(outDir, name + '.structure.json'), JSON.stringify({
    fixture: name,
    tresc: documentToStructure(docs.tresc),
    odpowiedz: documentToStructure(docs.odpowiedz),
  }, null, 2) + '\n');
}
"
```

Or capture fresh Vision JSON from diagnose mode (live run — user-initiated only):

```bash
node --import tsx scripts/vision-import-worker.mjs "path/to/matura.pdf" 18 > scripts/fixtures/cke-import/vision/task-18-live.json
```

Then trim/normalize the JSON and update the matching `expected/*.structure.json`.

## Known regressions (expected to fail)

These tests use `expectedFail: true` and appear as `[KNOWN]` until fixes land:

1. **Image anchor** (`task-image-reading-order`): `after_instruction` figure is appended after all body paragraphs instead of immediately after the instruction paragraph. Symptom: "Zapisz obliczenia." appears before the figure.

2. **Editable tables** (`task-table`): Vision tables are flattened to tab-separated text paragraphs; no `table` EditorDocument node exists yet.

3. **Live Vision task 18** (optional): Vision API non-determinism may return `\(...\)` delimiters or different field splits vs. frozen fixtures.

4. **Duplicate heading** (`task-18-mc`): `formatCkeNumberingPrefix` adds "Zadanie N." to `tresc` while Preview UI card title also shows "Zadanie N" — duplicate display in preview (pipeline + UI interaction).

Set `CKE_IMPORT_STRICT_KNOWN=1` to treat known regressions as hard failures (useful in CI after fixes).

## Structure format

Expected snapshots strip volatile `id` fields and capture semantic node shapes:

```json
{
  "fixture": "task-18-mc",
  "tresc": [
    {
      "nodes": [
        { "type": "text", "text": "Zadanie 18. " },
        { "type": "text", "text": "Dokończ zdanie." }
      ]
    },
    {
      "nodes": [
        { "type": "text", "text": "Liczba " },
        { "type": "math", "latex": "\\frac{25}{8}" }
      ]
    }
  ],
  "odpowiedz": [...]
}
```

## Related scripts

- `scripts/validate-cke-import-regression.mjs` — main offline + scoped regression suite
- `scripts/lib/cke-import-scope.mjs` — scoped filter resolution and category catalog
- `scripts/validate-vision-editor-document.mjs` — Pazdro + CKE unit tests (subset)
- `scripts/validate-inline-latex-regression.mjs` — inline LaTeX parser only
- `scripts/validate-import-metadata.mjs` — metadata + MC + figure tests
- `scripts/vision-import-worker.mjs` — live Vision diagnose mode
