import { Image, StyleSheet } from "@react-pdf/renderer";

import type { MathNode } from "@/app/components/editor/types";

import type { PdfMathRenderCache } from "./buildPdfMathRenderCache";
import { getPdfMathAsset } from "./buildPdfMathRenderCache";

const styles = StyleSheet.create({
  math: {
    alignSelf: "baseline",
    flexGrow: 0,
    flexShrink: 0,
  },
});

type Props = {
  node: MathNode;
  cache: PdfMathRenderCache;
  contentScale?: number;
};

export function PdfReadOnlyMath({ node, cache, contentScale = 1 }: Props) {
  const asset = getPdfMathAsset(cache, node);

  if (!asset?.dataUri) {
    return null;
  }

  return (
    <Image
      style={[
        styles.math,
        {
          width: asset.widthPt * contentScale,
          height: asset.heightPt * contentScale,
          transform: [
            {
              operation: "translate",
              value: [0, -asset.baselineShiftPt * contentScale],
            },
          ],
        },
      ]}
      src={asset.dataUri}
    />
  );
}
