import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { Document, Image, Page, Text, renderToBuffer } from "@react-pdf/renderer";
import sharp from "sharp";

async function dotDataUri(): Promise<string> {
  const png = await sharp({
    create: {
      width: 2,
      height: 2,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function main() {
  const dot = await dotDataUri();
  const element = createElement(
    Document,
    null,
    createElement(
      Page,
      { size: "A4" },
      createElement(
        Text,
        null,
        "A ",
        createElement(Image, { src: dot, style: { width: 10, height: 10 } }),
        " B"
      )
    )
  );

  const buffer = await renderToBuffer(element);
  writeFileSync("test-inline-image.pdf", buffer);
  console.log("ok", buffer.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
