import type { EditorDocument } from "./types";

export type ParagraphSelectionState = {
  selectedIds: ReadonlySet<string>;
  anchorId: string | null;
};

export function createEmptyParagraphSelection(): ParagraphSelectionState {
  return {
    selectedIds: new Set(),
    anchorId: null,
  };
}

export function getParagraphIndex(
  document: EditorDocument,
  paragraphId: string
): number {
  return document.paragraphs.findIndex(
    (paragraph) => paragraph.id === paragraphId
  );
}

export function resolveParagraphClickSelection(
  document: EditorDocument,
  current: ParagraphSelectionState,
  paragraphId: string,
  modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }
): ParagraphSelectionState {
  const toggle = modifiers.ctrlKey || modifiers.metaKey;

  if (modifiers.shiftKey && current.anchorId) {
    const anchorIndex = getParagraphIndex(document, current.anchorId);
    const targetIndex = getParagraphIndex(document, paragraphId);

    if (anchorIndex === -1 || targetIndex === -1) {
      return {
        selectedIds: new Set([paragraphId]),
        anchorId: paragraphId,
      };
    }

    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);
    const selectedIds = new Set<string>();

    for (let index = start; index <= end; index += 1) {
      selectedIds.add(document.paragraphs[index].id);
    }

    return {
      selectedIds,
      anchorId: current.anchorId,
    };
  }

  if (toggle) {
    const selectedIds = new Set(current.selectedIds);

    if (selectedIds.has(paragraphId)) {
      selectedIds.delete(paragraphId);
    } else {
      selectedIds.add(paragraphId);
    }

    return {
      selectedIds,
      anchorId: paragraphId,
    };
  }

  return {
    selectedIds: new Set([paragraphId]),
    anchorId: paragraphId,
  };
}

export function extendParagraphSelection(
  document: EditorDocument,
  current: ParagraphSelectionState,
  direction: -1 | 1
): ParagraphSelectionState {
  const anchorId =
    current.anchorId ??
    [...current.selectedIds][0] ??
    document.paragraphs[0]?.id ??
    null;

  if (!anchorId) {
    return current;
  }

  const anchorIndex = getParagraphIndex(document, anchorId);

  if (anchorIndex === -1) {
    return current;
  }

  const selectedIndices = [...current.selectedIds]
    .map((id) => getParagraphIndex(document, id))
    .filter((index) => index !== -1);

  const focusIndex =
    selectedIndices.length > 0
      ? direction === -1
        ? Math.min(...selectedIndices)
        : Math.max(...selectedIndices)
      : anchorIndex;

  const nextIndex = focusIndex + direction;

  if (nextIndex < 0 || nextIndex >= document.paragraphs.length) {
    return current;
  }

  const nextId = document.paragraphs[nextIndex].id;

  return resolveParagraphClickSelection(document, current, nextId, {
    shiftKey: true,
    ctrlKey: false,
    metaKey: false,
  });
}

export function getPrimarySelectedParagraphId(
  selection: ParagraphSelectionState
): string | null {
  if (selection.selectedIds.size === 0) {
    return null;
  }

  return selection.anchorId ?? [...selection.selectedIds][0] ?? null;
}

export function getSelectedParagraphIdsInOrder(
  document: EditorDocument,
  selection: ParagraphSelectionState
): string[] {
  return document.paragraphs
    .map((paragraph) => paragraph.id)
    .filter((id) => selection.selectedIds.has(id));
}
