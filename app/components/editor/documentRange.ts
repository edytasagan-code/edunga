import {
  createTextNode,
  ensureDocumentInlineEditing,
  generateId,
} from "./core/document";
import { readLiveTextFromNode } from "./selection";
import type { DocumentPoint } from "./selectionModel";
import type {
  EditorDocument,
  InlineNode,
  Paragraph,
} from "./types";

type OrderedPoint = DocumentPoint & {
  paragraphIndex: number;
  nodeIndex: number;
};

function toOrderedPoint(
  point: DocumentPoint,
  document: EditorDocument
): OrderedPoint | null {
  const paragraphIndex = document.paragraphs.findIndex(
    (item) => item.id === point.paragraphId
  );

  if (paragraphIndex === -1) {
    return null;
  }

  const paragraph = document.paragraphs[paragraphIndex];
  const nodeIndex = paragraph.children.findIndex(
    (item) => item.id === point.nodeId
  );

  if (nodeIndex === -1) {
    return null;
  }

  return {
    ...point,
    paragraphIndex,
    nodeIndex,
  };
}

function compareOrderedPoints(
  a: OrderedPoint,
  b: OrderedPoint
): number {
  if (a.paragraphIndex !== b.paragraphIndex) {
    return a.paragraphIndex - b.paragraphIndex;
  }

  if (a.nodeIndex !== b.nodeIndex) {
    return a.nodeIndex - b.nodeIndex;
  }

  if (a.kind === "text" && b.kind === "text") {
    return a.offset - b.offset;
  }

  return 0;
}

export function getOrderedRangeStart(
  anchor: DocumentPoint,
  focus: DocumentPoint,
  document: EditorDocument
): DocumentPoint | null {
  const orderedAnchor = toOrderedPoint(anchor, document);
  const orderedFocus = toOrderedPoint(focus, document);

  if (!orderedAnchor || !orderedFocus) {
    return null;
  }

  return compareOrderedPoints(orderedAnchor, orderedFocus) <= 0
    ? orderedAnchor
    : orderedFocus;
}

function readNodeText(
  document: EditorDocument,
  editorRoot: HTMLElement,
  paragraphId: string,
  node: InlineNode
): string {
  if (node.type !== "text") {
    return "";
  }

  return (
    readLiveTextFromNode(editorRoot, paragraphId, node.id) ??
    node.text
  );
}

export function cloneInlineNodeWithNewId(
  node: InlineNode
): InlineNode {
  if (node.type === "text") {
    return {
      id: generateId(),
      type: "text",
      text: node.text,
    };
  }

  if (node.type === "math") {
    return {
      id: generateId(),
      type: "math",
      latex: node.latex,
    };
  }

  return {
    ...structuredClone(node),
    id: generateId(),
  } as InlineNode;
}

function cloneFragmentDocument(
  fragment: EditorDocument
): EditorDocument {
  return ensureDocumentInlineEditing({
    version: fragment.version,
    paragraphs: fragment.paragraphs.map((paragraph) => ({
      id: generateId(),
      children: paragraph.children.map(cloneInlineNodeWithNewId),
    })),
  });
}

function shouldIncludeMathNode(
  paragraphIndex: number,
  nodeIndex: number,
  start: OrderedPoint,
  end: OrderedPoint
): boolean {
  if (
    paragraphIndex < start.paragraphIndex ||
    paragraphIndex > end.paragraphIndex
  ) {
    return false;
  }

  if (
    paragraphIndex > start.paragraphIndex &&
    paragraphIndex < end.paragraphIndex
  ) {
    return true;
  }

  if (
    paragraphIndex === start.paragraphIndex &&
    paragraphIndex === end.paragraphIndex
  ) {
    if (nodeIndex > start.nodeIndex && nodeIndex < end.nodeIndex) {
      return true;
    }

    if (nodeIndex === start.nodeIndex && start.kind === "math") {
      return true;
    }

    if (nodeIndex === end.nodeIndex && end.kind === "math") {
      return true;
    }

    return false;
  }

  if (paragraphIndex === start.paragraphIndex) {
    if (nodeIndex > start.nodeIndex) {
      return true;
    }

    if (nodeIndex === start.nodeIndex && start.kind === "math") {
      return true;
    }

    return false;
  }

  if (paragraphIndex === end.paragraphIndex) {
    if (nodeIndex < end.nodeIndex) {
      return true;
    }

    if (nodeIndex === end.nodeIndex && end.kind === "math") {
      return true;
    }

    return false;
  }

  return false;
}

function sliceTextNode(
  document: EditorDocument,
  editorRoot: HTMLElement,
  paragraphId: string,
  node: InlineNode,
  sliceStart: number,
  sliceEnd: number
): InlineNode | null {
  if (node.type !== "text") {
    return null;
  }

  const text = readNodeText(
    document,
    editorRoot,
    paragraphId,
    node
  );
  const start = Math.max(0, Math.min(sliceStart, text.length));
  const end = Math.max(start, Math.min(sliceEnd, text.length));
  const slice = text.slice(start, end);

  if (!slice) {
    return null;
  }

  return createTextNode(slice);
}

function collectRangeNodes(
  document: EditorDocument,
  editorRoot: HTMLElement,
  start: OrderedPoint,
  end: OrderedPoint
): InlineNode[] {
  const nodes: InlineNode[] = [];

  for (
    let paragraphIndex = start.paragraphIndex;
    paragraphIndex <= end.paragraphIndex;
    paragraphIndex += 1
  ) {
    const paragraph = document.paragraphs[paragraphIndex];

    if (!paragraph) {
      continue;
    }

    const nodeStart =
      paragraphIndex === start.paragraphIndex
        ? start.nodeIndex
        : 0;
    const nodeEnd =
      paragraphIndex === end.paragraphIndex
        ? end.nodeIndex
        : paragraph.children.length - 1;

    for (let nodeIndex = nodeStart; nodeIndex <= nodeEnd; nodeIndex += 1) {
      const node = paragraph.children[nodeIndex];

      if (!node) {
        continue;
      }

      if (node.type === "math") {
        if (
          shouldIncludeMathNode(
            paragraphIndex,
            nodeIndex,
            start,
            end
          )
        ) {
          nodes.push(cloneInlineNodeWithNewId(node));
        }

        continue;
      }

      if (node.type !== "text") {
        continue;
      }

      const text = readNodeText(
        document,
        editorRoot,
        paragraph.id,
        node
      );
      let sliceStart = 0;
      let sliceEnd = text.length;

      if (
        paragraphIndex === start.paragraphIndex &&
        nodeIndex === start.nodeIndex &&
        start.kind === "text"
      ) {
        sliceStart = start.offset;
      }

      if (
        paragraphIndex === end.paragraphIndex &&
        nodeIndex === end.nodeIndex &&
        end.kind === "text"
      ) {
        sliceEnd = end.offset;
      }

      const sliced = sliceTextNode(
        document,
        editorRoot,
        paragraph.id,
        node,
        sliceStart,
        sliceEnd
      );

      if (sliced) {
        nodes.push(sliced);
      }
    }
  }

  return nodes;
}

export function extractDocumentRange(
  document: EditorDocument,
  anchor: DocumentPoint,
  focus: DocumentPoint,
  editorRoot: HTMLElement
): EditorDocument {
  const orderedAnchor = toOrderedPoint(anchor, document);
  const orderedFocus = toOrderedPoint(focus, document);

  if (!orderedAnchor || !orderedFocus) {
    return ensureDocumentInlineEditing({
      version: document.version,
      paragraphs: [
        {
          id: generateId(),
          children: [createTextNode("")],
        },
      ],
    });
  }

  const [start, end] =
    compareOrderedPoints(orderedAnchor, orderedFocus) <= 0
      ? [orderedAnchor, orderedFocus]
      : [orderedFocus, orderedAnchor];

  const children = collectRangeNodes(
    document,
    editorRoot,
    start,
    end
  );

  return ensureDocumentInlineEditing({
    version: document.version,
    paragraphs: [
      {
        id: generateId(),
        children:
          children.length > 0
            ? children
            : [createTextNode("")],
      },
    ],
  });
}

function filterParagraphRange(
  document: EditorDocument,
  editorRoot: HTMLElement,
  paragraph: Paragraph,
  paragraphIndex: number,
  start: OrderedPoint,
  end: OrderedPoint
): InlineNode[] {
  const kept: InlineNode[] = [];

  for (
    let nodeIndex = 0;
    nodeIndex < paragraph.children.length;
    nodeIndex += 1
  ) {
    const node = paragraph.children[nodeIndex];
    const beforeRange =
      paragraphIndex < start.paragraphIndex ||
      (paragraphIndex === start.paragraphIndex &&
        nodeIndex < start.nodeIndex);
    const afterRange =
      paragraphIndex > end.paragraphIndex ||
      (paragraphIndex === end.paragraphIndex &&
        nodeIndex > end.nodeIndex);

    if (beforeRange || afterRange) {
      if (node.type === "text") {
        kept.push({
          ...node,
          text: readNodeText(
            document,
            editorRoot,
            paragraph.id,
            node
          ),
        });
      } else {
        kept.push(node);
      }

      continue;
    }

      if (node.type === "math") {
        if (
          !shouldIncludeMathNode(
            paragraphIndex,
            nodeIndex,
            start,
            end
          )
        ) {
        kept.push(node);
      }

      continue;
    }

    if (node.type !== "text") {
      kept.push(node);
      continue;
    }

    const text = readNodeText(
      document,
      editorRoot,
      paragraph.id,
      node
    );
    const isStart =
      paragraphIndex === start.paragraphIndex &&
      nodeIndex === start.nodeIndex &&
      start.kind === "text";
    const isEnd =
      paragraphIndex === end.paragraphIndex &&
      nodeIndex === end.nodeIndex &&
      end.kind === "text";

    if (isStart && isEnd) {
      const before = text.slice(0, start.offset);
      const after = text.slice(end.offset);

      if (before) {
        kept.push(createTextNode(before));
      }

      if (after) {
        kept.push(createTextNode(after));
      }

      continue;
    }

    if (isStart) {
      const before = text.slice(0, start.offset);

      if (before) {
        kept.push(createTextNode(before));
      }

      continue;
    }

    if (isEnd) {
      const after = text.slice(end.offset);

      if (after) {
        kept.push(createTextNode(after));
      }
    }
  }

  return kept;
}

export function deleteDocumentRange(
  document: EditorDocument,
  anchor: DocumentPoint,
  focus: DocumentPoint,
  editorRoot: HTMLElement
): EditorDocument {
  const orderedAnchor = toOrderedPoint(anchor, document);
  const orderedFocus = toOrderedPoint(focus, document);

  if (!orderedAnchor || !orderedFocus) {
    return document;
  }

  const [start, end] =
    compareOrderedPoints(orderedAnchor, orderedFocus) <= 0
      ? [orderedAnchor, orderedFocus]
      : [orderedFocus, orderedAnchor];

  return ensureDocumentInlineEditing({
    ...document,
    paragraphs: document.paragraphs.map(
      (paragraph, paragraphIndex) => ({
        ...paragraph,
        children: filterParagraphRange(
          document,
          editorRoot,
          paragraph,
          paragraphIndex,
          start,
          end
        ),
      })
    ),
  });
}

function insertInlineNodesInText(
  paragraph: Paragraph,
  nodeId: string,
  offset: number,
  nodes: InlineNode[]
): Paragraph {
  const nodeIndex = paragraph.children.findIndex(
    (item) => item.id === nodeId
  );

  if (nodeIndex === -1) {
    return paragraph;
  }

  const node = paragraph.children[nodeIndex];

  if (node.type !== "text") {
    return paragraph;
  }

  const before = node.text.slice(0, offset);
  const after = node.text.slice(offset);
  const replacement: InlineNode[] = [];

  if (before) {
    replacement.push(createTextNode(before));
  }

  replacement.push(...nodes);

  if (after) {
    replacement.push(createTextNode(after));
  } else if (nodes[nodes.length - 1]?.type === "math") {
    replacement.push(createTextNode(""));
  }

  return {
    ...paragraph,
    children: [
      ...paragraph.children.slice(0, nodeIndex),
      ...replacement,
      ...paragraph.children.slice(nodeIndex + 1),
    ],
  };
}

export function insertDocumentFragment(
  document: EditorDocument,
  paragraphId: string,
  nodeId: string,
  offset: number,
  fragment: EditorDocument
): EditorDocument {
  const cloned = cloneFragmentDocument(fragment);
  const nodes = cloned.paragraphs.flatMap(
    (paragraph) => paragraph.children
  );

  if (nodes.length === 0) {
    return document;
  }

  return ensureDocumentInlineEditing({
    ...document,
    paragraphs: document.paragraphs.map((paragraph) => {
      if (paragraph.id !== paragraphId) {
        return paragraph;
      }

      return insertInlineNodesInText(
        paragraph,
        nodeId,
        offset,
        nodes
      );
    }),
  });
}

export function replaceDocumentContent(
  document: EditorDocument,
  fragment: EditorDocument
): EditorDocument {
  const cloned = cloneFragmentDocument(fragment);

  if (cloned.paragraphs.length === 0) {
    return ensureDocumentInlineEditing({
      version: document.version,
      paragraphs: [
        {
          id: generateId(),
          children: [createTextNode("")],
        },
      ],
    });
  }

  return ensureDocumentInlineEditing({
    version: document.version,
    paragraphs: cloned.paragraphs,
  });
}

export function documentToPlainText(
  document: EditorDocument
): string {
  return document.paragraphs
    .map((paragraph) =>
      paragraph.children
        .map((node) => {
          if (node.type === "text") {
            return node.text;
          }

          if (node.type === "math") {
            return node.latex;
          }

          return "";
        })
        .join("")
    )
    .join("\n");
}

export function getNodeIdsInRange(
  document: EditorDocument,
  anchor: DocumentPoint,
  focus: DocumentPoint
): Set<string> {
  const orderedAnchor = toOrderedPoint(anchor, document);
  const orderedFocus = toOrderedPoint(focus, document);

  if (!orderedAnchor || !orderedFocus) {
    return new Set();
  }

  const [start, end] =
    compareOrderedPoints(orderedAnchor, orderedFocus) <= 0
      ? [orderedAnchor, orderedFocus]
      : [orderedFocus, orderedAnchor];

  const ids = new Set<string>();

  for (
    let paragraphIndex = start.paragraphIndex;
    paragraphIndex <= end.paragraphIndex;
    paragraphIndex += 1
  ) {
    const paragraph = document.paragraphs[paragraphIndex];

    if (!paragraph) {
      continue;
    }

    const nodeStart =
      paragraphIndex === start.paragraphIndex
        ? start.nodeIndex
        : 0;
    const nodeEnd =
      paragraphIndex === end.paragraphIndex
        ? end.nodeIndex
        : paragraph.children.length - 1;

    for (let nodeIndex = nodeStart; nodeIndex <= nodeEnd; nodeIndex += 1) {
      const node = paragraph.children[nodeIndex];

      if (!node) {
        continue;
      }

      if (node.type === "math") {
        if (
          shouldIncludeMathNode(
            paragraphIndex,
            nodeIndex,
            start,
            end
          )
        ) {
          ids.add(node.id);
        }

        continue;
      }

      if (node.type !== "text") {
        ids.add(node.id);
        continue;
      }

      const isStart =
        paragraphIndex === start.paragraphIndex &&
        nodeIndex === start.nodeIndex &&
        start.kind === "text";
      const isEnd =
        paragraphIndex === end.paragraphIndex &&
        nodeIndex === end.nodeIndex &&
        end.kind === "text";
      const isBetweenParagraphs =
        paragraphIndex > start.paragraphIndex &&
        paragraphIndex < end.paragraphIndex;
      const isStrictlyBetweenNodes =
        paragraphIndex === start.paragraphIndex &&
        paragraphIndex === end.paragraphIndex &&
        nodeIndex > start.nodeIndex &&
        nodeIndex < end.nodeIndex;
      const isAfterStartInParagraph =
        paragraphIndex === start.paragraphIndex &&
        paragraphIndex < end.paragraphIndex &&
        nodeIndex > start.nodeIndex;
      const isBeforeEndInParagraph =
        paragraphIndex === end.paragraphIndex &&
        paragraphIndex > start.paragraphIndex &&
        nodeIndex < end.nodeIndex;

      if (
        isBetweenParagraphs ||
        isStrictlyBetweenNodes ||
        isAfterStartInParagraph ||
        isBeforeEndInParagraph
      ) {
        ids.add(node.id);
        continue;
      }

      if (isStart && isEnd) {
        if (start.offset < end.offset) {
          ids.add(node.id);
        }

        continue;
      }

      if (isStart || isEnd) {
        ids.add(node.id);
      }
    }
  }

  return ids;
}
