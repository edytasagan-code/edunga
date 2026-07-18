import { writeFileSync } from "node:fs";

import type { EditorDocument } from "../app/components/editor/types";
import { defaultDocumentDisplayOptions } from "../app/lib/documentGenerator";
import { generateDocumentPdf } from "../app/lib/pdf/generateDocumentPdf";

function doc(paragraphs: Array<Array<{ type: "text" | "math"; text?: string; latex?: string }>>): EditorDocument {
  return {
    version: 1,
    paragraphs: paragraphs.map((children, pIndex) => ({
      id: `p-${pIndex + 1}`,
      children: children.map((child, nIndex) =>
        child.type === "text"
          ? {
              id: `t-${pIndex + 1}-${nIndex + 1}`,
              type: "text" as const,
              text: child.text ?? "",
            }
          : {
              id: `m-${pIndex + 1}-${nIndex + 1}`,
              type: "math" as const,
              latex: child.latex ?? "",
            }
      ),
    })),
  };
}

async function main() {
  const items = [
    {
      kind: "task" as const,
      number: 1,
      value: doc([
        [
          { type: "text", text: "A " },
          { type: "math", latex: "x^2" },
          { type: "text", text: " B" },
        ],
      ]),
    },
    {
      kind: "task" as const,
      number: 2,
      value: doc([
        [
          { type: "text", text: "Oblicz: " },
          { type: "math", latex: "\\frac{1}{2}+x" },
        ],
      ]),
    },
    {
      kind: "task" as const,
      number: 3,
      value: doc([[{ type: "math", latex: "\\sqrt{x^2+1}" }]]),
    },
    {
      kind: "task" as const,
      number: 4,
      value: doc([
        [
          { type: "math", latex: "x^2" },
          { type: "text", text: " + " },
          { type: "math", latex: "y^2" },
          { type: "text", text: " = " },
          { type: "math", latex: "z^2" },
        ],
      ]),
    },
    {
      kind: "task" as const,
      number: 5,
      value: doc([
        [{ type: "text", text: "Akapit 1: " }, { type: "math", latex: "x^2+1=0" }],
        [{ type: "text", text: "Akapit 2: " }, { type: "math", latex: "\\frac{x+1}{x-1}" }],
      ]),
    },
  ];

  const pdf = await generateDocumentPdf({
    pages: [
      {
        kind: "standard",
        sheet: {
          title: "PDF baseline parity checks",
          display: {
            ...defaultDocumentDisplayOptions(),
            date: "7.07.2026",
          },
          items,
        },
      },
    ],
  });

  writeFileSync("test-inline-math-parity.pdf", pdf);
  console.log("ok", pdf.length, "bytes");
}

main().catch(console.error);
