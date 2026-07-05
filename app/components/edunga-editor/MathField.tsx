"use client";

import { useEffect, useRef } from "react";
import "mathlive";


type Props = {
  value: string;
  onChange: (latex: string) => void;
};

// Konfiguracja MathLive (wykonywana raz)

export default function MathField({
  value,
  onChange,
}: Props) {
  const ref = useRef<MathfieldElement>(null);

  useEffect(() => {
    const mf = ref.current;

    if (!mf) return;

    mf.value = value;

    mf.mathVirtualKeyboardPolicy = "manual";
    mf.smartMode = false;
    mf.smartFence = true;
    mf.defaultMode = "math";

    const handleInput = () => {
      onChange(mf.value);
    };

    mf.addEventListener("input", handleInput);

    return () => {
      mf.removeEventListener("input", handleInput);
    };
  }, []);

  useEffect(() => {
    const mf = ref.current;

    if (!mf) return;

    if (mf.value !== value) {
      mf.value = value;
    }
  }, [value]);

  return (
    <math-field
      ref={ref}
      style={{
        minWidth: "48px",
        display: "inline-block",
        border: "none",
        outline: "none",
        background: "transparent",
        fontSize: "1.2rem",
      }}
    />
  );
}