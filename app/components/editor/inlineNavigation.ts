import type { InlineNode } from "./types";

export type MathBoundaryState = {
  empty: boolean;
  atStart: boolean;
  atEnd: boolean;
};

export type ParagraphNavigatorDeps = {
  children: InlineNode[];
  focusText: (nodeId: string, offset: number) => void;
  focusMath: (nodeId: string, side: "start" | "end") => void;
  focusImage?: (nodeId: string) => void;
  focusInk?: (nodeId: string) => void;
  removeMath: (
    nodeId: string,
    direction: "backward" | "forward"
  ) => void;
  removeImage?: (
    nodeId: string,
    direction: "backward" | "forward"
  ) => void;
  removeInk?: (
    nodeId: string,
    direction: "backward" | "forward"
  ) => void;
};

export type ParagraphNavigator = {
  textArrowLeft: (nodeId: string, offset: number) => boolean;
  textArrowRight: (
    nodeId: string,
    offset: number,
    textLength: number
  ) => boolean;
  textArrowUp: (nodeId: string, offset: number) => boolean;
  textArrowDown: (
    nodeId: string,
    offset: number,
    textLength: number
  ) => boolean;
  textBackspace: (
    nodeId: string,
    offset: number
  ) => boolean;
  textDelete: (
    nodeId: string,
    offset: number,
    textLength: number
  ) => boolean;
  mathArrowLeft: (
    nodeId: string,
    state: MathBoundaryState
  ) => boolean;
  mathArrowRight: (
    nodeId: string,
    state: MathBoundaryState
  ) => boolean;
  mathBackspace: (
    nodeId: string,
    state: MathBoundaryState
  ) => boolean;
  mathDelete: (
    nodeId: string,
    state: MathBoundaryState
  ) => boolean;
  mathMoveOut: (
    nodeId: string,
    direction: "forward" | "backward",
    state: MathBoundaryState
  ) => boolean;
};

function findNodeIndex(
  children: InlineNode[],
  nodeId: string
): number {
  return children.findIndex((node) => node.id === nodeId);
}

function focusPreviousInline(
  children: InlineNode[],
  nodeIndex: number,
  focusText: ParagraphNavigatorDeps["focusText"],
  focusMath: ParagraphNavigatorDeps["focusMath"],
  focusImage?: ParagraphNavigatorDeps["focusImage"],
  focusInk?: ParagraphNavigatorDeps["focusInk"]
): boolean {
  for (let index = nodeIndex - 1; index >= 0; index -= 1) {
    const candidate = children[index];

    if (candidate.type === "text") {
      focusText(candidate.id, candidate.text.length);
      return true;
    }

    if (candidate.type === "math") {
      focusMath(candidate.id, "end");
      return true;
    }

    if (candidate.type === "image") {
      focusImage?.(candidate.id);
      return true;
    }

    if (candidate.type === "ink") {
      focusInk?.(candidate.id);
      return true;
    }
  }

  return false;
}

function focusNextInline(
  children: InlineNode[],
  nodeIndex: number,
  focusText: ParagraphNavigatorDeps["focusText"],
  focusMath: ParagraphNavigatorDeps["focusMath"],
  focusImage?: ParagraphNavigatorDeps["focusImage"],
  focusInk?: ParagraphNavigatorDeps["focusInk"]
): boolean {
  for (
    let index = nodeIndex + 1;
    index < children.length;
    index += 1
  ) {
    const candidate = children[index];

    if (candidate.type === "text") {
      focusText(candidate.id, 0);
      return true;
    }

    if (candidate.type === "math") {
      focusMath(candidate.id, "start");
      return true;
    }

    if (candidate.type === "image") {
      focusImage?.(candidate.id);
      return true;
    }

    if (candidate.type === "ink") {
      focusInk?.(candidate.id);
      return true;
    }
  }

  return false;
}

/**
 * Unified keyboard navigation for one paragraph's inline document.
 *
 * Contract (document order: text ⇄ math ⇄ text ⇄ …):
 * - ArrowLeft at a text/math left boundary → previous inline node
 * - ArrowRight at a math/text right boundary → next inline node
 * - Backspace at text offset 0 after math → remove previous math
 * - Backspace in empty math → remove that math
 * - Delete at text end before math → remove next math
 * - Delete in empty math → remove that math
 */
export function createParagraphNavigator(
  deps: ParagraphNavigatorDeps
): ParagraphNavigator {
  const {
    children,
    focusText,
    focusMath,
    focusImage,
    focusInk,
    removeMath,
    removeImage,
    removeInk,
  } = deps;

  function textArrowLeft(
    nodeId: string,
    offset: number
  ): boolean {
    if (offset > 0) {
      return false;
    }

    const nodeIndex = findNodeIndex(children, nodeId);

    if (nodeIndex === -1) {
      return false;
    }

    return focusPreviousInline(
      children,
      nodeIndex,
      focusText,
      focusMath,
      focusImage,
      focusInk
    );
  }

  function textArrowRight(
    nodeId: string,
    offset: number,
    textLength: number
  ): boolean {
    if (offset < textLength) {
      return false;
    }

    const nodeIndex = findNodeIndex(children, nodeId);

    if (nodeIndex === -1) {
      return false;
    }

    return focusNextInline(
      children,
      nodeIndex,
      focusText,
      focusMath,
      focusImage,
      focusInk
    );
  }

  function textArrowUp(
    nodeId: string,
    offset: number
  ): boolean {
    if (offset > 0) {
      return false;
    }

    const nodeIndex = findNodeIndex(children, nodeId);

    if (nodeIndex === -1) {
      return false;
    }

    return focusPreviousInline(
      children,
      nodeIndex,
      focusText,
      focusMath,
      focusImage
    );
  }

  function textArrowDown(
    nodeId: string,
    offset: number,
    textLength: number
  ): boolean {
    if (offset < textLength) {
      return false;
    }

    const nodeIndex = findNodeIndex(children, nodeId);

    if (nodeIndex === -1) {
      return false;
    }

    return focusNextInline(
      children,
      nodeIndex,
      focusText,
      focusMath,
      focusImage,
      focusInk
    );
  }

  function textBackspace(
    nodeId: string,
    offset: number
  ): boolean {
    if (offset > 0) {
      return false;
    }

    const nodeIndex = findNodeIndex(children, nodeId);

    if (nodeIndex === -1) {
      return false;
    }

    const previous = children[nodeIndex - 1];

    if (previous?.type === "math") {
      removeMath(previous.id, "backward");
      return true;
    }

    if (previous?.type === "image") {
      removeImage?.(previous.id, "backward");
      return true;
    }

    if (previous?.type === "ink") {
      removeInk?.(previous.id, "backward");
      return true;
    }

    return false;
  }

  function textDelete(
    nodeId: string,
    offset: number,
    textLength: number
  ): boolean {
    if (offset < textLength) {
      return false;
    }

    const nodeIndex = findNodeIndex(children, nodeId);

    if (nodeIndex === -1) {
      return false;
    }

    const next = children[nodeIndex + 1];

    if (next?.type === "math") {
      removeMath(next.id, "forward");
      return true;
    }

    if (next?.type === "image") {
      removeImage?.(next.id, "forward");
      return true;
    }

    if (next?.type === "ink") {
      removeInk?.(next.id, "forward");
      return true;
    }

    return false;
  }

  function isAtMathLeftBoundary(
    state: MathBoundaryState
  ): boolean {
    if (state.empty) {
      return true;
    }

    return state.atStart;
  }

  function isAtMathRightBoundary(
    state: MathBoundaryState
  ): boolean {
    return state.atEnd;
  }

  function mathArrowLeft(
    nodeId: string,
    state: MathBoundaryState
  ): boolean {
    if (!isAtMathLeftBoundary(state)) {
      return false;
    }

    const nodeIndex = findNodeIndex(children, nodeId);

    if (nodeIndex === -1) {
      return false;
    }

    return focusPreviousInline(
      children,
      nodeIndex,
      focusText,
      focusMath,
      focusImage,
      focusInk
    );
  }

  function mathArrowRight(
    nodeId: string,
    state: MathBoundaryState
  ): boolean {
    if (!isAtMathRightBoundary(state)) {
      return false;
    }

    const nodeIndex = findNodeIndex(children, nodeId);

    if (nodeIndex === -1) {
      return false;
    }

    return focusNextInline(
      children,
      nodeIndex,
      focusText,
      focusMath,
      focusImage
    );
  }

  function mathBackspace(
    nodeId: string,
    state: MathBoundaryState
  ): boolean {
    if (state.empty) {
      removeMath(nodeId, "backward");
      return true;
    }

    return false;
  }

  function mathDelete(
    nodeId: string,
    state: MathBoundaryState
  ): boolean {
    if (state.empty) {
      removeMath(nodeId, "forward");
      return true;
    }

    return false;
  }

  function mathMoveOut(
    nodeId: string,
    direction: "forward" | "backward",
    state: MathBoundaryState
  ): boolean {
    if (direction === "backward") {
      return mathArrowLeft(nodeId, state);
    }

    if (state.empty && isAtMathRightBoundary(state)) {
      const nodeIndex = findNodeIndex(children, nodeId);

      if (nodeIndex === -1) {
        return false;
      }

      if (
        focusNextInline(
          children,
          nodeIndex,
          focusText,
          focusMath,
          focusImage,
          focusInk
        )
      ) {
        return true;
      }

      removeMath(nodeId, "forward");
      return true;
    }

    return mathArrowRight(nodeId, state);
  }

  return {
    textArrowLeft,
    textArrowRight,
    textArrowUp,
    textArrowDown,
    textBackspace,
    textDelete,
    mathArrowLeft,
    mathArrowRight,
    mathBackspace,
    mathDelete,
    mathMoveOut,
  };
}

export function createMathBoundaryState(
  mf: {
    position: number;
    lastOffset: number;
    getValue: (format: "latex") => string;
  }
): MathBoundaryState {
  return {
    empty: mf.getValue("latex").trim().length === 0,
    atStart: mf.position <= 0,
    atEnd: mf.position >= mf.lastOffset,
  };
}
