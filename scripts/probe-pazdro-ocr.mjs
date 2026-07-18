import { readFileSync } from "fs";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker } from "tesseract.js";

const pdfPath =
  "c:/Users/edyta/Dropbox/Mój komputer (LAPTOP-CIN5IPK8)/Downloads/klasa 1 pdf.pdf";

async function renderPage(page, scale = 2) {
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");
  await page.render({
    canvasContext: context,
    viewport,
  }).promise;
  return { canvas, viewport };
}

function classifyPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;

  if (saturation < 0.2 && max < 80) {
    return "black";
  }

  if (b > r + 25 && b > g + 15 && b > 90) {
    return "blue";
  }

  return "unknown";
}

function sampleColor(canvas, bbox) {
  const ctx = canvas.getContext("2d");
  const x = Math.max(0, Math.floor(bbox.x0));
  const y = Math.max(0, Math.floor(bbox.y0));
  const w = Math.max(1, Math.floor(bbox.x1 - bbox.x0));
  const h = Math.max(1, Math.floor(bbox.y1 - bbox.y0));
  const data = ctx.getImageData(x, y, w, h).data;

  let black = 0;
  let blue = 0;
  let unknown = 0;

  for (let i = 0; i < data.length; i += 4) {
    const kind = classifyPixel(data[i], data[i + 1], data[i + 2]);
    if (kind === "black") black += 1;
    else if (kind === "blue") blue += 1;
    else unknown += 1;
  }

  const total = black + blue + unknown;
  if (blue > black && blue > total * 0.15) return "extended";
  if (black > blue && black > total * 0.1) return "basic";
  return null;
}

async function main() {
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const worker = await createWorker("pol+eng");
  await worker.setParameters({
    tessedit_pageseg_mode: "6",
  });

  let fullText = "";

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const { canvas } = await renderPage(page, 2.5);
    const png = canvas.toBuffer("image/png");
    const result = await worker.recognize(png);
    const text = result.data.text ?? "";
    fullText += `\n${text}\n`;

    console.log(`\n=== PAGE ${pageNum} OCR (${text.length} chars) ===`);
    console.log(text.slice(0, 2000));

    const numbers = [...text.matchAll(/\b1\.\d{1,3}[a-z]?\b/gi)];
    console.log(`exercise numbers found: ${numbers.length}`);
    console.log("samples:", [...new Set(numbers.map((m) => m[0]))].slice(0, 30));

    for (const word of result.data.words ?? []) {
      const match = word.text.match(/^1\.\d{1,3}[a-z]?$/i);
      if (!match) continue;
      const level = sampleColor(canvas, word.bbox);
      console.log(`  ${word.text} -> level: ${level ?? "UNKNOWN"}`);
    }
  }

  console.log("\n=== TOTAL ===");
  console.log("chars:", fullText.length);
  const allNums = [...fullText.matchAll(/\b1\.\d{1,3}[a-z]?\b/gi)];
  console.log("all numbers:", [...new Set(allNums.map((m) => m[0]))]);

  await worker.terminate();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
