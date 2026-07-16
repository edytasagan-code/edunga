import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const envPath = join(__dirname, "..", ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnvFile();

const { extractExercisesFromPageImage } = await import(
  "../app/lib/import/visionExtract.ts"
);
const { visionExerciseToEditorDocuments } = await import(
  "../app/lib/import/visionToEditorDocument.ts"
);
const { editorDocumentToPlainPreview } = await import(
  "../app/lib/import/textToDocument.ts"
);

const img = readFileSync(
  join(__dirname, "fixtures/poc-textbook-page-1.41.png")
);
const page = await extractExercisesFromPageImage(img, 1);
console.log(JSON.stringify(page, null, 2));

for (const ex of page.exercises) {
  const docs = visionExerciseToEditorDocuments(ex, `test-${ex.identifier}`);
  console.log(`\n${ex.identifier} answer:`, editorDocumentToPlainPreview(docs.odpowiedz));
}
