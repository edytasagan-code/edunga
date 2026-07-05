"use client";

import { useEffect, useRef } from "react";
import "mathlive";

import { useMathContext } from "./MathContext";

type Props = {
  value: string;
  onChange: (latex: string) => void;
};

export default function MathField({
  value,
  onChange,
}: Props) {
  const ref = useRef<any>(null);

  const { setActiveMathField } = useMathContext();

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

    const handleFocus = () => {
      setActiveMathField(mf);
    };

    const handleBlur = () => {
      setActiveMathField(null);
    };

    mf.addEventListener("input", handleInput);
    mf.addEventListener("focus", handleFocus);
    mf.addEventListener("blur", handleBlur);

    return () => {
      mf.removeEventListener("input", handleInput);
      mf.removeEventListener("focus", handleFocus);
      mf.removeEventListener("blur", handleBlur);
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