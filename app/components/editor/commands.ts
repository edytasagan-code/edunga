import "mathlive";
import type { InsertOptions, MathfieldElement } from "mathlive";

import {
  MATH_SYMBOL_LATEX,
  MATH_TEMPLATE_LATEX,
  type MathSymbolKey,
  type MathTemplateKey,
} from "./mathTemplates";

type MathFieldRegistry = {
  currentField: MathfieldElement | null;
};

const REGISTRY_KEY = "__edungaMathFieldRegistry__";

function isMathFieldElement(
  element: Element | null | undefined
): element is MathfieldElement {
  return element?.tagName === "MATH-FIELD";
}

function getRegistry(): MathFieldRegistry {
  const global = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: MathFieldRegistry;
  };

  if (!global[REGISTRY_KEY]) {
    global[REGISTRY_KEY] = { currentField: null };
  }

  return global[REGISTRY_KEY];
}

export function registerMathField(
  field: MathfieldElement | null
) {
  if (field) {
    getRegistry().currentField = field;
  }
}

export function unregisterMathField(
  field: MathfieldElement | null
) {
  const registry = getRegistry();

  if (field && registry.currentField === field) {
    registry.currentField = null;
  }
}

function isWithinRoot(
  field: MathfieldElement,
  root?: ParentNode | null
): boolean {
  return !root || root.contains(field);
}

export function resolveActiveField(
  root?: ParentNode | null
): MathfieldElement | null {
  const registry = getRegistry();
  const registered = registry.currentField;

  if (
    registered?.isConnected &&
    isWithinRoot(registered, root)
  ) {
    return registered;
  }

  const active = document.activeElement?.closest(
    "math-field"
  );

  if (
    isMathFieldElement(active) &&
    isWithinRoot(active, root)
  ) {
    registry.currentField = active;
    return active;
  }

  return null;
}

export function focusMathField(
  field: MathfieldElement | Element | null | undefined
) {
  if (!isMathFieldElement(field) || !field.isConnected) {
    return;
  }

  registerMathField(field);
  field.focus();
}

export type { MathSymbolKey, MathTemplateKey };

export type MathTemplate = MathTemplateKey;

function insertIntoActiveField(
  latex: string,
  root?: ParentNode | null,
  selectionMode?: InsertOptions["selectionMode"]
) {
  const field = resolveActiveField(root);

  if (!field) {
    return false;
  }

  const hasPlaceholder = /#[0?@]/.test(latex);

  field.focus();

  return field.insert(latex, {
    selectionMode:
      selectionMode ??
      (hasPlaceholder ? "placeholder" : "after"),
    focus: true,
    scrollIntoView: false,
  });
}

export function insertMathTemplate(
  template: MathTemplateKey,
  root?: ParentNode | null
) {
  return insertIntoActiveField(
    MATH_TEMPLATE_LATEX[template],
    root
  );
}

export function insertMathSymbol(
  symbol: MathSymbolKey,
  root?: ParentNode | null
) {
  return insertIntoActiveField(
    MATH_SYMBOL_LATEX[symbol],
    root,
    "after"
  );
}

export function insertLatex(
  latex: string,
  root?: ParentNode | null
) {
  return insertIntoActiveField(latex, root);
}

export function toggleVirtualKeyboard() {
  const keyboard = window.mathVirtualKeyboard;

  if (!keyboard) {
    return;
  }

  if (keyboard.visible) {
    keyboard.hide();
  } else {
    keyboard.show();
  }
}
