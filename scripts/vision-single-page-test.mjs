import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { pdf } from "pdf-to-img";
import { extractExercisesFromPageImage } from "../app/lib/import/visionExtract.ts";

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

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: vision-single-page-test.mjs <pdf-path>");
  process.exit(1);
}

loadEnvFile();
const buffer = readFileSync(pdfPath);
const document = await pdf(buffer, { scale: 2.5 });
let pageIndex = 0;

const targetPage = Number(process.argv[3] ?? 1);

for await (const image of document) {
  pageIndex += 1;
  if (pageIndex < targetPage) continue;
  if (pageIndex > targetPage) break;
  const result = await extractExercisesFromPageImage(Buffer.from(image), pageIndex);
  console.log(
    JSON.stringify(
      {
        ok: true,
        pageIndex,
        exerciseCount: result.exercises.length,
        ids: result.exercises.map((e) => e.identifier).filter(Boolean),
        firstId: result.exercises[0]?.identifier ?? null,
        sampleInstruction: (result.exercises[0]?.instruction ?? "").slice(0, 120),
      },
      null,
      2
    )
  );
}
