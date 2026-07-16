import { mathjax } from "mathjax-full/js/mathjax.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";

import { measureSvg } from "./measureSvg";
import type { MathNodeRenderer, MathSvgRender } from "./types";

type MathJaxDocument = ReturnType<typeof mathjax.document>;

let mathDocument: MathJaxDocument | null = null;
let registeredAdaptor: ReturnType<typeof liteAdaptor> | null = null;

function getMathDocument(): MathJaxDocument {
  if (mathDocument) {
    return mathDocument;
  }

  registeredAdaptor = liteAdaptor();
  RegisterHTMLHandler(registeredAdaptor);

  const tex = new TeX({
    packages: ["base", "ams", "newcommand", "boldsymbol"],
    inlineMath: [["$", "$"]],
    displayMath: [["$$", "$$"]],
  });

  const svg = new SVG({
    fontCache: "none",
  });

  mathDocument = mathjax.document("", {
    InputJax: tex,
    OutputJax: svg,
  });

  return mathDocument;
}

function extractSvgString(output: unknown): string {
  const adaptor = registeredAdaptor ?? liteAdaptor();
  const html = adaptor.outerHTML(
    output as Parameters<typeof adaptor.outerHTML>[0]
  );
  const svgMatch = /<svg[\s\S]*<\/svg>/.exec(html);

  if (svgMatch) {
    return svgMatch[0];
  }

  return html;
}

export const latexToSvgRenderer: MathNodeRenderer<MathSvgRender> = {
  format: "svg",

  async render(latex: string): Promise<MathSvgRender> {
    const trimmed = latex.trim();

    if (!trimmed) {
      return {
        format: "svg",
        svg: "",
        widthPt: 0,
        heightPt: 0,
      };
    }

    const html = getMathDocument();
    const node = html.convert(trimmed, {
      display: false,
    });

    const svg = extractSvgString(node);
    const { widthPt, heightPt } = measureSvg(svg);

    return {
      format: "svg",
      svg,
      widthPt,
      heightPt,
    };
  },
};

export async function renderLatexToSvg(
  latex: string
): Promise<MathSvgRender> {
  return latexToSvgRenderer.render(latex);
}
