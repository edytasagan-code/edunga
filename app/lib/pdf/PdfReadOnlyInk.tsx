import { Path, StyleSheet, Svg } from "@react-pdf/renderer";

import type { InkNode } from "@/app/components/editor/types";
import { pointsToSvgPath } from "@/app/components/editor/core/inkStrokeUtils";

const styles = StyleSheet.create({
  ink: {
    marginVertical: 4,
  },
  inkLeft: {
    alignSelf: "flex-start",
  },
  inkCenter: {
    alignSelf: "center",
  },
  inkRight: {
    alignSelf: "flex-end",
  },
});

type Props = {
  node: InkNode;
  contentScale?: number;
};

export function PdfReadOnlyInk({ node, contentScale = 1 }: Props) {
  const alignStyle =
    node.align === "center"
      ? styles.inkCenter
      : node.align === "right"
        ? styles.inkRight
        : styles.inkLeft;

  const width = node.width * contentScale;
  const height = node.height * contentScale;

  return (
    <Svg
      style={{
        ...styles.ink,
        ...alignStyle,
        width,
        height,
      }}
      viewBox={`0 0 ${node.width} ${node.height}`}
    >
      {node.strokes.map((stroke, index) => (
        <Path
          key={index}
          d={pointsToSvgPath(stroke.points)}
          stroke={stroke.color}
          strokeWidth={Math.min(stroke.width || 1.25, 1.25)}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
