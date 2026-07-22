import { readFileSync } from "fs";
import { processPdfImport } from "../app/lib/import/processImport.ts";
import { getImportSession } from "../app/lib/import/sessionStore.ts";

const pdfPath =
  "c:/Users/edyta/Dropbox/Mój komputer (LAPTOP-CIN5IPK8)/Downloads/klasa 1 pdf.pdf";

async function main() {
  const buffer = readFileSync(pdfPath);
  const result = await processPdfImport("klasa 1 pdf.pdf", buffer);
  console.log("process:", result);

  const session = getImportSession(result.sessionId);
  console.log("exercises:", session?.exercises.length);
  for (const exercise of session?.exercises ?? []) {
    console.log(
      `${exercise.number} | ${exercise.level ?? "unknown"} | detected=${exercise.levelDetected}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
