import { join } from "node:path";

import { Font } from "@react-pdf/renderer";

let registered = false;

export const PDF_BODY_FONT = "DejaVu Sans";

export function registerPdfBodyFont() {
  if (registered) {
    return;
  }

  const dir = join(process.cwd(), "node_modules/dejavu-fonts-ttf/ttf");

  Font.register({
    family: PDF_BODY_FONT,
    fonts: [
      {
        src: join(dir, "DejaVuSans.ttf"),
        fontWeight: "normal",
        fontStyle: "normal",
      },
      {
        src: join(dir, "DejaVuSans-Oblique.ttf"),
        fontWeight: "normal",
        fontStyle: "italic",
      },
      {
        src: join(dir, "DejaVuSans-Bold.ttf"),
        fontWeight: "bold",
        fontStyle: "normal",
      },
      {
        src: join(dir, "DejaVuSans-BoldOblique.ttf"),
        fontWeight: "bold",
        fontStyle: "italic",
      },
    ],
  });

  registered = true;
}
