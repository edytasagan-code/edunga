import type { MathSvgRender } from "./types";
import { measureSvg } from "./measureSvg";
import { svgStringToPngDataUri } from "./svgToPdfImage";

export type PdfMathAsset = {
  dataUri: string;
  widthPt: number;
  heightPt: number;
  baselineShiftPt: number;
};

export async function mathSvgRenderToPdfAsset(
  render: MathSvgRender
): Promise<PdfMathAsset> {
  const { baselineShiftPt } = measureSvg(render.svg);
  const dataUri = await svgStringToPngDataUri(
    render.svg,
    render.widthPt,
    render.heightPt
  );

  return {
    dataUri,
    widthPt: render.widthPt,
    heightPt: render.heightPt,
    baselineShiftPt,
  };
}
