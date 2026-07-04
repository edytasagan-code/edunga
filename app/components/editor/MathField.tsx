"use client";

import { useEffect, useRef } from "react";
import "mathlive";

type Props = {
  value: string;
  autoFocus?: boolean;
  onChange: (latex: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

export default function MathField({
  value,
  autoFocus = false,
  onChange,
  onFocus,
  onBlur,
}: Props) {
  const mathfieldRef = useRef<any>(null);

  useEffect(() => {
    const mf = mathfieldRef.current;

    if (!mf) return;

    mf.value = value ?? "";

    const handleInput = () => {
      onChange(mf.value);
    };

    mf.addEventListener("input", handleInput);

    return () => {
      mf.removeEventListener("input", handleInput);
    };
  }, []);

  useEffect(() => {
    const mf = mathfieldRef.current;

    if (!mf) return;

    if (mf.value !== value) {
      mf.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus) {
      requestAnimationFrame(() => {
        mathfieldRef.current?.focus();
      });
    }
  }, [autoFocus]);

  return (
    <math-field
      ref={mathfieldRef}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        minWidth: "40px",
        minHeight: "36px",
        fontSize: "28px",
        border: "none",
        outline: "none",
        background: "transparent",
        display: "inline-block",
      }}
    />
  );
}