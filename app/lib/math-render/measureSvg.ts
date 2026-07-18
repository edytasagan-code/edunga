import { DOCUMENT_FONT_SIZE_PT } from "@/app/lib/documentTypography";

/** MathJax reports dimensions in ex; scale to match body text size. */
const EX_TO_PT = DOCUMENT_FONT_SIZE_PT / 2.072;

function parseEx(value: string | null): number {
  if (!value) {
    return 0;
  }

  const match = /^(-?[\d.]+)ex$/.exec(value.trim());

  if (!match) {
    return 0;
  }

  return parseFloat(match[1]) * EX_TO_PT;
}

export function measureSvg(svg: string): {
  widthPt: number;
  heightPt: number;
  baselineShiftPt: number;
} {
  const widthMatch = /width="([^"]+)"/.exec(svg);
  const heightMatch = /height="([^"]+)"/.exec(svg);
  const verticalAlignMatch =
    /vertical-align:\s*(-?[\d.]+)ex/.exec(svg);

  let rawWidthPt = parseEx(widthMatch?.[1] ?? null);
  let rawHeightPt = parseEx(heightMatch?.[1] ?? null);
  let rawBaselineShiftPt = parseEx(
    verticalAlignMatch?.[1] ? `${verticalAlignMatch[1]}ex` : null
  );

  if (!rawHeightPt) {
    rawHeightPt = DOCUMENT_FONT_SIZE_PT;
  }

  if (!rawWidthPt) {
    rawWidthPt = rawHeightPt * 2;
  }

  const scale = DOCUMENT_FONT_SIZE_PT / rawHeightPt;

  return {
    widthPt: rawWidthPt * scale,
    heightPt: DOCUMENT_FONT_SIZE_PT,
    baselineShiftPt: rawBaselineShiftPt * scale,
  };
}
