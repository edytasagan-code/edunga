"use client";

import MathField from "../MathField";

type Props = {
  id: string;
  latex: string;
  selected?: boolean;
  autoFocus?: boolean;
  onChange: (latex: string) => void;
  onFocus?: (id: string) => void;
  onBlur?: (id: string) => void;
};

export default function MathNode({
  id,
  latex,
  selected = false,
  autoFocus = false,
  onChange,
  onFocus,
  onBlur,
}: Props) {
  return (
    <div
      data-node-id={id}
      className={`
        inline-flex
        items-center
        rounded-md
        px-1
        py-0.5
        ${
          selected
            ? "bg-yellow-400/20"
            : ""
        }
      `}
    >
      <MathField
        value={latex}
        autoFocus={autoFocus}
        onChange={onChange}
        onFocus={() => onFocus?.(id)}
        onBlur={() => onBlur?.(id)}
      />
    </div>
  );
}