"use client";

import { useEffect, useRef } from "react";
import "mathlive";
import { setActiveMathField } from "./core/mathEditor";

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
  const ref = useRef<any>(null);

  useEffect(() => {
    const mf = ref.current;
    mf.addEventListener("focusin", () => {
  setActiveMathField(mf);
});

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
    if (ref.current && ref.current.value !== value) {
      ref.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus) {
      requestAnimationFrame(() => {
        ref.current?.focus();
      });
    }
  }, [autoFocus]);

  return (
    <math-field
      ref={ref}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        fontSize: "28px",
        minWidth: "40px",
        outline: "none",
        border: "none",
        background: "transparent",
      }}
    />
  );
}
