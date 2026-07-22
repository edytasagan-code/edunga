import { parseEditorDocument } from "@/app/components/editor/parseEditorDocument";
import type { EditorDocument, MathNode } from "@/app/components/editor/types";
import { latexForReadOnlyDisplay } from "@/app/lib/math/sanitizeMathLatex";
import {
  renderLatexToSvg,
  mathSvgRenderToPdfAsset,
  type PdfMathAsset,
} from "@/app/lib/math-render";

export type PdfMathRenderCache = Map<string, PdfMathAsset>;

function collectLatexValues(document: EditorDocument | null): string[] {
  if (!document) {
    return [];
  }

  const values = new Set<string>();

  for (const paragraph of document.paragraphs) {
    for (const node of paragraph.children) {
      if (node.type === "math") {
        const latex = latexForReadOnlyDisplay(node.latex);

        if (latex) {
          values.add(latex);
        }
      }

      if (node.type === "true-false-table") {
        for (const row of node.rows) {
          for (const child of row.statement) {
            if (child.type === "math") {
              const latex = latexForReadOnlyDisplay(child.latex);

              if (latex) {
                values.add(latex);
              }
            }
          }
        }
      }
    }
  }

  return [...values];
}

function collectLatexFromValue(value: unknown): string[] {
  return collectLatexValues(parseEditorDocument(value));
}

export async function buildPdfMathRenderCache(
  values: unknown[]
): Promise<PdfMathRenderCache> {
  const latexValues = new Set<string>();

  for (const value of values) {
    for (const latex of collectLatexFromValue(value)) {
      latexValues.add(latex);
    }
  }

  const cache: PdfMathRenderCache = new Map();

  await Promise.all(
    [...latexValues].map(async (latex) => {
      const render = await renderLatexToSvg(latex);
      const asset = await mathSvgRenderToPdfAsset(render);

      if (!asset.dataUri) {
        console.warn("[pdf-math] empty PNG for latex", { latex });
        return;
      }

      cache.set(latex, asset);
    })
  );

  return cache;
}

export function getPdfMathAsset(
  cache: PdfMathRenderCache,
  node: MathNode
): PdfMathAsset | null {
  const latex = node.latex.trim();

  if (!latex) {
    return null;
  }

  return cache.get(latex) ?? null;
}
