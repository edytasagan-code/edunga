import { writeFileSync } from "node:fs";

import type { EditorDocument } from "../app/components/editor/types";
import { defaultDocumentDisplayOptions } from "../app/lib/documentGenerator";
import { generateDocumentPdf } from "../app/lib/pdf/generateDocumentPdf";

const taskDocument: EditorDocument = {
  version: 1,
  paragraphs: [
    {
      id: "p1",
      children: [
        { id: "t1", type: "text", text: "Rozwiąż równanie : " },
        { id: "m1", type: "math", latex: "x^2+4x-87=0" },
        { id: "t2", type: "text", text: "." },
      ],
    },
  ],
};

const task2Document: EditorDocument = {
  version: 1,
  paragraphs: [
    {
      id: "p1",
      children: [
        { id: "t1", type: "text", text: "Oblicz deltę w równaniu : " },
        { id: "m1", type: "math", latex: "x^2+4x-1=0" },
        {
          id: "t2",
          type: "text",
          text: ".\nZnajdź pierwiastki równania..\n",
        },
      ],
    },
  ],
};

const task4Document: EditorDocument = {
  version: 1,
  paragraphs: [
    {
      id: "p1",
      children: [
        { id: "t1", type: "text", text: "Oblicz 2 -8 =" },
      ],
    },
  ],
};

async function main() {
  const pdf = await generateDocumentPdf({
    pages: [
      {
        kind: "standard",
        sheet: {
          title: "Sprawdzian Funkcja kwadratowa",
          display: {
            ...defaultDocumentDisplayOptions(),
            date: "6.07.2026",
          },
          items: [
            {
              kind: "task",
              number: 1,
              value: taskDocument,
            },
            {
              kind: "task",
              number: 2,
              value: task2Document,
            },
            {
              kind: "task",
              number: 3,
              value: taskDocument,
            },
            {
              kind: "task",
              number: 4,
              value: task4Document,
            },
            {
              kind: "task",
              number: 5,
              value: "Oblicz 2 -8   = ",
            },
          ],
        },
      },
    ],
  });

  writeFileSync("test-document-renderer.pdf", pdf);
  console.log("ok", pdf.length, "bytes");
}

main().catch(console.error);
