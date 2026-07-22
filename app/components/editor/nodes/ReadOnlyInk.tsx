import type { ImageAlign, InkNode as InkNodeType } from "../types";
import { pointsToSvgPath } from "../core/inkStrokeUtils";

type Props = {
  node: InkNodeType;
  className?: string;
};

const alignClass: Record<ImageAlign, string> = {
  left: "edunga-ink-readonly-align-left",
  center: "edunga-ink-readonly-align-center",
  right: "edunga-ink-readonly-align-right",
};

export default function ReadOnlyInk({ node, className = "" }: Props) {
  const align = node.align ?? "left";

  return (
    <svg
      viewBox={`0 0 ${node.width} ${node.height}`}
      width={node.width}
      height={node.height}
      preserveAspectRatio="xMidYMid meet"
      className={`edunga-ink-readonly ${alignClass[align]} ${className}`.trim()}
      data-node-type="ink"
      aria-label="Odręczna notatka"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <rect
        width={node.width}
        height={node.height}
        fill="#ffffff"
        stroke="#e4e4e7"
        strokeWidth={1}
      />
      {node.strokes.map((stroke, index) => (
        <path
          key={index}
          d={pointsToSvgPath(stroke.points)}
          fill="none"
          stroke={stroke.color}
          strokeWidth={Math.min(stroke.width || 1.25, 1.25)}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
