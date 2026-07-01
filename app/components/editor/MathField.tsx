"use client";

import { useEffect, useRef } from "react";
import "mathlive";

type Props = {
  value: string;
  placeholder?: string;
  autoFocus?: boolean;
  onChange: (latex: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }

  interface HTMLElementTagNameMap {
    "math-field": HTMLElement & {
      value: string;
      getValue: (format?: string) => string;
      setValue: (value: string) => void;
      focus: () => void;
    };
  }
}

export default function MathField({
  value,
  placeholder = "",
  autoFocus = false,
  onChange,
  onFocus,
  onBlur,
}: Props) {
  const ref =
    useRef<HTMLElementTagNameMap["math-field"]>(null);

  useEffect(() => {
    const field = ref.current;

    if (!field) return;

    if (field.getValue("latex") !== value) {
      field.setValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (!autoFocus) return;

    requestAnimationFrame(() => {
      ref.current?.focus();
    });
  }, [autoFocus]);

  useEffect(() => {
    const field = ref.current;

    if (!field) return;

    const handleInput = () => {
      onChange(field.getValue("latex"));
    };

    const handleFocus = () => onFocus?.();

    const handleBlur = () => onBlur?.();

    field.addEventListener("input", handleInput);
    field.addEventListener("focus", handleFocus);
    field.addEventListener("blur", handleBlur);

    return () => {
      field.removeEventListener("input", handleInput);
      field.removeEventListener("focus", handleFocus);
      field.removeEventListener("blur", handleBlur);
    };
  }, [onChange, onFocus, onBlur]);

  return (
    <math-field
      ref={ref}
      aria-label={placeholder}
      className="
        inline-flex
        min-w-[48px]
        px-1
        py-0.5
        text-lg
        text-white
        outline-none
      "
    />
  );
}