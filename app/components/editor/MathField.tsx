"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import "mathlive";
import "mathlive/static.css";
import type { MathfieldElement } from "mathlive";

import {
  focusMathField,
  registerMathField,
  unregisterMathField,
} from "./commands";
import {
  createMathBoundaryState,
  type MathBoundaryState,
} from "./inlineNavigation";

export type MathNavigationHandlers = {
  arrowLeft: (state: MathBoundaryState) => boolean;
  arrowRight: (state: MathBoundaryState) => boolean;
  backspace: (state: MathBoundaryState) => boolean;
  delete: (state: MathBoundaryState) => boolean;
  moveOut: (
    direction: "forward" | "backward",
    state: MathBoundaryState
  ) => boolean;
};

type Props = {
  value: string;
  onChange: (latex: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  navigation: MathNavigationHandlers;
  onSelectAll?: () => void;
  autoFocus?: boolean;
};

function isModifiedKey(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}

export default function MathField({
  value,
  onChange,
  onFocus,
  onBlur,
  navigation,
  onSelectAll,
  autoFocus = false,
}: Props) {
  const elementRef = useRef<MathfieldElement | null>(
    null
  );
  const [mathfield, setMathfield] =
    useState<MathfieldElement | null>(null);
  const onChangeRef = useRef(onChange);
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);
  const navigationRef = useRef(navigation);
  const onSelectAllRef = useRef(onSelectAll);

  onChangeRef.current = onChange;
  onFocusRef.current = onFocus;
  onBlurRef.current = onBlur;
  navigationRef.current = navigation;
  onSelectAllRef.current = onSelectAll;

  const setElementRef = useCallback(
    (node: MathfieldElement | null) => {
      elementRef.current = node;
      setMathfield((current) =>
        current === node ? current : node
      );
    },
    []
  );

  useEffect(() => {
    const mf = mathfield;

    if (!mf) return;

    mf.mathVirtualKeyboardPolicy = "manual";
    mf.popoverPolicy = "off";
    mf.environmentPopoverPolicy = "off";
    mf.menuItems = [];
    mf.smartMode = false;
    mf.smartFence = true;
    mf.defaultMode = "math";
    mf.placeholderSymbol = "\u25A1";
    mf.mathModeSpace = "\\:";

    const boundaryState = () =>
      createMathBoundaryState(mf);

    const handleInput = () => {
      onChangeRef.current(mf.getValue("latex"));
    };

    const handleFocus = () => {
      registerMathField(mf);
      onFocusRef.current?.();
    };

    const handleBlur = () => {
      unregisterMathField(mf);
      onBlurRef.current?.();
    };

    const handleContextMenu = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const handleMoveOut = (event: Event) => {
      const direction = (
        event as CustomEvent<{ direction: string }>
      ).detail?.direction;

      if (
        direction !== "forward" &&
        direction !== "backward"
      ) {
        return;
      }

      const state = boundaryState();
      const handled = navigationRef.current.moveOut(
        direction,
        state
      );

      if (handled) {
        event.preventDefault();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "a"
      ) {
        event.preventDefault();
        event.stopPropagation();
        onSelectAllRef.current?.();
        return;
      }

      if (
        (event.key === " " && event.altKey) ||
        (event.key === "F10" && event.shiftKey)
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (isModifiedKey(event)) {
        return;
      }

      if (event.shiftKey) {
        return;
      }

      const state = boundaryState();
      const nav = navigationRef.current;

      if (event.key === " " && state.atEnd) {
        event.preventDefault();
        event.stopPropagation();
        nav.arrowRight(state);
        return;
      }

      if (event.key === "Backspace" && nav.backspace(state)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.key === "Delete" && nav.delete(state)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        nav.arrowRight(state);
        return;
      }

      if (event.key === "ArrowLeft" && nav.arrowLeft(state)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (
        event.key === "Tab" &&
        !event.shiftKey &&
        nav.arrowRight(state)
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.key === "ArrowRight" && nav.arrowRight(state)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    mf.addEventListener("move-out", handleMoveOut);
    mf.addEventListener("input", handleInput);
    mf.addEventListener("focusin", handleFocus);
    mf.addEventListener("focus", handleFocus);
    mf.addEventListener("focusout", handleBlur);
    mf.addEventListener("contextmenu", handleContextMenu);
    mf.addEventListener("keydown", handleKeyDown, {
      capture: true,
    });

    return () => {
      mf.removeEventListener("move-out", handleMoveOut);
      mf.removeEventListener("input", handleInput);
      mf.removeEventListener("focusin", handleFocus);
      mf.removeEventListener("focus", handleFocus);
      mf.removeEventListener("focusout", handleBlur);
      mf.removeEventListener(
        "contextmenu",
        handleContextMenu
      );
      mf.removeEventListener("keydown", handleKeyDown, {
        capture: true,
      });
    };
  }, [mathfield]);

  useEffect(() => {
    const mf = mathfield;

    if (!mf) return;

    const current = mf.getValue("latex");

    if (current !== value) {
      mf.setValue(value, { format: "latex" });
    }
  }, [mathfield, value]);

  useEffect(() => {
    const mf = mathfield;

    if (!autoFocus || !mf) {
      return;
    }

    let cancelled = false;
    // Wait a frame so MathLive finishes upgrading the custom element.
    const frame = window.requestAnimationFrame(() => {
      if (cancelled || !mf.isConnected) {
        return;
      }

      focusMathField(mf);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [autoFocus, mathfield]);

  return (
    <math-field
      ref={setElementRef}
      popover-policy="off"
      math-mode-space="\:"
      style={{
        display: "inline-block",
        verticalAlign: "baseline",
        minWidth: value ? undefined : "1.5ch",
        background: "transparent",
        fontSize: "inherit",
        lineHeight: "inherit",
        color: "inherit",
        padding: 0,
        margin: 0,
      }}
    />
  );
}
