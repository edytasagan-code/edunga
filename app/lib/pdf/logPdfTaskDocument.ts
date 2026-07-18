import { parseEditorDocument } from "@/app/components/editor/parseEditorDocument";
import type { PdfTaskContentItem } from "./types";
import { isEditorDocument } from "./types";

export function logPdfTaskDocuments(tasks: PdfTaskContentItem[]): void {
  for (const task of tasks) {
    const value = task.value;
    const document = parseEditorDocument(value);

    if (typeof value === "string" && value.trim()) {
      console.log("[pdf-task]", {
        number: task.number,
        kind: "string",
        textPreview: value.trim().slice(0, 120),
      });
      continue;
    }

    if (!document) {
      console.warn("[pdf-task] missing document", { number: task.number });
      continue;
    }

    const mathNodes = document.paragraphs.flatMap((paragraph) =>
      paragraph.children.filter(
        (node): node is Extract<typeof node, { type: "math" }> =>
          node.type === "math"
      )
    );

    const textPreview = document.paragraphs
      .flatMap((paragraph) =>
        paragraph.children
          .filter((node) => node.type === "text")
          .map((node) => node.text)
      )
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);

    console.log("[pdf-task]", {
      number: task.number,
      kind: "editor-document",
      paragraphs: document.paragraphs.length,
      mathNodes: mathNodes.length,
      textPreview: textPreview || "(empty)",
      mathLatex: mathNodes.map((node) => ({
        nodeId: node.id,
        latex: node.latex,
      })),
      matchesPreviewShape: isEditorDocument(value),
    });
  }
}
