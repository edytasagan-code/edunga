"use client";

import { useRef } from "react";

import MathField from "../MathField";
import type { MathNavigationHandlers } from "../MathField";

type Props = {
  id: string;
  latex: string;
  selected?: boolean;
  autoFocus?: boolean;
  onChange: (latex: string) => void;
  onFocus?: (id: string) => void;
  onBlur?: (id: string) => void;
  navigation: MathNavigationHandlers;
  onSelectAll?: () => void;
};

export default function MathNode({
  id,
  latex,
  selected = false,
  autoFocus = false,
  onChange,
  onFocus,
  onBlur,
  navigation,
  onSelectAll,
}: Props) {
  const wrapperRef = useRef<HTMLSpanElement>(null);

  function handleMouseDown(
    event: React.MouseEvent<HTMLSpanElement>
  ) {
    const field =
      wrapperRef.current?.querySelector("math-field");

    if (!field) {
      return;
    }

    const rect = field.getBoundingClientRect();

    if (event.clientX > rect.right) {
      event.preventDefault();
      navigation.arrowRight({
        empty: !latex.trim(),
        atStart: false,
        atEnd: true,
      });
    }
  }

  return (
    <span
      ref={wrapperRef}
      data-node-id={id}
      data-node-type="math"
      onMouseDown={handleMouseDown}
      className={`
        inline
        align-baseline
        ${selected ? "is-selected" : ""}
      `}
    >
      <MathField
        value={latex}
        autoFocus={autoFocus}
        onChange={onChange}
        onFocus={() => {
          onFocus?.(id);
        }}
        onBlur={() => {
          onBlur?.(id);
        }}
        navigation={navigation}
        onSelectAll={onSelectAll}
      />
    </span>
  );
}
