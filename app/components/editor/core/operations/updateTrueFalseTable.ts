import type { EditorDocument, TrueFalseTableNode } from "../../types";

function updateTableRowNodes(
  table: TrueFalseTableNode,
  rowId: string,
  updater: (nodes: TrueFalseTableNode["rows"][number]["statement"]) => TrueFalseTableNode["rows"][number]["statement"]
): TrueFalseTableNode {
  return {
    ...table,
    rows: table.rows.map((row) =>
      row.id === rowId
        ? {
            ...row,
            statement: updater(row.statement),
          }
        : row
    ),
  };
}

export function updateTrueFalseTableText(
  document: EditorDocument,
  paragraphId: string,
  tableNodeId: string,
  rowId: string,
  textNodeId: string,
  text: string
): EditorDocument {
  return {
    ...document,
    paragraphs: document.paragraphs.map((paragraph) => {
      if (paragraph.id !== paragraphId) {
        return paragraph;
      }

      return {
        ...paragraph,
        children: paragraph.children.map((node) => {
          if (node.type !== "true-false-table" || node.id !== tableNodeId) {
            return node;
          }

          return updateTableRowNodes(node, rowId, (statement) =>
            statement.map((child) => {
              if (child.id !== textNodeId || child.type !== "text") {
                return child;
              }

              return {
                ...child,
                text,
              };
            })
          );
        }),
      };
    }),
  };
}

export function updateTrueFalseTableMath(
  document: EditorDocument,
  paragraphId: string,
  tableNodeId: string,
  rowId: string,
  mathNodeId: string,
  latex: string
): EditorDocument {
  return {
    ...document,
    paragraphs: document.paragraphs.map((paragraph) => {
      if (paragraph.id !== paragraphId) {
        return paragraph;
      }

      return {
        ...paragraph,
        children: paragraph.children.map((node) => {
          if (node.type !== "true-false-table" || node.id !== tableNodeId) {
            return node;
          }

          return updateTableRowNodes(node, rowId, (statement) =>
            statement.map((child) => {
              if (child.id !== mathNodeId || child.type !== "math") {
                return child;
              }

              return {
                ...child,
                latex,
              };
            })
          );
        }),
      };
    }),
  };
}
