import { parseEditorDocument } from "../editor/parseEditorDocument";
import { latexForReadOnlyDisplay } from "@/app/lib/math/sanitizeMathLatex";

export function documentPreviewText(
  value: unknown
): string {
  const document = parseEditorDocument(value);

  if (!document) {
    return typeof value === "string" ? value : "";
  }

  return document.paragraphs
    .map((paragraph) =>
      paragraph.children
        .map((node) => {
          if (node.type === "text") {
            return node.text;
          }

          if (node.type === "math") {
            return latexForReadOnlyDisplay(node.latex);
          }

          return "";
        })
        .join("")
    )
    .join("\n");
}
