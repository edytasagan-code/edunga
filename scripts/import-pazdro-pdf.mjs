/**
 * Import Pazdro PDF through the normal import pipeline and save all exercises.
 *
 * Usage:
 *   node scripts/import-pazdro-pdf.mjs "<path-to.pdf>"
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3000";
const pdfArg =
  process.argv[2] ??
  "c:/Users/edyta/Dropbox/Mój komputer (LAPTOP-CIN5IPK8)/Downloads/klasa 1 pdf.pdf";

const PAZDRO_METADATA = {
  klasaId: "1lo",
  dzialId: "zbiory-liczbowe",
  tematId: "zbior-dzialania",
  typ: "otwarte",
  zrodlo: "pazdro",
  identyfikatorPrefix: null,
};

function check(name, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  const pdfPath = resolve(pdfArg);
  const pdfBuffer = readFileSync(pdfPath);
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([pdfBuffer], { type: "application/pdf" }),
    pdfPath.split(/[\\/]/).pop() ?? "pazdro.pdf"
  );

  console.log(`Processing ${pdfPath}`);

  const processResponse = await fetch(`${BASE}/api/import/process`, {
    method: "POST",
    body: formData,
  });
  const processPayload = await processResponse.json();
  check("Process PDF", processResponse.ok, `status=${processResponse.status}`);

  if (!processResponse.ok) {
    console.error(processPayload);
    process.exit(1);
  }

  const { sessionId, exerciseCount, warnings = [] } = processPayload;
  console.log(`Session: ${sessionId}`);
  console.log(`Exercises detected: ${exerciseCount}`);
  warnings.forEach((warning) => console.log(`Warning: ${warning}`));

  const metadataResponse = await fetch(`${BASE}/api/import/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata: PAZDRO_METADATA }),
  });
  check("Apply Pazdro metadata", metadataResponse.ok);

  const session = await fetch(`${BASE}/api/import/${sessionId}`).then((response) =>
    response.json()
  );

  console.log("\nDetected exercises:");
  for (const exercise of session.exercises) {
    console.log(
      `  ${exercise.number ?? "?"} | level=${exercise.level ?? "unknown"} | detected=${exercise.levelDetected}`
    );
  }

  const saveResponse = await fetch(`${BASE}/api/import/${sessionId}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ onlySelected: true }),
  });
  const savePayload = await saveResponse.json();
  check(
    "Batch save to database",
    saveResponse.ok,
    `saved=${savePayload.saved?.length ?? 0}`
  );

  if (!saveResponse.ok) {
    console.error(savePayload);
    process.exit(1);
  }

  console.log("\nSaved tasks:");
  for (const item of savePayload.saved ?? []) {
    const task = await fetch(`${BASE}/api/zadania/${item.id}`).then((response) =>
      response.json()
    );
    check(
      `Task ${item.kod}`,
      Boolean(task.id),
      `ident=${task.identyfikator} tags=${JSON.stringify(task.tagi)} poziom=${task.poziom}`
    );
  }

  console.log(`\nPreview: ${BASE}/nauczyciel/import/${sessionId}`);
  console.log(`Database: ${BASE}/nauczyciel/baza-zadan`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
