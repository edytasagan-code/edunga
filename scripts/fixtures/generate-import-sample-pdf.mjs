import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PDFDocument, StandardFonts } from "pdf-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, "import-sample-math.pdf");

const lines = [
  "Zadania matematyczne — przyklad importu",
  "",
  "1. Oblicz wartosc wyrazenia $x^2+1$ dla $x=2$.",
  "",
  "2. Rozwiaz rownanie $2x-4=0$.",
  "",
  "3. Wykonaj dzialanie $\\frac{3}{4}+\\frac{1}{2}$.",
];

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const page = pdf.addPage([595, 842]);
let y = 800;

for (const line of lines) {
  page.drawText(line, {
    x: 48,
    y,
    size: 12,
    font,
  });
  y -= 22;
}

const bytes = await pdf.save();
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, bytes);
console.log(`Wrote ${outputPath} (${bytes.length} bytes)`);
